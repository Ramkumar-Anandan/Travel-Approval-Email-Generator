
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Plane, Mail, Send, Printer, Copy, RefreshCw, Clock, MapPin, 
  Building2, CreditCard, Coffee, Download, Upload, Save, Trash2, 
  FileText, History, ChevronRight
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
      if (!silent) alert("Please fill in at least the travel dates before generating.");
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
      alert("Please select a University Name to save this profile.");
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
    alert(`Plan for ${formData.university} saved to your library!`);
  };

  const loadProfile = (profile: TravelProfile) => {
    setFormData(profile.data);
    setTimeout(() => {
        setPlan(null); 
    }, 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (formData.name && formData.university && formData.tripStartDate) {
        generatePlan(true);
    }
  }, [formData.university, formData.tripStartDate, formData.returnStartDate]);

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
        
        const updateArrivalPointByCity = (city: string) => {
          if (city === 'Bangalore') return 'Silk Board';
          if (city === 'Coimbatore') return 'Hope College';
          return newData.destinationPoint;
        };

        if (name === 'university' && UNIVERSITY_CITY_MAP[value]) {
          const targetCity = UNIVERSITY_CITY_MAP[value];
          newData.targetCity = targetCity;
          newData.destinationPoint = updateArrivalPointByCity(targetCity);
        }

        if (name === 'targetCity') {
          newData.destinationPoint = updateArrivalPointByCity(value);
        }

        if (name === 'outstationMode') {
          if (value === 'Bus') {
            newData.boardingPoint = 'Hope College';
          } else if (value === 'Train') {
            newData.boardingPoint = 'Coimbatore Railway station';
          }
          // Default return mode to same for convenience, can be overridden
          newData.returnOutstationMode = value as any;
        }

        // Convenience: auto-fill return defaults if onward values are changed
        if (name === 'homeStationMode') newData.returnHomeStationMode = value as any;
        if (name === 'outstationLocalMode') newData.returnOutstationLocalMode = value as any;
        if (name === 'homeStationCost') newData.returnHomeStationCost = value;
        if (name === 'outstationTravelCost') newData.returnOutstationTravelCost = value;
        if (name === 'outstationLocalCost') newData.returnOutstationLocalCost = value;
        
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
      let parsedData: Partial<FormData> = {};
      
      if (file.name.endsWith('.csv')) {
        parsedData = parseCsvToFormData(content);
      } else if (file.name.endsWith('.json')) {
        try {
          parsedData = JSON.parse(content);
        } catch (err) {
          alert("Invalid JSON format");
        }
      }

      setFormData(prev => ({ ...prev, ...parsedData }));
      setIsImporting(false);
      alert("Configuration imported!");
    };
    reader.readAsText(file);
    e.target.value = '';
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
        alert('Email draft copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy', err);
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
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <Plane className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Travel Approval Tool</h1>
              <p className="text-slate-500 font-medium tracking-tight">University Visit Planner & Multi-Stage Expense Calculator</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={saveToProfiles}
              className="px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Plan
            </button>
            <button 
              onClick={() => { setFormData(INITIAL_FORM_DATA); setPlan(null); }}
              className="px-5 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-2 scrollbar-thin scrollbar-thumb-slate-200">
            {/* HUB */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100 bg-gradient-to-br from-indigo-50/20 to-transparent">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                  <Download className="w-4 h-4" /> Data Hub
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all gap-2"
                >
                  <Upload className="w-6 h-6 text-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-600">Import Profile</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.json" 
                  className="hidden" 
                />
                
                {profiles.length > 0 && (
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-400 uppercase ml-1">Library ({profiles.length})</p>
                    <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto scrollbar-thin">
                      {profiles.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => loadProfile(p)}
                          className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-500 group transition-all"
                        >
                          <span className="text-[11px] font-bold text-slate-700 truncate">{p.university}</span>
                          <button onClick={(e) => deleteProfile(e, p.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FORM FIELDS */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                <MapPin className="w-4 h-4" /> Basic Details
              </div>
              <div className="space-y-4">
                <Input label="Your Name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name" />
                <Select label="University Name" name="university" value={formData.university} onChange={handleInputChange} options={["", ...UNIVERSITIES]} />
                <TextArea label="Purpose of Visit" name="reason" value={formData.reason} onChange={handleInputChange} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                <Clock className="w-4 h-4" /> Timeline
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input label="Travel Start Date" type="date" name="tripStartDate" value={formData.tripStartDate} onChange={handleInputChange} />
                <Input label="Start Time" type="time" name="tripStartTime" value={formData.tripStartTime} onChange={handleInputChange} />
                <Input label="Arrival Date" type="date" name="tripReachDate" value={formData.tripReachDate} onChange={handleInputChange} />
                <Input label="Arrival Time" type="time" name="tripReachTime" value={formData.tripReachTime} onChange={handleInputChange} />
              </div>
              <hr className="my-4 border-slate-100" />
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input label="Campus Visit Start" type="date" name="workStartDate" value={formData.workStartDate} onChange={handleInputChange} />
                <Input label="Campus Visit End" type="date" name="workEndDate" value={formData.workEndDate} onChange={handleInputChange} />
              </div>
              <hr className="my-4 border-slate-100" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Return Journey Start" type="date" name="returnStartDate" value={formData.returnStartDate} onChange={handleInputChange} />
                <Input label="Return Start Time" type="time" name="returnStartTime" value={formData.returnStartTime} onChange={handleInputChange} />
                <Input label="Home Reach Date" type="date" name="returnReachDate" value={formData.returnReachDate} onChange={handleInputChange} />
                <Input label="Home Reach Time" type="time" name="returnReachTime" value={formData.returnReachTime} onChange={handleInputChange} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                <Building2 className="w-4 h-4" /> Locations
              </div>
              <div className="space-y-4">
                <Input label="Home/Base Location" name="homeLocation" value={formData.homeLocation} onChange={handleInputChange} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Base City" name="baseCity" value={formData.baseCity} onChange={handleInputChange} />
                  <Input label="Target City" name="targetCity" value={formData.targetCity} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Boarding Point (Base)" name="boardingPoint" value={formData.boardingPoint} onChange={handleInputChange} />
                  <Input label="Arrival Point (Target)" name="destinationPoint" value={formData.destinationPoint} onChange={handleInputChange} />
                </div>
                <Input label="Hotel Name" name="hotelName" value={formData.hotelName} onChange={handleInputChange} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                <CreditCard className="w-4 h-4" /> Onward Journey
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Home Station Mode" name="homeStationMode" value={formData.homeStationMode} onChange={handleInputChange} options={['Cab', 'Auto', 'Cab / Auto', 'NA']} />
                    <Input label="Cost" type="number" name="homeStationCost" value={formData.homeStationCost} onChange={handleInputChange} disabled={formData.homeStationMode === 'NA'} />
                  </div>
                </div>
                <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100">
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Travel Mode" name="outstationMode" value={formData.outstationMode} onChange={handleInputChange} options={['Bus', 'Train', 'Flight', 'NA']} />
                    <Input label="Ticket Cost" type="number" name="outstationTravelCost" value={formData.outstationTravelCost} onChange={handleInputChange} disabled={formData.outstationMode === 'NA'} />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Local Mode at Target" name="outstationLocalMode" value={formData.outstationLocalMode} onChange={handleInputChange} options={['Cab', 'Auto', 'Cab / Auto', 'NA']} />
                    <Input label="Local Trip Cost" type="number" name="outstationLocalCost" value={formData.outstationLocalCost} onChange={handleInputChange} disabled={formData.outstationLocalMode === 'NA'} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                <RefreshCw className="w-4 h-4" /> Return Journey
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Local Mode at Target" name="returnOutstationLocalMode" value={formData.returnOutstationLocalMode} onChange={handleInputChange} options={['Cab', 'Auto', 'Cab / Auto', 'NA']} />
                    <Input label="Local Trip Cost" type="number" name="returnOutstationLocalCost" value={formData.returnOutstationLocalCost} onChange={handleInputChange} disabled={formData.returnOutstationLocalMode === 'NA'} />
                  </div>
                </div>
                <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100">
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Travel Mode" name="returnOutstationMode" value={formData.returnOutstationMode} onChange={handleInputChange} options={['Bus', 'Train', 'Flight', 'NA']} />
                    <Input label="Ticket Cost" type="number" name="returnOutstationTravelCost" value={formData.returnOutstationTravelCost} onChange={handleInputChange} disabled={formData.returnOutstationMode === 'NA'} />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Home Station Mode" name="returnHomeStationMode" value={formData.returnHomeStationMode} onChange={handleInputChange} options={['Cab', 'Auto', 'Cab / Auto', 'NA']} />
                    <Input label="Cost" type="number" name="returnHomeStationCost" value={formData.returnHomeStationCost} onChange={handleInputChange} disabled={formData.returnHomeStationMode === 'NA'} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                <Coffee className="w-4 h-4" /> Campus & Stay
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Campus Local Mode" name="dailyUniversityMode" value={formData.dailyUniversityMode} onChange={handleInputChange} options={['Cab', 'Auto', 'Cab / Auto', 'NA']} />
                    <Input label="Cost Per Trip" type="number" name="dailyUniversityCost" value={formData.dailyUniversityCost} onChange={handleInputChange} disabled={formData.dailyUniversityMode === 'NA'} />
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Hotel Rate" type="number" name="hotelDailyCost" value={formData.hotelDailyCost} onChange={handleInputChange} />
                    <Input label="Early Check-in" type="number" name="earlyCheckInCost" value={formData.earlyCheckInCost} onChange={handleInputChange} />
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="earlyCheckIn" name="earlyCheckIn" checked={formData.earlyCheckIn} onChange={handleInputChange as any} className="w-4 h-4 rounded text-indigo-600" />
                    <label htmlFor="earlyCheckIn" className="text-xs font-semibold text-slate-600">Apply early check-in charge</label>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => generatePlan(false)}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0"
              >
                <Send className="w-5 h-5" /> Generate draft
              </button>
            </div>
          </div>

          {/* EMAIL PREVIEW SECTION */}
          <div className="lg:col-span-7 h-fit sticky top-10">
            {plan ? (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-8 py-5 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    <span className="font-semibold text-sm tracking-wide uppercase">Email draft preview</span>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={copyToClipboard} className="flex items-center gap-2 text-xs font-bold hover:text-indigo-400 transition-colors">
                      <Copy className="w-4 h-4" /> COPY FOR GMAIL
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 text-xs font-bold hover:text-indigo-400 transition-colors">
                      <Printer className="w-4 h-4" /> PRINT
                    </button>
                  </div>
                </div>
                
                <div ref={emailRef} className="p-10 bg-white text-black font-serif text-[14px] leading-normal overflow-y-auto max-h-[85vh] email-content-container">
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
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Description</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>From</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>To</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Duration</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Amount (INR)</th>
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
                          <td style={{ border: '1px solid #000', padding: '8px', color: '#000' }}><strong>Early check-in charges</strong></td>
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
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Date</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Number of meals</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Expense per meal</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', color: '#000' }}>Amount</th>
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
                <div className="p-6 bg-slate-50 rounded-full mb-6">
                  <Mail className="w-16 h-16 opacity-30" />
                </div>
                <h2 className="text-2xl font-bold text-slate-500 mb-3">Your Itinerary</h2>
                <p className="max-w-xs mx-auto text-slate-400 font-medium tracking-tight">Fill in the details on the left to generate your approval email draft.</p>
                
                {profiles.length > 0 && (
                  <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-md">
                    {profiles.slice(0, 4).map(p => (
                      <button 
                        key={p.id}
                        onClick={() => loadProfile(p)}
                        className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left"
                      >
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-slate-600 truncate">{p.university}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .email-content-container, .email-content-container * {
          color: #000 !important;
        }
        .email-content-container strong {
          color: #000 !important;
        }
        .email-content-container table td, 
        .email-content-container table th {
          border: 1px solid #000 !important;
          color: #000 !important;
        }
      `}</style>
    </div>
  );
};

export default App;
