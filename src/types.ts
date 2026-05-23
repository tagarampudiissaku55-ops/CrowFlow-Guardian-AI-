export interface GateTelemetry {
  id: number;
  name: string;
  count: number; // current people per minute or queue size
  capacity: number; // max design exit rate per min
  isBlocked: boolean;
}

export interface ZoneTelemetry {
  id: string; // 'A', 'B', 'C', 'D', 'E', 'F'
  name: string;
  occupancy: number; // current count of people in zone
  capacity: number; // zone capacity limit
}

export type WeatherType = 'Sunny' | 'Rainy' | 'Thunderstorm' | 'Extreme Heat';

export type MatchPhase = 
  | 'Pre-Match (Arrivals)' 
  | 'In-Progress (Early Overs)' 
  | 'Mid-Innings Break' 
  | 'In-Progress (Death Overs)' 
  | 'Post-Match (Egress)';

export interface EmergencyIncident {
  id: string;
  type: string; // 'None' | 'Medical Emergency' | 'Scuffle/Clash' | 'Gate Congestion' | 'Pyrotechnics Flare' | 'Panic Wave'
  severity: 'Low' | 'Medium' | 'High';
  zone: string; // e.g. 'Zone A', 'Gate 3', 'Concourse C'
  description: string;
}

export interface StadiumState {
  gates: GateTelemetry[];
  zones: ZoneTelemetry[];
  weather: WeatherType;
  matchPhase: MatchPhase;
  incidents: EmergencyIncident[];
  securityStaff: number; // active staff count
  vibeText?: string;
}

export interface GateAction {
  gateId: number;
  recommendedAction: string;
}

export interface SafetyReport {
  riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  dangerZones: string[];
  aiRecommendations: string[];
  emergencyActions: string[];
  predictedOutcome: string;
  gateStats: GateAction[];
  generatedAt: string;
}

export interface PresetScenario {
  name: string;
  description: string;
  weather: WeatherType;
  matchPhase: MatchPhase;
  gates: { id: number; count: number; isBlocked: boolean }[];
  zones: { id: string; occupancy: number }[];
  incidents: EmergencyIncident[];
  securityStaff: number;
}
