import React from 'react';
import { StadiumState, GateTelemetry, ZoneTelemetry, WeatherType, MatchPhase, EmergencyIncident, PresetScenario } from '../types';
import { Shield, Sparkles, AlertTriangle, CloudSun, UserCheck, Trash2, HeartPulse, ShieldAlert, Swords } from 'lucide-react';

interface ControlPanelProps {
  state: StadiumState;
  selectedGateId: number | null;
  onUpdateGates: (gates: GateTelemetry[]) => void;
  onUpdateZones: (zones: ZoneTelemetry[]) => void;
  onUpdateWeather: (w: WeatherType) => void;
  onUpdateMatchPhase: (m: MatchPhase) => void;
  onUpdateIncidents: (incidents: EmergencyIncident[]) => void;
  onUpdateSecurityStaff: (staff: number) => void;
  onLoadScenario: (scenario: PresetScenario) => void;
  dbPresets?: any[];
  onSavePreset?: (name: string, desc: string) => Promise<void>;
  onDeletePreset?: (id: string) => Promise<void>;
  userUid?: string;
}

const PRESETS: PresetScenario[] = [
  {
    name: "Standard Match Exit",
    description: "Matches just ended on an absolute thriller! Sunny sky, peak egress exit movement under safe crowd monitoring speeds. Security levels high.",
    weather: "Sunny",
    matchPhase: "Post-Match (Egress)",
    gates: [
      { id: 1, count: 120, isBlocked: false },
      { id: 2, count: 110, isBlocked: false },
      { id: 3, count: 130, isBlocked: false },
      { id: 4, count: 125, isBlocked: false },
      { id: 5, count: 140, isBlocked: false },
      { id: 6, count: 115, isBlocked: false },
      { id: 7, count: 130, isBlocked: false },
      { id: 8, count: 105, isBlocked: false },
    ],
    zones: [
      { id: 'A', occupancy: 4200 },
      { id: 'B', occupancy: 6500 },
      { id: 'C', occupancy: 4100 },
      { id: 'D', occupancy: 7200 },
      { id: 'E', occupancy: 2100 },
      { id: 'F', occupancy: 3100 },
    ],
    incidents: [],
    securityStaff: 280,
  },
  {
    name: "Sudden Storm Gate Jam",
    description: "A heavy lightning downpour starts right during post-match egress. Outer Gate 3 blocks due to architectural ticket scanners shorting. Gate 4 flow spikes to 230 people/min causing severe panic bottlenecking.",
    weather: "Thunderstorm",
    matchPhase: "Post-Match (Egress)",
    gates: [
      { id: 1, count: 160, isBlocked: false },
      { id: 2, count: 170, isBlocked: false },
      { id: 3, count: 0, isBlocked: true },
      { id: 4, count: 240, isBlocked: false },
      { id: 5, count: 195, isBlocked: false },
      { id: 6, count: 160, isBlocked: false },
      { id: 7, count: 155, isBlocked: false },
      { id: 8, count: 145, isBlocked: false },
    ],
    zones: [
      { id: 'A', occupancy: 9500 },
      { id: 'B', occupancy: 12200 },
      { id: 'C', occupancy: 8900 },
      { id: 'D', occupancy: 13100 },
      { id: 'E', occupancy: 4200 },
      { id: 'F', occupancy: 5800 },
    ],
    incidents: [
      {
        id: "inc-storm-1",
        type: "Gate Congestion",
        severity: "High",
        zone: "Gate 3 Entrance",
        description: "Severe stampede risk list due to sudden rain panic combined with turnstile scanner electrical shorting."
      }
    ],
    securityStaff: 120,
  },
  {
    name: "Mid-Innings Concourse Rush",
    description: "The 15-minute inter-innings break triggers a massive rush toward restrooms and concession areas in Zone C and D. Food courts jam completely.",
    weather: "Rainy",
    matchPhase: "Mid-Innings Break",
    gates: [
      { id: 1, count: 35, isBlocked: false },
      { id: 2, count: 40, isBlocked: false },
      { id: 3, count: 30, isBlocked: false },
      { id: 4, count: 45, isBlocked: false },
      { id: 5, count: 25, isBlocked: false },
      { id: 6, count: 35, isBlocked: false },
      { id: 7, count: 45, isBlocked: false },
      { id: 8, count: 20, isBlocked: false },
    ],
    zones: [
      { id: 'A', occupancy: 7000 },
      { id: 'B', occupancy: 10500 },
      { id: 'C', occupancy: 11500 }, // Spiked restroom load
      { id: 'D', occupancy: 13900 }, // Spiked food court queue
      { id: 'E', occupancy: 3500 },
      { id: 'F', occupancy: 4200 },
    ],
    incidents: [
      {
        id: "inc-break-1",
        type: "Panic Wave",
        severity: "Medium",
        zone: "Concourse C Corridor",
        description: "Localized crowd crushing detected along level 2 escalators and hot dog lines."
      }
    ],
    securityStaff: 210,
  },
  {
    name: "North Tier Flare Flare Alert",
    description: "Match is intensely in progress. Standard middle overs. Pyrotechnic flares are set off by rogue fans in Zone E, causing severe smoke block and localized seat evacuation panic.",
    weather: "Extreme Heat",
    matchPhase: "In-Progress (Early Overs)",
    gates: [
      { id: 1, count: 15, isBlocked: false },
      { id: 2, count: 20, isBlocked: false },
      { id: 3, count: 10, isBlocked: false },
      { id: 4, count: 12, isBlocked: false },
      { id: 5, count: 8, isBlocked: false },
      { id: 6, count: 15, isBlocked: false },
      { id: 7, count: 12, isBlocked: false },
      { id: 8, count: 14, isBlocked: false },
    ],
    zones: [
      { id: 'A', occupancy: 6500 },
      { id: 'B', occupancy: 9500 },
      { id: 'C', occupancy: 7000 },
      { id: 'D', occupancy: 10000 },
      { id: 'E', occupancy: 4800 }, // Flares are here
      { id: 'F', occupancy: 4000 },
    ],
    incidents: [
      {
        id: "inc-flare-1",
        type: "Pyrotechnics Flare",
        severity: "High",
        zone: "Clubhouse Zone E",
        description: "Rogue flares set off emitting thick orange smoke. Fans in Tier E initiating immediate backward rush."
      }
    ],
    securityStaff: 180,
  }
];

export default function ControlPanel({
  state,
  selectedGateId,
  onUpdateGates,
  onUpdateZones,
  onUpdateWeather,
  onUpdateMatchPhase,
  onUpdateIncidents,
  onUpdateSecurityStaff,
  onLoadScenario,
  dbPresets = [],
  onSavePreset,
  onDeletePreset,
  userUid,
}: ControlPanelProps) {

  // Selected gate handle helpers
  const selectedGate = state.gates.find(g => g.id === selectedGateId);

  const handleGateCountChange = (val: number) => {
    if (!selectedGate) return;
    const next = state.gates.map(g => g.id === selectedGate.id ? { ...g, count: val } : g);
    onUpdateGates(next);
  };

  const handleGateCapacityChange = (val: number) => {
    if (!selectedGate) return;
    const next = state.gates.map(g => g.id === selectedGate.id ? { ...g, capacity: val } : g);
    onUpdateGates(next);
  };

  const handleGateBlockToggle = () => {
    if (!selectedGate) return;
    const next = state.gates.map(g => g.id === selectedGate.id ? { ...g, isBlocked: !g.isBlocked } : g);
    onUpdateGates(next);
  };

  // Seating level modifications
  const handleZoneCapacityChange = (zoneId: string, occupancy: number) => {
    const next = state.zones.map(z => z.id === zoneId ? { ...z, occupancy: Math.min(occupancy, z.capacity) } : z);
    onUpdateZones(next);
  };

  // Incident insertion
  const triggerNewIncident = (type: string, zoneName: string, severity: 'Low' | 'Medium' | 'High', desc: string) => {
    const newInc: EmergencyIncident = {
      id: `man-inc-${Date.now()}`,
      type,
      severity,
      zone: zoneName,
      description: desc
    };
    onUpdateIncidents([...state.incidents, newInc]);
  };

  const removeIncidentItem = (id: string) => {
    onUpdateIncidents(state.incidents.filter(inc => inc.id !== id));
  };

  return (
    <div className="space-y-6" id="control-panel-wrapper">
      
      {/* 1. SCENARIO PRESETS DASHBOARD */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-md" id="presets-card">
        <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-wider mb-3">
          <Sparkles className="h-4 w-4" />
          <span>Active Operations Simulation Presets</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESETS.map((p, idx) => {
            const isMatch = state.matchPhase === p.matchPhase && state.weather === p.weather && state.incidents.length === p.incidents.length;
            return (
              <button
                key={idx}
                type="button"
                className={`p-3 text-left rounded-lg border transition-all duration-200 hover:-translate-y-[1px] ${
                  isMatch
                    ? 'bg-indigo-950/40 border-indigo-500/80 text-white ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                onClick={() => onLoadScenario(p)}
                id={`preset-scenario-${idx}`}
              >
                <div className="font-bold text-xs flex justify-between items-center">
                  <span>{p.name}</span>
                  {isMatch && <span className="text-[9px] bg-indigo-500/30 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider animate-pulse">Running</span>}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-sans line-clamp-2">{p.description}</p>
              </button>
            );
          })}

          {dbPresets.map((p: any) => {
            const isMatch = state.matchPhase === p.matchPhase && state.weather === p.weather;
            return (
              <div
                key={p.id}
                className={`group relative p-3 text-left rounded-lg border transition-all duration-200 hover:-translate-y-[1px] ${
                  isMatch
                    ? 'bg-indigo-950/40 border-indigo-500/80 text-white ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-705'
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left focus:outline-none"
                  onClick={() => onLoadScenario({
                    name: p.name,
                    description: p.description,
                    weather: p.weather,
                    matchPhase: p.matchPhase,
                    gates: p.gates,
                    zones: p.zones,
                    incidents: [],
                    securityStaff: p.securityStaff
                  })}
                >
                  <div className="font-bold text-xs flex justify-between items-center pr-6">
                    <span className="truncate max-w-[120px]">{p.name}</span>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded uppercase font-extrabold tracking-wider shrink-0">Cloud</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-sans line-clamp-2">{p.description}</p>
                </button>
                {onDeletePreset && p.creatorId === userUid && (
                  <button
                    type="button"
                    onClick={() => onDeletePreset(p.id)}
                    className="absolute right-2 top-2.5 p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-red-400 transition-colors focus:opacity-100"
                    title="Delete Custom Scenario"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* CUSTOM DEPLOYMENT FORM CARD */}
        {userUid ? (
          <div className="mt-3.5 pt-3.5 border-t border-slate-850">
            <details className="group">
              <summary className="list-none flex items-center justify-between text-xs text-slate-400 font-mono uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none">
                <span className="flex items-center space-x-1.5">
                  <span className="text-indigo-400 font-bold transition-transform group-open:rotate-90">▸</span>
                  <span>Assemble Custom Cloud Preset</span>
                </span>
                <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold uppercase">Configure</span>
              </summary>
              <div className="mt-3.5 space-y-3.5 animate-fadeIn font-sans">
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1">PRESET NAME</label>
                    <input 
                      type="text"
                      placeholder="e.g. Extreme Exit Jam"
                      id="save-preset-name-input"
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1">OPERATIONAL DESCRIPTION</label>
                    <textarea 
                      placeholder="Explain current crowd patterns or gate bottleneck rules..."
                      id="save-preset-desc-input"
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const nameInput = document.getElementById('save-preset-name-input') as HTMLInputElement;
                    const descInput = document.getElementById('save-preset-desc-input') as HTMLTextAreaElement;
                    if (nameInput && descInput && onSavePreset) {
                      const name = nameInput.value.trim();
                      const desc = descInput.value.trim();
                      if (!name) return alert("Please specify a preset name.");
                      await onSavePreset(name, desc || "No description provided.");
                      nameInput.value = "";
                      descInput.value = "";
                      const details = nameInput.closest('details');
                      if (details) details.open = false;
                    }
                  }}
                  className="w-full py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-mono text-[10px] font-bold rounded shadow transition-all active:scale-95 cursor-pointer text-center"
                >
                  Publish Current Parameters to Clouds
                </button>
              </div>
            </details>
          </div>
        ) : (
          <p className="mt-3 text-[10px] text-slate-500 text-center font-sans italic border border-dashed border-slate-850 p-2 rounded">
            🔒 Authenticate as an operations officer to design and save custom cloud presets.
          </p>
        )}
      </div>

      {/* 2. ATMOSPHERICS & TIMELINE CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weather card */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl" id="weather-card">
          <label className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-2 block">Atmosphere & Weather</label>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {(['Sunny', 'Rainy', 'Thunderstorm', 'Extreme Heat'] as WeatherType[]).map((w) => {
              const active = state.weather === w;
              return (
                <button
                  key={w}
                  type="button"
                  className={`py-1.5 text-xs rounded font-bold transition-all ${
                    active 
                      ? 'bg-sky-500/20 border-sky-500 text-sky-400' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                  } border`}
                  onClick={() => onUpdateWeather(w)}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Match Phase card */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl" id="match-phase-card">
          <label className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-2 block">Match Timeline Phase</label>
          <select
            className="w-full mt-2 bg-slate-950 border border-slate-800 text-xs text-slate-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            value={state.matchPhase}
            onChange={(e) => onUpdateMatchPhase(e.target.value as MatchPhase)}
          >
            <option value="Pre-Match (Arrivals)">Pre-Match (Arrivals flow)</option>
            <option value="In-Progress (Early Overs)">In-Progress (Early overs)</option>
            <option value="Mid-Innings Break">Mid-Innings Break (restroom rush)</option>
            <option value="In-Progress (Death Overs)">In-Progress (Death overs)</option>
            <option value="Post-Match (Egress)">Post-Match (Egress / exit rush)</option>
          </select>
        </div>
      </div>

      {/* 3. DYNAMIC TELEMETRY CONTROLLER (SELECTED GATE OR ZONES) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl" id="telemetry-controllers">
        <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-4 border-b border-slate-800/60 pb-2">
          <CloudSun className="h-4 w-4" />
          <span>Dynamic Gate & Seating Level Controller</span>
        </div>

        {selectedGate ? (
          <div className="space-y-4 animate-fadeIn" id="gate-specific-controls">
            <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Gate Monitor Focused:</span>
                <h4 className="text-sm font-bold text-slate-200 mt-0.5">{selectedGate.name}</h4>
              </div>
              <button
                type="button"
                className={`text-xs py-1 px-3 rounded font-bold transition-all uppercase ${
                  selectedGate.isBlocked
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                }`}
                onClick={handleGateBlockToggle}
              >
                {selectedGate.isBlocked ? 'RELEASE GATE OVERRIDE' : 'FORCE BLOCKED SHUT'}
              </button>
            </div>

            {/* Slider count flow */}
            {!selectedGate.isBlocked && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-mono">Flow rate (people/min):</span>
                    <span className="font-bold text-emerald-400 font-mono">{selectedGate.count} / min</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="280"
                    step="5"
                    className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                    value={selectedGate.count}
                    onChange={(e) => handleGateCountChange(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span>Empty (0)</span>
                    <span>Bottleneck (200)</span>
                    <span>Severe (280)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-mono">Gate capacity limit:</span>
                    <span className="font-bold text-slate-300 font-mono">{selectedGate.capacity} max</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="220"
                    step="10"
                    className="w-full accent-indigo-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                    value={selectedGate.capacity}
                    onChange={(e) => handleGateCapacityChange(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span>Narrow (100)</span>
                    <span>Standard (150)</span>
                    <span>Mega Gate (220)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 bg-slate-950 rounded border border-dashed border-slate-800 text-slate-500 text-xs">
            No gate selected. Click any gate on the live Arena floor plan to change parameters or toggle blocks.
          </div>
        )}

        {/* Seating Tiers Grid */}
        <div className="mt-4 pt-4 border-t border-slate-800/60">
          <label className="text-slate-400 font-mono text-[11px] uppercase tracking-wider block mb-2.5">Live Zone Capacity levels</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {state.zones.map((z) => {
              const pct = (z.occupancy / z.capacity) * 100;
              return (
                <div key={z.id} className="bg-slate-950 p-2 rounded border border-slate-850">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-300 font-mono">Zone {z.id}</span>
                    <span className={`font-mono font-bold ${pct > 85 ? 'text-rose-400' : pct > 60 ? 'text-amber-400' : 'text-slate-400'}`}>{Math.round(pct)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={z.capacity}
                    step="200"
                    className={`w-full accent-emerald-500 bg-slate-900 h-1.5 rounded cursor-pointer ${pct > 85 ? 'accent-rose-500' : pct > 60 ? 'accent-amber-500' : ''}`}
                    value={z.occupancy}
                    onChange={(e) => handleZoneCapacityChange(z.id, Number(e.target.value))}
                  />
                  <span className="text-[10px] text-slate-500 block text-right mt-1 font-mono">{Math.round(z.occupancy/100)/10}k / {Math.round(z.capacity/100)/10}k max</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. ACTIVE EMERGENCY INCIDENTS & FACTION STRENGTH */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl" id="incidents-card">
        <div className="flex items-center justify-between space-x-2 text-rose-400 font-mono text-xs uppercase tracking-wider mb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Active Incidents & Security Dispatch</span>
          </div>
          <span className="text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded font-bold tracking-normal">{state.incidents.length} Registered</span>
        </div>

        {/* Security personnel response deployment */}
        <div className="mb-4 bg-slate-950 p-3 rounded border border-slate-850">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400 font-mono flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
              Security Staffing levels:
            </span>
            <span className="font-bold text-indigo-400 font-mono">{state.securityStaff} marshals deployed</span>
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            className="w-full accent-indigo-500 bg-slate-900 h-2 rounded-lg cursor-pointer"
            value={state.securityStaff}
            onChange={(e) => onUpdateSecurityStaff(Number(e.target.value))}
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
            <span>Low (50) - Dangerous</span>
            <span>Medium (250)</span>
            <span>Premium (500) - Strong</span>
          </div>
        </div>

        {/* List of active real emergencies */}
        {state.incidents.length > 0 ? (
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {state.incidents.map((inc) => (
              <div key={inc.id} className="bg-slate-950 border border-rose-500/20 p-2 rounded flex items-start justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 bg-rose-950 text-rose-400 font-extrabold uppercase text-[9px] rounded font-mono">
                      {inc.severity} Severity
                    </span>
                    <span className="font-bold text-slate-200">{inc.type}</span>
                    <span className="text-slate-500 text-[10px]">@{inc.zone}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">{inc.description}</p>
                </div>
                <button
                  type="button"
                  className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-red-400 transition-colors"
                  onClick={() => removeIncidentItem(inc.id)}
                  title="Acknowledge and Resolve incident"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 bg-slate-950 rounded border border-dashed border-slate-800 text-slate-500 text-xs">
            Excellent. Zero active hazardous emergencies logged.
          </div>
        )}

        {/* Quick incident trigger buttons */}
        <div className="mt-3 pt-3 border-t border-slate-800/50">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-2">Simulate Quick Trigger Incidents</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="py-1.5 px-2 bg-slate-950 hover:bg-rose-950/20 border border-slate-850 hover:border-rose-500/40 rounded text-[10px] text-left text-slate-300 flex items-center space-x-1"
              onClick={() => triggerNewIncident("Crowd Clash", "Zone B Concourse", "High", "Two sets of rival fans clash outside fast food court. Beer bottles broken.")}
            >
              <Swords className="h-3 w-3 text-rose-500" />
              <span>Trigger Fan Scuffle</span>
            </button>
            <button
              type="button"
              className="py-1.5 px-2 bg-slate-950 hover:bg-rose-950/20 border border-slate-850 hover:border-rose-500/40 rounded text-[10px] text-left text-slate-300 flex items-center space-x-1"
              onClick={() => triggerNewIncident("Medical Emergency", "Zone C Seating", "Medium", "Seventy year old elderly gentleman suffers heavy heatstroke & collapsed vision.")}
            >
              <HeartPulse className="h-3 w-3 text-red-400" />
              <span>Medical Heatstroke</span>
            </button>
            <button
              type="button"
              className="py-1.5 px-2 bg-slate-950 hover:bg-rose-950/20 border border-slate-850 hover:border-rose-500/40 rounded text-[10px] text-left text-slate-300 flex items-center space-x-1"
              onClick={() => triggerNewIncident("Pyrotechnics Flare", "Zone E Club", "High", "Unauthorized flares set off in seating tier E causing dense choking toxic smoke.")}
            >
              <ShieldAlert className="h-3 w-3 text-orange-400" />
              <span>Rogue pyro smoke</span>
            </button>
            <button
              type="button"
              className="py-1.5 px-2 bg-slate-950 hover:bg-rose-950/20 border border-slate-850 hover:border-rose-500/40 rounded text-[10px] text-left text-slate-300 flex items-center space-x-1"
              onClick={() => triggerNewIncident("Panic Wave", "Gate 5 Escalators", "High", "Sudden loud thunderclap causes minor stampede wave down the stairwell exit.")}
            >
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span>Gate 5 Crowd Crush</span>
            </button>
          </div>
        </div>

        {/* CUSTOM INCIDENT DISPATCHER */}
        <div className="mt-4 pt-3 border-t border-slate-800/50">
          <details className="group">
            <summary className="list-none flex items-center justify-between text-[11px] text-slate-400 font-mono uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none">
              <span className="flex items-center space-x-1.5 hover:text-rose-400 transition-colors">
                <span className="text-rose-500 font-extrabold transition-transform group-open:rotate-90">▸</span>
                <span>Report Custom Live Incident</span>
              </span>
              <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded text-rose-300 font-bold uppercase font-mono">Dispatch</span>
            </summary>
            <div className="mt-2.5 space-y-2 animate-fadeIn font-sans text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">INCIDENT TYPE</label>
                  <select
                    id="custom-inc-type"
                    className="w-full bg-slate-950 border border-slate-800 p-1 rounded text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                  >
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Crowd Clash">Scuffle / Crowd Clash</option>
                    <option value="Gate Congestion">Gate Congestion Gridlock</option>
                    <option value="Pyrotechnics Flare">Illegal Pyrotechnics</option>
                    <option value="Panic Wave">Panic stampede wave</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">LOCATION / ZONE</label>
                  <select
                    id="custom-inc-zone"
                    className="w-full bg-slate-950 border border-slate-800 p-1 rounded text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                  >
                    <option value="Zone A Premium">Zone A (North)</option>
                    <option value="Zone B Stand">Zone B (East)</option>
                    <option value="Zone C Premium">Zone C (South)</option>
                    <option value="Zone D Stand">Zone D (West)</option>
                    <option value="Clubhouse Zone E">Zone E (Clubhouse)</option>
                    <option value="Pavilion Zone F">Zone F (Pavilion)</option>
                    <option value="Gate 1 Concourse">Gate 1 Area</option>
                    <option value="Gate 2 Entry">Gate 2 Area</option>
                    <option value="Gate 3 Concourse">Gate 3 Area</option>
                    <option value="Gate 4 Concourse">Gate 4 Area</option>
                    <option value="Gate 5 Concourse">Gate 5 Area</option>
                    <option value="Gate 6 Plaza">Gate 6 Area</option>
                    <option value="Gate 7 Plz">Gate 7 Area</option>
                    <option value="Gate 8 Area">Gate 8 Area</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">SEVERITY LEVEL</label>
                  <select
                    id="custom-inc-severity"
                    className="w-full bg-slate-950 border border-slate-800 p-1 rounded text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                  >
                    <option value="Low">Low (Minor Delay)</option>
                    <option value="Medium">Medium (Advisable Dispatch)</option>
                    <option value="High">High (Immediate Triage)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">EXPLANATION</label>
                  <input
                    id="custom-inc-desc"
                    placeholder="Brief crowd status update..."
                    className="w-full bg-slate-950 border border-slate-800 p-1 rounded text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const typeSel = document.getElementById("custom-inc-type") as HTMLSelectElement;
                  const zoneSel = document.getElementById("custom-inc-zone") as HTMLSelectElement;
                  const sevSel = document.getElementById("custom-inc-severity") as HTMLSelectElement;
                  const descInp = document.getElementById("custom-inc-desc") as HTMLInputElement;

                  if (typeSel && zoneSel && sevSel && descInp) {
                    const type = typeSel.value;
                    const zoneVal = zoneSel.value;
                    const severity = sevSel.value as 'Low' | 'Medium' | 'High';
                    const desc = descInp.value.trim() || `Active reporting of type ${type} logged near ${zoneVal}.`;

                    triggerNewIncident(type, zoneVal, severity, desc);
                    descInp.value = "";
                    
                    const details = typeSel.closest('details');
                    if (details) details.open = false;
                  }
                }}
                className="w-full text-center py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 font-mono text-[10px] font-bold rounded cursor-pointer transition-all active:scale-95"
              >
                🚨 Log Incident & Alert Steward Teams
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
