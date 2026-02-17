
export type TravelMode = 'Cab' | 'Auto' | 'Cab / Auto' | 'Bus' | 'Train' | 'Flight' | 'NA';

export interface TravelSegment {
  from: string;
  to: string;
  date: string;
  time?: string;
  mode: string;
  amount: number;
}

export interface AccommodationDetails {
  from: string;
  to: string;
  days: number;
  hotelName: string;
  dailyRate: number;
  earlyCheckInCost: number;
  totalAmount: number;
  earlyCheckIn: boolean;
}

export interface DailyFoodExpense {
  date: string;
  count: number;
  rate: number;
  amount: number;
}

export interface FoodBreakdown {
  dailyExpenses: DailyFoodExpense[];
  totalAmount: number;
}

export interface TravelPlan {
  userName: string;
  userEmail: string;
  university: string;
  reason: string;
  startDate: string;
  endDate: string;
  baseCity: string;
  targetCity: string;
  boardingPoint: string;
  destinationPoint: string;
  hotelName: string;
  
  // Generated Lists
  onwardJourney: TravelSegment[];
  dailyLocalTravel: TravelSegment[];
  returnJourney: TravelSegment[];
  accommodation: AccommodationDetails;
  
  foodExpense: FoodBreakdown;
  
  totalEstimatedExpense: number;
}

export interface FormData {
  name: string;
  email: string;
  university: string;
  reason: string;
  tripStartDate: string;
  tripStartTime: string;
  tripReachDate: string;
  tripReachTime: string;
  returnStartDate: string;
  returnStartTime: string;
  returnReachDate: string;
  returnReachTime: string;
  workStartDate: string;
  workEndDate: string;
  homeLocation: string;
  baseCity: string;
  boardingPoint: string;
  destinationPoint: string;
  targetCity: string;
  hotelName: string;
  
  // Onward Modes
  homeStationMode: 'Cab' | 'Auto' | 'Cab / Auto' | 'NA';
  outstationMode: 'Bus' | 'Train' | 'Flight' | 'NA';
  outstationLocalMode: 'Cab' | 'Auto' | 'Cab / Auto' | 'NA';
  
  // Return Modes
  returnHomeStationMode: 'Cab' | 'Auto' | 'Cab / Auto' | 'NA';
  returnOutstationMode: 'Bus' | 'Train' | 'Flight' | 'NA';
  returnOutstationLocalMode: 'Cab' | 'Auto' | 'Cab / Auto' | 'NA';

  dailyUniversityMode: 'Cab' | 'Auto' | 'Cab / Auto' | 'NA';
  
  // Cost Inputs
  homeStationCost: string;
  outstationTravelCost: string;
  outstationLocalCost: string;
  returnHomeStationCost: string;
  returnOutstationTravelCost: string;
  returnOutstationLocalCost: string;
  dailyUniversityCost: string;
  hotelDailyCost: string;
  earlyCheckInCost: string;
  
  earlyCheckIn: boolean;
}

export interface TravelProfile {
  id: string;
  university: string;
  lastUpdated: string;
  data: FormData;
}
