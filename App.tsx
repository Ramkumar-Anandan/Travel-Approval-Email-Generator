
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Plane, Mail, Send, Printer, Copy, RefreshCw, Clock, MapPin, 
  Building2, CreditCard, Coffee, Download, Upload, Save, Trash2, 
  FileText
} from 'lucide-react';
import { FormData, TravelPlan, TravelSegment, AccommodationDetails, FoodBreakdown, TravelProfile, DailyFoodExpense } from './types';
import { formatDate, calculateDaysBetween, getDatesInRange } from './utils/dateUtils';
import { generateCsvTemplate, parseCsvToFormData, downloadFile } from './utils/csvUtils';
import { Input, TextArea, Select } from './components/Input';

const MEAL_COST_FIXED = 200;
const STORAGE_KEY = 'travel_approval_profiles';

const UNIVERSITIES = [
  "Alliance University",
  "CBE Kalvium Direct",
  "Christ Univeristy",
  "RV University",
  "The Apollo University",
  "Yenepoya University, Bangalore",
  "Yenepoya University, Mangalore"
];

const UNIVERSITY_CITY_MAP: Record<string, string> = {
  "Alliance University": "Bangalore",
  "CBE Kalvium Direct": "Coimbatore",
  "Christ Univeristy": "Bangalore",
  "RV University": "Bangalore",
  "The Apollo University": "Chittoor",
  "Yenepoya University, Bangalore": "Bangalore",
  "Yenepoya University, Mangalore": "Mangalore"
};

const INITIAL_FORM_DATA: FormData = {
  name: 'Ramkumar',
  email: '',
  university: '',
  reason: 'Monthly campus visit',
  tripStartDate: '',
  tripStartTime: '',
  tripReachDate: '',
  tripReachTime: '',
  returnStartDate: '',
  returnStartTime: '',
  returnReachDate: '',
  returnReachTime: '',
  workStartDate: '',
  workEndDate: '',
  homeLocation: 'Pattanam Pudur',
  baseCity: 'Coimbatore',
  boardingPoint: 'Hope College',
  destinationPoint: 'Bus Station / Airport',
  targetCity: '',
  hotelName: 'Hotel Stay Nearby',
  // Onward
  homeStationMode: 'Cab',
  outstationMode: 'Bus',
  outstationLocalMode: 'Auto',
  homeStationCost: '300',
  outstationTravelCost: '1500',
  outstationLocalCost: '250',
  // Return
  returnHomeStationMode: 'Cab',
  returnOutstationMode: 'Bus',
  returnOutstationLocalMode: 'Auto',
  returnHomeStationCost: '300',
  returnOutstationTravelCost: '1500',
  returnOutstationLocalCost: '250',
  // Campus
  dailyUniversityMode: 'Cab / Auto',
  dailyUniversityCost: '300',
  hotelDailyCost: '2500',
  earlyCheckInCost: '1250',
  earlyCheckIn: true,
};

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [profiles, setProfiles] = useState<TravelProfile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProfiles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load profiles", e);
      }
    }
  }, []);

  const calculateFoodExpenses = useCallback((): FoodBreakdown => {
    if (!formData.tripStartDate || !formData.returnReachDate) {
      return { dailyExpenses: [], totalAmount: 0 };
    }

    const startTime = formData.tripStartTime || '00:00';
    const endTime = formData.returnReachTime || '23:59';

    const start = new Date(`${formData.tripStartDate}T${startTime}`);
    const end = new Date(`${formData.returnReachDate}T${endTime}`);
    
    const dailyExpenses: DailyFoodExpense[] = [];
    const dates = getDatesInRange(formData.tripStartDate, formData.returnReachDate);
    
    dates.forEach(dateStr => {
      let dailyCount = 0;
      const bTime = new Date(`${dateStr}T07:00`);
      if (bTime >= start && bTime <= end) dailyCount++;
      const lTime = new Date(`${dateStr}T13:00`);
      if (lTime >= start && lTime <= end) dailyCount++;
      const dTime = new Date(`${dateStr}T20:00`);
      if (dTime >= start && dTime <= end) dailyCount++;

      if (dailyCount > 0) {
        dailyExpenses.push({
          date: dateStr,
          count: dailyCount,
          rate: MEAL_COST_FIXED,
          amount: dailyCount * MEAL_COST_FIXED
        });
      }
    });

    const total = dailyExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    return { dailyExpenses, totalAmount: total };
  }, [formData]);

  const generatePlan = useCallback((silent: boolean = false) => {
    if (!formData.tripStartDate || !formData.returnStartDate) {
      if (!silent) alert("Please fill in travel dates.");
      return;
    }

    if (!formData.university) {
      if (!silent) alert("Please select a University.");
      return;
    }

    const onwardJourney: TravelSegment[] = [];
    if (formData.homeStationMode !== 'NA') {
      onwardJourney.push({ from: formData.homeLocation, to: formData.boardingPoint, date: formData.tripStartDate, time: formData.tripStartTime, mode: formData.homeStationMode, amount: Number(formData.homeStationCost) });
    }
    if (formData.outstationMode !== 'NA') {
      onwardJourney.push({ from: formData.baseCity, to: formData.targetCity, date: formData.tripStartDate, time: formData.tripStartTime, mode: formData.outstationMode, amount: Number(formData.outstationTravelCost) });
    }
    if (formData.outstationLocalMode !== 'NA') {
      onwardJourney.push({ from: formData.destinationPoint, to: formData.hotelName, date: formData.tripReachDate, time: formData.tripReachTime, mode: formData.outstationLocalMode, amount: Number(formData.outstationLocalCost) });
    }

    const dailyLocalTravel: TravelSegment[] = [];
    if (formData.dailyUniversityMode !== 'NA') {
      const workDates = getDatesInRange(formData.workStartDate, formData.workEndDate);
      workDates.forEach(date => {
        dailyLocalTravel.push({ from: formData.hotelName, to: formData.university, date: date, time: '08:30', mode: formData.dailyUniversityMode, amount: Number(formData.dailyUniversityCost) });
        dailyLocalTravel.push({ from: formData.university, to: formData.hotelName, date: date, time: '18:00', mode: formData.dailyUniversityMode, amount: Number(formData.dailyUniversityCost) });
      });
    }

    const returnJourney: TravelSegment[] = [];
    if (formData.returnOutstationLocalMode !== 'NA') {
      returnJourney.push({ from: formData.hotelName, to: formData.destinationPoint, date: formData.returnStartDate, time: formData.returnStartTime, mode: formData.returnOutstationLocalMode, amount: Number(formData.returnOutstationLocalCost) });
    }
    if (formData.returnOutstationMode !== 'NA') {
      returnJourney.push({ from: formData.targetCity, to: formData.baseCity, date: formData.returnStartDate, time: formData.returnStartTime, mode: formData.returnOutstationMode, amount: Number(formData.returnOutstationTravelCost) });
    }
    if (formData.returnHomeStationMode !== 'NA') {
      returnJourney.push({ from: formData.boardingPoint, to: formData.homeLocation, date: formData.returnReachDate, time: formData.returnReachTime, mode: formData.returnHomeStationMode, amount: Number(formData.returnHomeStationCost) });
    }

    let stayDays = calculateDaysBetween(formData.tripReachDate, formData.returnStartDate);
    const finalStayDays = Math.max(1, Math.ceil(stayDays));
    const ecCost = formData.earlyCheckIn ? Number(formData.earlyCheckInCost) : 0;
    const accommodation: AccommodationDetails = { from: formData.tripReachDate, to: formData.returnStartDate, days: finalStayDays, hotelName: formData.hotelName, dailyRate: Number(formData.hotelDailyCost), earlyCheckInCost: ecCost, totalAmount: (finalStayDays * Number(formData.hotelDailyCost)) + ecCost, earlyCheckIn: formData.earlyCheckIn };

    const foodBreakdown = calculateFoodExpenses();
    const travelTotal = [...onwardJourney, ...dailyLocalTravel, ...returnJourney].reduce((acc, curr) => acc + curr.amount, 0);
    const total = travelTotal + accommodation.totalAmount + foodBreakdown.totalAmount;

    setPlan({
      userName: formData.name || 'User', userEmail: formData.email, university: formData.university || 'University', reason: formData.reason,
      startDate: formData.tripStartDate, endDate: formData.returnReachDate, baseCity: formData.baseCity, targetCity: formData.targetCity,
      boardingPoint: formData.boardingPoint, destinationPoint: formData.destinationPoint, hotelName: formData.hotelName,
      onwardJourney, dailyLocalTravel, returnJourney, accommodation, foodExpense: foodBreakdown, totalEstimatedExpense: Math.round(total)
    });
  }, [formData, calculateFoodExpenses]);

  const saveToProfiles = () => {
    if (!formData.university) {
      alert("Please select a University.");
      return;
    }
    const newProfile: TravelProfile = {
      id: Date.now().toString(),
      university: formData.university,
      lastUpdated: new Date().toLocaleString(),
      data: { ...formData }
    };
    const updatedProfiles = [newProfile, ...profiles.filter(p => p.university !== formData.university)];
    setProfiles(updatedProfiles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfiles));
    alert(`Plan for ${formData.university} saved!`);
  };

  const loadProfile = (profile: TravelProfile) => {
    setFormData(profile.data);
    setTimeout(() => setPlan(null), 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteProfile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => {
        const newData = { ...prev, [name]: value };
        if (name === 'university' && UNIVERSITY_CITY_MAP[value]) {
          newData.targetCity = UNIVERSITY_CITY_MAP[value];
        }
        // Auto-sync return journey modes to match onward defaults
        if (name === 'outstationMode') newData.returnOutstationMode = value as any;
        if (name === 'homeStationMode') newData.returnHomeStationMode = value as any;
        if (name === 'outstationLocalMode') newData.returnOutstationLocalMode = value as any;
        return newData;
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsedData = parseCsvToFormData(content);
      setFormData(prev => ({ ...prev, ...parsedData }));
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const copyToClipboard = () => {
    if (emailRef.current) {
      const range = document.createRange();
      range.selectNode(emailRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      try {
        document.execCommand('copy');
        alert('Email draft copied!');
      } catch (err) {
        console.error(err);
      }
      selection?.removeAllRanges();
    }
  };

  const TableHeader = () => (
    <thead>
      <tr style={{ backgroundColor: '#f3f4f6' }}>
        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>From</th>
        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>To</th>
        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Date & Time</th>
        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Mode</th>
        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Amount (INR)</th>
      </tr>
    </thead>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <Plane className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Travel Approval Tool</h1>
              <p className="text-slate-500 font-medium">University Visit Planner</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={saveToProfiles} className="px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-all flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Plan
            </button>
            <button onClick={() => { setFormData(INITIAL_FORM_DATA); setPlan(null); }} className="px-5 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition-all flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-2 scrollbar-thin">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                  <Download className="w-4 h-4" /> Data Hub
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all gap-2">
                  <Upload className="w-6 h-6 text-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-600">Import Profile</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.json" className="hidden" />
                {profiles.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Library ({profiles.length})</p>
                    {profiles.map(p => (
                      <div key={p.id} onClick={() => loadProfile(p)} className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-500 group">
                        <span className="text-[11px] font-bold text-slate-700 truncate">{p.university}</span>
                        <button onClick={(e) => deleteProfile(e, p.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                <MapPin className="w-4 h-4" /> Details
              </div>
              <div className="space-y-4">
                <Input label="Your Name" name="name" value={formData.name} onChange={handleInputChange} />
                <Select label="University" name="university" value={formData.university} onChange={handleInputChange} options={["", ...UNIVERSITIES]} />
                <TextArea label="Purpose" name="reason" value={formData.reason} onChange={handleInputChange} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                <Clock className="w-4 h-4" /> Journey Timeline
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Onward Date" type="date" name="tripStartDate" value={formData.tripStartDate} onChange={handleInputChange} />
                <Input label="Onward Time" type="time" name="tripStartTime" value={formData.tripStartTime} onChange={handleInputChange} />
                <Input label="Return Date" type="date" name="returnReachDate" value={formData.returnReachDate} onChange={handleInputChange} />
                <Input label="Return Time" type="time" name="returnReachTime" value={formData.returnReachTime} onChange={handleInputChange} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                <RefreshCw className="w-4 h-4" /> Modes & Costs
              </div>
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                   <p className="text-xs font-bold text-slate-500 uppercase">Onward Journey</p>
                   <div className="grid grid-cols-2 gap-4">
                     <Select label="Home Station" name="homeStationMode" value={formData.homeStationMode} onChange={handleInputChange} options={['Cab', 'Auto', 'Cab / Auto', 'NA']} />
                     <Input label="Cost" type="number" name="homeStationCost" value={formData.homeStationCost} onChange={handleInputChange} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <Select label="Outstation" name="outstationMode" value={formData.outstationMode} onChange={handleInputChange} options={['Bus', 'Train', 'Flight', 'NA']} />
                     <Input label="Cost" type="number" name="outstationTravelCost" value={formData.outstationTravelCost} onChange={handleInputChange} />
                   </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                   <p className="text-xs font-bold text-slate-500 uppercase">Return Journey</p>
                   <div className="grid grid-cols-2 gap-4">
                     <Select label="Travel Mode" name="returnOutstationMode" value={formData.returnOutstationMode} onChange={handleInputChange} options={['Bus', 'Train', 'Flight', 'NA']} />
                     <Input label="Cost" type="number" name="returnOutstationTravelCost" value={formData.returnOutstationTravelCost} onChange={handleInputChange} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <Select label="Home Station" name="returnHomeStationMode" value={formData.returnHomeStationMode} onChange={handleInputChange} options={['Cab', 'Auto', 'Cab / Auto', 'NA']} />
                     <Input label="Cost" type="number" name="returnHomeStationCost" value={formData.returnHomeStationCost} onChange={handleInputChange} />
                   </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">Campus Local</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Mode" name="dailyUniversityMode" value={formData.dailyUniversityMode} onChange={handleInputChange} options={['Cab', 'Auto', 'Cab / Auto', 'NA']} />
                    <Input label="Trip Cost" type="number" name="dailyUniversityCost" value={formData.dailyUniversityCost} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <button onClick={() => generatePlan(false)} className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3">
                <Send className="w-5 h-5" /> Generate draft
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 h-fit sticky top-10">
            {plan ? (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-8 py-5 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    <span className="font-semibold text-sm uppercase">Email draft preview</span>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={copyToClipboard} className="text-xs font-bold hover:text-indigo-400 flex items-center gap-1"><Copy className="w-4 h-4" /> COPY</button>
                    <button onClick={() => window.print()} className="text-xs font-bold hover:text-indigo-400 flex items-center gap-1"><Printer className="w-4 h-4" /> PRINT</button>
                  </div>
                </div>
                
                <div ref={emailRef} className="p-10 bg-white text-black font-serif text-[14px] leading-normal email-content-container overflow-y-auto max-h-[80vh]">
                  <p><strong>Subject: Travel Plan Approval Request | {plan.userName} | {plan.university} | {formatDate(plan.startDate)} to {formatDate(plan.endDate)}</strong></p>
                  <br />
                  <p>Hi Team,</p>
                  <br />
                  <p>I am planning to visit <strong>{plan.university}</strong> from {formatDate(plan.startDate)} to {formatDate(plan.endDate)}.</p>
                  <p><strong>Purpose:</strong> {plan.reason}</p>
                  <p>My overall estimated expense for this trip is ~ <strong>INR {plan.totalEstimatedExpense.toLocaleString()}</strong>.</p>
                  <br />

                  {plan.onwardJourney.length > 0 && (
                    <>
                      <p><strong>Onward journey details</strong></p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '20px' }} border={1}>
                        <TableHeader />
                        <tbody>
                          {plan.onwardJourney.map((s, i) => (
                            <tr key={i}>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.from}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.to}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{formatDate(s.date)} {s.time}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.mode}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {plan.dailyLocalTravel.length > 0 && (
                    <>
                      <p><strong>Daily outstation local commute (Hotel to University)</strong></p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '20px' }} border={1}>
                        <TableHeader />
                        <tbody>
                          {plan.dailyLocalTravel.map((s, i) => (
                            <tr key={i}>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.from}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.to}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{formatDate(s.date)}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.mode}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {plan.returnJourney.length > 0 && (
                    <>
                      <p><strong>Return journey details</strong></p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '20px' }} border={1}>
                        <TableHeader />
                        <tbody>
                          {plan.returnJourney.map((s, i) => (
                            <tr key={i}>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.from}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.to}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{formatDate(s.date)} {s.time}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.mode}</td>
                              <td style={{ border: '1px solid #000', padding: '8px' }}>{s.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  <p><strong>Accommodation details</strong></p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '20px' }} border={1}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Description</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>From</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>To</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Duration</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '8px' }}><strong>Stay at {plan.accommodation.hotelName}</strong></td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{formatDate(plan.accommodation.from)}</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{formatDate(plan.accommodation.to)}</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{plan.accommodation.days} Nights</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{plan.accommodation.days * plan.accommodation.dailyRate}</td>
                      </tr>
                      {plan.accommodation.earlyCheckIn && (
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '8px' }}><strong>Early check-in charges</strong></td>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>-</td>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>-</td>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>-</td>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>{plan.accommodation.earlyCheckInCost}</td>
                        </tr>
                      )}
                      <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>Total accommodation cost</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}></td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{plan.accommodation.totalAmount}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p><strong>Food expenses (Meal-wise breakdown)</strong></p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '20px' }} border={1}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Date</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Number of meals</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Expense per meal</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.foodExpense.dailyExpenses.map((exp, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>{formatDate(exp.date)}</td>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>{exp.count}</td>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>{exp.rate}</td>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>{exp.amount}</td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>Total food expense</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={2}></td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{plan.foodExpense.totalAmount}</td>
                      </tr>
                    </tbody>
                  </table>
                  <br />
                  <p>Regards,</p>
                  <p><strong>{plan.userName}</strong></p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border-4 border-dashed border-slate-200 h-[600px] flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <Mail className="w-16 h-16 opacity-30 mb-6" />
                <h2 className="text-2xl font-bold text-slate-500 mb-3">Your Travel Plan</h2>
                <p className="max-w-xs mx-auto">Fill in the details to generate your approval email draft.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .email-content-container, .email-content-container * {
          color: #000 !important;
          border-color: #000 !important;
        }
      `}</style>
    </div>
  );
};

export default App;