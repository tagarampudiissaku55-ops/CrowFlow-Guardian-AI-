import React, { useState, useEffect } from 'react';
import { GateTelemetry, ZoneTelemetry, WeatherType, MatchPhase, EmergencyIncident, SafetyReport, PresetScenario } from './types';
import StadiumVisualizer from './components/StadiumVisualizer';
import ControlPanel from './components/ControlPanel';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Shield, 
  RefreshCw, 
  AlertTriangle, 
  HelpCircle, 
  FileText, 
  Users, 
  Zap, 
  Activity, 
  FileSignature, 
  Play,
  Pause
} from 'lucide-react';

// Initial state setups
const INITIAL_GATES: GateTelemetry[] = [
  { id: 1, name: "North-West Wing (Gate 1)", count: 120, capacity: 150, isBlocked: false },
  { id: 2, name: "North Conc (Gate 2)", count: 110, capacity: 150, isBlocked: false },
  { id: 3, name: "North-East Plaza (Gate 3)", count: 130, capacity: 150, isBlocked: false },
  { id: 4, name: "East Conc (Gate 4)", count: 125, capacity: 150, isBlocked: false },
  { id: 5, name: "South-East Corner (Gate 5)", count: 140, capacity: 150, isBlocked: false },
  { id: 6, name: "South Conc (Gate 6)", count: 115, capacity: 150, isBlocked: false },
  { id: 7, name: "South-West Plz (Gate 7)", count: 130, capacity: 150, isBlocked: false },
  { id: 8, name: "West Oval Wing (Gate 8)", count: 105, capacity: 150, isBlocked: false },
];

const INITIAL_ZONES: ZoneTelemetry[] = [
  { id: 'A', name: "North Premium Tier", occupancy: 4200, capacity: 12000 },
  { id: 'B', name: "East General Stand", occupancy: 6500, capacity: 20000 },
  { id: 'C', name: "South Premium Stand", occupancy: 4100, capacity: 12000 },
  { id: 'D', name: "West General Stand", occupancy: 7200, capacity: 25000 },
  { id: 'E', name: "Clubhouse Suites", occupancy: 2100, capacity: 6000 },
  { id: 'F', name: "Pavilion Tier", occupancy: 3100, capacity: 10000 },
];

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

export default function App() {
  const [gates, setGates] = useState<GateTelemetry[]>(INITIAL_GATES);
  const [zones, setZones] = useState<ZoneTelemetry[]>(INITIAL_ZONES);
  const [weather, setWeather] = useState<WeatherType>('Sunny');
  const [matchPhase, setMatchPhase] = useState<MatchPhase>('Post-Match (Egress)');
  const [securityStaff, setSecurityStaff] = useState<number>(280);

  // Selector focused Gate
  const [selectedGateId, setSelectedGateId] = useState<number | null>(1);

  // Diagnostic states
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoDiagnose, setAutoDiagnose] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Commande logs state
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date().toLocaleTimeString(), message: "CrowdFlow Guardian AI core initialization complete.", type: 'success' },
    { timestamp: new Date().toLocaleTimeString(), message: "Live telemetry links linked. Awaiting scenario feed.", type: 'info' }
  ]);

  // Action executed tracker to give active roleplay capability
  const [actionedRecs, setActionedRecs] = useState<Set<string>>(new Set());

  // Firebase Auth and database states
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [liveIncidents, setLiveIncidents] = useState<EmergencyIncident[]>([]);
  const [localIncidents, setLocalIncidents] = useState<EmergencyIncident[]>([]);
  const [dbPresets, setDbPresets] = useState<any[]>([]);
  const [historicReports, setHistoricReports] = useState<any[]>([]);
  const [isSavingReport, setIsSavingReport] = useState<boolean>(false);

  // Live egress simulation parameters
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [totalEvacuated, setTotalEvacuated] = useState<number>(0);
  const [initialFansDemand, setInitialFansDemand] = useState<number>(27200);
  const [secondsSimulated, setSecondsSimulated] = useState<number>(0);

  // Actual incidents is computed based on Auth status (live synced if logged in, local if guest)
  const incidents = user ? liveIncidents : localIncidents;

  // Function to add local logs
  const addLog = (msg: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp: time, message: msg, type }, ...prev].slice(0, 15));
  };

  // Convert Firebase Server Timestamps safely for the UI
  const formatFirestoreTimestamp = (ts: any): string => {
    if (!ts) return new Date().toLocaleTimeString();
    if (typeof ts === 'string') {
      try {
        return new Date(ts).toLocaleTimeString();
      } catch {
        return ts;
      }
    }
    if (ts && 'toDate' in ts && typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleTimeString();
    }
    return new Date(ts).toLocaleTimeString();
  };

  // Google popup sign-in
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    addLog("Initiating Google Shift Officer Authorization pop-up...", "info");
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error(e);
      addLog(`Roster sign-in failed: ${e.message}`, "error");
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      addLog("Officer completed roster log-out shift.", "info");
    } catch (e: any) {
      console.error(e);
      addLog("Authorization shift exit failed.", "error");
    }
  };

  // Core Connection validation boot effect
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        addLog("Firebase live connection established successfully.", "success");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          addLog("Database is operating in cached offline buffer.", "warn");
        }
      }
    }
    testConnection();

    // Setup Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        addLog(`Marshall authenticated: ${currentUser.displayName || currentUser.email}`, 'success');
      } else {
        addLog('Operating in guest simulation preview space.', 'info');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Firebase Live Sync Listeners for Authenticated shifts
  useEffect(() => {
    if (!user) {
      setLiveIncidents([]);
      setDbPresets([]);
      setHistoricReports([]);
      return;
    }

    // A. Subscribing real-time to Live Incidents
    const pathInc = 'incidents';
    const qInc = query(collection(db, pathInc), orderBy('createdAt', 'desc'));
    const unsubscribeInc = onSnapshot(qInc, (snapshot) => {
      const live: EmergencyIncident[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data();
        live.push({
          id: item.id,
          type: item.type,
          severity: item.severity,
          zone: item.zone,
          description: item.description
        } as EmergencyIncident);
      });
      setLiveIncidents(live);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathInc);
    });

    // B. Subscribing real-time to Custom Presets
    const pathPresets = 'savedPresets';
    const qPresets = query(collection(db, pathPresets), orderBy('createdAt', 'desc'));
    const unsubscribePresets = onSnapshot(qPresets, (snapshot) => {
      const presets: any[] = [];
      snapshot.forEach((doc) => {
        presets.push(doc.data());
      });
      setDbPresets(presets);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathPresets);
    });

    // C. Subscribing real-time to Safety Reports history logs (Limit 5 for cost control)
    const pathReports = 'safetyReports';
    const qReports = query(collection(db, pathReports), orderBy('generatedAt', 'desc'), limit(5));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      const reports: any[] = [];
      snapshot.forEach((doc) => {
        reports.push(doc.data());
      });
      setHistoricReports(reports);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathReports);
    });

    return () => {
      unsubscribeInc();
      unsubscribePresets();
      unsubscribeReports();
    };
  }, [user]);

  // Intercepting and forwarding incident updates (additions and deletions)
  const handleUpdateIncidents = async (nextIncidents: EmergencyIncident[]) => {
    if (!user) {
      setLocalIncidents(nextIncidents);
      return;
    }

    const path = 'incidents';
    try {
      const nextIds = new Set(nextIncidents.map(i => i.id));
      const currentIds = new Set(incidents.map(i => i.id));

      // 1. Items to remove
      const removedIds = incidents.filter(i => !nextIds.has(i.id)).map(i => i.id);
      for (const id of removedIds) {
        await deleteDoc(doc(db, path, id));
        addLog(`Emergency Incident ${id} successfully flagged RESOLVED in database.`, 'success');
      }

      // 2. Items to add
      const addedOrModified = nextIncidents.filter(i => !currentIds.has(i.id));
      for (const inc of addedOrModified) {
        const documentToPlay = {
          id: inc.id,
          type: inc.type,
          severity: inc.severity,
          zone: inc.zone,
          description: inc.description,
          authorId: user.uid,
          createdAt: serverTimestamp() // triggers request.time matching security rules
        };
        await setDoc(doc(db, path, inc.id), documentToPlay);
        addLog(`Dispatched priority emergency incident live to Cloud DB.`, 'warn');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Archive safety assessment certificate reports
  const handleSaveReport = async () => {
    if (!user) {
      addLog("Authorization requested: Please sign in to archive safety audit certificates.", "warn");
      return;
    }
    if (!report) {
      addLog("No active safety diagnosis report available to archive.", "warn");
      return;
    }
    setIsSavingReport(true);
    const path = 'safetyReports';
    const docId = `rep-${Date.now()}`;
    try {
      // Mandated strict schema size size limit 8 properties matching firestore.rules
      const reportPlay = {
        id: docId,
        riskLevel: report.riskLevel,
        dangerZones: report.dangerZones || [],
        aiRecommendations: report.aiRecommendations || [],
        emergencyActions: report.emergencyActions || [],
        predictedOutcome: report.predictedOutcome || "Normal flow metrics in place.",
        generatedAt: serverTimestamp(), // strictly matches request.time
        creatorId: user.uid
      };
      await setDoc(doc(db, path, docId), reportPlay);
      addLog(`Safety Audit Certificate ${docId} successfully archived to official cloud operations register.`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${docId}`);
    } finally {
      setIsSavingReport(false);
    }
  };

  // Custom presets operations
  const handleSavePreset = async (name: string, description: string) => {
    if (!user) return;
    const docId = `preset-${Date.now()}`;
    const path = 'savedPresets';
    try {
      // Mandated strict schema validation matching isValidPreset
      const presetPlay = {
        id: docId,
        name: name.substring(0, 60),
        description: description.substring(0, 280),
        weather,
        matchPhase,
        gates: gates.map(g => ({ id: g.id, count: g.count, isBlocked: g.isBlocked })),
        zones: zones.map(z => ({ id: z.id, occupancy: z.occupancy })),
        securityStaff,
        creatorId: user.uid,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, path, docId), presetPlay);
      addLog(`Successfully registered simulation setup "${name}" in DB.`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${docId}`);
    }
  };

  const handleDeletePreset = async (id: string) => {
    if (!user) return;
    const path = 'savedPresets';
    try {
      await deleteDoc(doc(db, path, id));
      addLog("Custom simulated preset purged from database.", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  // Perform AI Diagnostics Analyze by sending request to backend API
  const requestDiagnostics = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gates,
          zones,
          weather,
          matchPhase,
          incidents,
          securityStaff
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP diagnostics failure: ${response.status}`);
      }

      const parsedData = await response.json();
      setReport(parsedData);
      addLog(`AI Diagnostic completed. Risk evaluated to level: ${parsedData.riskLevel}`, parsedData.riskLevel === 'SAFE' ? 'success' : parsedData.riskLevel === 'MODERATE' ? 'info' : 'warn');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'Error executing server AI analysis routes.');
      addLog("Failed requesting autonomous AI diagnostics report. Live telemetry still processing.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Diagnostics on parameter mutations if automatic updating is enabled
  useEffect(() => {
    if (autoDiagnose) {
      const debouncedQuery = setTimeout(() => {
        requestDiagnostics();
      }, 700);
      return () => clearTimeout(debouncedQuery);
    }
  }, [gates, zones, weather, matchPhase, incidents, securityStaff, autoDiagnose]);

  // Handlers
  const handleToggleGateBlock = (id: number) => {
    const targetGate = gates.find(g => g.id === id);
    if (!targetGate) return;
    const nextState = !targetGate.isBlocked;
    addLog(`Gate ${id} ${nextState ? 'FORCED CLOSED / CHOKED' : 'OVERRIDE RELEASED'}`, nextState ? 'error' : 'success');

    let nextGates = gates.map(g => {
      if (g.id === id) {
        return { ...g, isBlocked: nextState, count: nextState ? 0 : Math.round(g.capacity * 0.7) };
      }
      return { ...g };
    });

    if (nextState) {
      // Redistribute blocked traffic of blocked gate to adjacent open gates
      const redistributedAmount = Math.floor(targetGate.count / 2);
      const leftNeighborId = id === 1 ? 8 : id - 1;
      const rightNeighborId = id === 8 ? 1 : id + 1;

      nextGates = nextGates.map(g => {
        if (g.id === leftNeighborId && !g.isBlocked) {
          const newFlow = Math.min(g.count + redistributedAmount, g.capacity + 40);
          addLog(`Diverted traffic to Gate ${g.id} raised flow rate to ${newFlow}/m.`, 'warn');
          return { ...g, count: newFlow };
        }
        if (g.id === rightNeighborId && !g.isBlocked) {
          const newFlow = Math.min(g.count + redistributedAmount, g.capacity + 40);
          addLog(`Diverted traffic to Gate ${g.id} raised flow rate to ${newFlow}/m.`, 'warn');
          return { ...g, count: newFlow };
        }
        return g;
      });
    }

    setGates(nextGates);
  };

  // Handle simulated evacuation ticking
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setZones(prevZones => {
        const remainingOccupancy = prevZones.reduce((sum, z) => sum + z.occupancy, 0);
        if (remainingOccupancy <= 0) {
          setIsSimulating(false);
          addLog("🟢 STADIUM EVACUATION DRILL COMPLETED. All sectors safely vacated & cleared.", "success");
          return prevZones;
        }

        const nextZones = prevZones.map(z => ({ ...z }));
        const gateToZoneMap: { [key: number]: string[] } = {
          1: ['E', 'A'],
          2: ['A', 'B'],
          3: ['B'],
          4: ['B', 'C'],
          5: ['C'],
          6: ['C', 'F', 'D'],
          7: ['D', 'F'],
          8: ['D', 'E', 'A']
        };

        let tickEvacuated = 0;

        gates.forEach(g => {
          if (g.isBlocked) return;

          // In a 30-sec step, flow is approx limit * 0.5
          let flowLimit = Math.floor((g.count * 0.5) * (0.9 + Math.random() * 0.2));
          if (flowLimit <= 0) return;

          const prioritizedZones = gateToZoneMap[g.id] || [];

          for (const zoneId of prioritizedZones) {
            const zIndex = nextZones.findIndex(nz => nz.id === zoneId);
            if (zIndex !== -1 && nextZones[zIndex].occupancy > 0) {
              const currentOcc = nextZones[zIndex].occupancy;
              const subtractable = Math.min(flowLimit, currentOcc);
              
              nextZones[zIndex].occupancy -= subtractable;
              flowLimit -= subtractable;
              tickEvacuated += subtractable;

              if (flowLimit <= 0) break;
            }
          }
        });

        if (tickEvacuated > 0) {
          setTotalEvacuated(prev => prev + tickEvacuated);
          setSecondsSimulated(prev => prev + 30);
        } else {
          setIsSimulating(false);
          addLog("🚨 CRITICAL WARNING: Stadium evacuation halted! Check for completely blocked or congested gates.", "error");
        }

        return nextZones;
      });

    }, 1000 / simSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, gates, simSpeed]);

  const handleLoadScenario = (scenario: PresetScenario) => {
    setWeather(scenario.weather);
    setMatchPhase(scenario.matchPhase);
    setSecurityStaff(scenario.securityStaff);
    
    // Map scenario gates
    const mappedGates = gates.map(g => {
      const pGate = scenario.gates.find(pg => pg.id === g.id);
      if (pGate) {
        return { ...g, count: pGate.count, isBlocked: pGate.isBlocked };
      }
      return g;
    });
    setGates(mappedGates);

    // Map scenario zones
    const mappedZones = zones.map(z => {
      const pZone = scenario.zones.find(pz => pz.id === z.id);
      if (pZone) {
        return { ...z, occupancy: pZone.occupancy };
      }
      return z;
    });
    setZones(mappedZones);
    handleUpdateIncidents(scenario.incidents || []);
    
    // Clear trigger actions
    setActionedRecs(new Set());

    addLog(`Preset configured: "${scenario.name}". Loading telemetry attributes.`, 'info');
  };

  // Sound cue simulation or action log trigger
  const executeSafetyRec = (rec: string) => {
    setActionedRecs(prev => {
      const next = new Set(prev);
      if (next.has(rec)) {
        next.delete(rec);
        addLog(`Canceled security recommendation directive: "${rec.substring(0, 45)}..."`, 'info');
      } else {
        next.add(rec);
        addLog(`EXECUTED DIRECTIVE to Operations Team: "${rec}"`, 'success');
      }
      return next;
    });
  };

  const getRiskColor = (risk: string | undefined) => {
    switch (risk) {
      case 'CRITICAL': return 'bg-rose-950 border-rose-500 text-rose-400';
      case 'HIGH': return 'bg-orange-950 border-orange-500 text-orange-400';
      case 'MODERATE': return 'bg-yellow-950 border-yellow-500/80 text-yellow-400';
      case 'SAFE':
      default:
        return 'bg-emerald-950 border-emerald-500 text-emerald-400';
    }
  };

  const getRiskLabelText = (risk: string | undefined) => {
    switch (risk) {
      case 'CRITICAL': return '🚨 CRITICAL SAFETY CONGESTION';
      case 'HIGH': return '⚠️ HIGH THREAT POTENTIAL';
      case 'MODERATE': return '⏳ MODERATE DELAY RISKS';
      case 'SAFE':
      default:
        return '🛡️ SECURE ENVIRONMENT ACTIVE';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white antialiased">
      
      {/* GLOSS TOP BANNER GIVING EMERGENCY PROTOCOL FEEL */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40" id="global-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-lg shadow-inner ring-1 ring-white/10">
              <Shield className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight font-mono">CrowdFlow Guardian AI</h1>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700 font-bold uppercase tracking-wider">v3.5 Live</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Oval Arena (85k cap) — Autonomous Response & Exit Dispatch System</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* DYNAMIC RETRIEVED DUTY SESSION COMPONENT */}
            <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-lg p-1.5 px-3">
              {isAuthLoading ? (
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">Assigning Officers...</span>
              ) : user ? (
                <div className="flex items-center space-x-2.5">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'Marshall'} className="h-5 w-5 rounded-full border border-indigo-500/50" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-mono text-white font-bold">
                      {user.displayName?.[0] || 'M'}
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <div className="text-[10px] font-mono font-bold leading-none truncate max-w-[90px] text-slate-200">
                      {user.displayName || user.email}
                    </div>
                    <div className="text-[8px] text-indigo-400 font-mono font-bold flex items-center space-x-1 mt-0.5">
                      <span className="h-1 w-1 bg-emerald-400 rounded-full inline-block animate-ping" />
                      <span>On-Duty Shift</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="text-[9px] bg-slate-950 font-mono hover:bg-slate-800 text-slate-400 border border-slate-800 hover:border-slate-700 p-1 px-2 rounded transition-all active:scale-95 cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleSignIn}
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-mono text-[10px] font-bold py-1 px-2.5 rounded shadow transition-all active:scale-95 cursor-pointer"
                >
                  <Shield className="h-3.5 w-3.5 text-indigo-300" />
                  <span>Marshall Google Login</span>
                </button>
              )}
            </div>

            {/* Auto update toggle */}
            <label className="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoDiagnose}
                onChange={(e) => setAutoDiagnose(e.target.checked)}
              />
              <div className="relative w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white" />
              <span className="ms-2.5 text-xs text-slate-400 font-mono hidden sm:inline">Auto Diagnose</span>
            </label>

            {/* Manual diagnose trigger */}
            <button
              onClick={requestDiagnostics}
              disabled={isLoading}
              className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              id="request-diagnostics-btn"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Diagnose</span>
            </button>
          </div>

        </div>
      </header>

      {/* THREE BAR DIAGNOSTIC OVERVIEW BLOCK */}
      <section className="bg-slate-900/20 border-b border-slate-900/60 p-4 font-mono text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2 bg-slate-900/40 p-2 border border-slate-800/40 rounded">
            <Users className="h-4 w-4 text-indigo-400" />
            <div>
              <span className="block text-[10px] text-slate-500 uppercase">Total Arena Burden</span>
              <span className="font-bold text-slate-200 text-sm">
                {zones.reduce((sum, z) => sum + z.occupancy, 0).toLocaleString()} <span className="text-xs text-slate-500">/ {zones.reduce((sum, z) => sum + z.capacity, 0).toLocaleString()} fans</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900/40 p-2 border border-slate-800/40 rounded">
            <Activity className="h-4 w-4 text-emerald-400" />
            <div>
              <span className="block text-[10px] text-slate-500 uppercase">Mean Gate Run Rate</span>
              <span className="font-bold text-slate-200 text-sm">
                {Math.round(gates.reduce((sum, g) => sum + g.count, 0) / gates.length)} p/min
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900/40 p-2 border border-slate-800/40 rounded">
            <Zap className="h-4 w-4 text-amber-400" />
            <div>
              <span className="block text-[10px] text-slate-500 uppercase">Egress Choke Status</span>
              <span className="font-bold text-slate-200 text-sm">
                {gates.filter(g => g.isBlocked).length > 0 
                  ? <span className="text-red-400 font-bold">{gates.filter(g => g.isBlocked).length} Gates Blocked</span> 
                  : <span className="text-emerald-400 font-bold">All Gates Clear</span>
                }
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900/40 p-2 border border-slate-800/40 rounded col-span-2 md:col-span-1">
            <span className="flex-1 text-slate-500 text-[10px] uppercase block">
              Match Stage: <span className="block font-bold text-indigo-300 mt-1 truncate">{matchPhase}</span>
            </span>
          </div>
        </div>
      </section>

      {/* CROWD EGRESS LIVE SIMULATION CONTROL ROOM */}
      <section className="bg-slate-950 border-b border-indigo-950/40 p-4" id="simulation-central-card">
        <div className="max-w-7xl mx-auto bg-slate-900/65 border border-indigo-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 w-full md:w-auto">
            <div className={`p-2.5 rounded-lg border flex items-center justify-center transition-all ${isSimulating ? 'bg-emerald-500/10 border-emerald-500/40 animate-pulse text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
              <Play className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className={`h-1.5 w-1.5 rounded-full ${isSimulating ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                  Simulation Controller: {isSimulating ? 'Egress Model Running' : 'Model Suspended'}
                </h4>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal max-w-md">
                Evacuate fans sequentially based on gateway rates. Simulating {Math.floor(secondsSimulated / 60)}m {secondsSimulated % 60}s of continuous dynamic egress flow.
              </p>
            </div>
          </div>

          {/* Progress bar info */}
          <div className="w-full md:w-56 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 font-bold">
              <span>EGRESS PROGRESS:</span>
              <span className="text-emerald-400">
                {initialFansDemand > 0 
                  ? Math.min(100, Math.round((totalEvacuated / initialFansDemand) * 100)) 
                  : 0}%
              </span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300" 
                style={{ width: `${Math.min(100, initialFansDemand > 0 ? (totalEvacuated / initialFansDemand) * 100 : 0)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>Evacuated: {totalEvacuated.toLocaleString()}</span>
              <span>Demand: {initialFansDemand.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
            <div className="flex items-center space-x-1 font-mono text-[9px] bg-slate-950 border border-slate-850 p-1 rounded-lg">
              <span className="text-slate-500 px-1 font-bold">RATE:</span>
              {([1, 2, 5, 10] as number[]).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSimSpeed(sp)}
                  className={`px-1.5 py-0.5 rounded font-extrabold cursor-pointer transition-colors ${simSpeed === sp ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {sp}x
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const isStarting = !isSimulating;
                setIsSimulating(isStarting);
                if (isStarting) {
                  const currentTotal = zones.reduce((sum, z) => sum + z.occupancy, 0);
                  if (currentTotal === 0) {
                    // Refill first!
                    setZones(INITIAL_ZONES);
                    setInitialFansDemand(INITIAL_ZONES.reduce((sum, z) => sum + z.occupancy, 0));
                    setTotalEvacuated(0);
                    setSecondsSimulated(0);
                    addLog("🔄 Auto-replenished seating sectors with 27,200 fans to initiate evacuation.", "info");
                  } else {
                    setInitialFansDemand(currentTotal);
                    setTotalEvacuated(0);
                    setSecondsSimulated(0);
                  }
                  addLog("▶️ Crowd egress physical simulation model initiated.", "success");
                } else {
                  addLog("⏸️ Crowd egress physical simulation paused.", "warn");
                }
              }}
              className={`flex items-center space-x-1.5 py-1.5 px-3.5 rounded-lg border font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isSimulating 
                  ? 'bg-rose-600/10 hover:bg-rose-600/20 border-rose-500/40 text-rose-300' 
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-200'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause Model</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Evacuate Arena</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsSimulating(false);
                setZones(INITIAL_ZONES);
                setTotalEvacuated(0);
                setSecondsSimulated(0);
                addLog("🔄 Evacuation parameters reset. Seating sectors replenished to peak standard.", "info");
              }}
              className="flex items-center space-x-1 py-1.5 px-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-mono transition-all active:scale-95 cursor-pointer"
              title="Reset Simulated Evacuation"
            >
              <span>Reset</span>
            </button>
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN DASHBOARD STAGE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* LEFT COMPONENT: STADIUM PLATFORM & LIVE OVERRIDES (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          
          <StadiumVisualizer
            gates={gates}
            zones={zones}
            incidents={incidents}
            weather={weather}
            onToggleGateBlock={handleToggleGateBlock}
            onSelectGate={setSelectedGateId}
            selectedGateId={selectedGateId}
          />

          {/* DYNAMIC BACKEND SIMULATED REAL-TIME CONSERVED LOGS PANEL */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex-1 flex flex-col min-h-[160px] max-h-[250px]" id="logs-console-card">
            <div className="flex justify-between items-center text-xs text-slate-400 font-mono tracking-wider mb-2 pb-2 border-b border-slate-850/60">
              <span className="flex items-center gap-1.5 text-slate-300 uppercase font-bold text-[11px]">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce" />
                Emergency Operations Audit Log
              </span>
              <span className="text-[10px] text-slate-500">Auto-Scrolling</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px] pr-1.5">
              {logs.map((log, index) => (
                <div key={index} className="flex space-x-2 border-l border-slate-800/40 pl-2">
                  <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                  <span className={`flex-1 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warn' ? 'text-orange-400' :
                    log.type === 'success' ? 'text-emerald-400 font-semibold' :
                    'text-slate-400'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COMPONENT: CONGESTION LOGIC CONTROLS & AI SYSTEM LOGIC REPORT (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          
          {/* AI DECISION ENGINE LOGIC CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col pt-0.5" id="ai-safety-report-panel">
            
            {/* Header banner containing current risk rating */}
            <div className={`p-4 border-b flex items-center justify-between transition-colors duration-300 ${report ? getRiskColor(report.riskLevel) : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">AI Diagnostic Safety Threat Level</span>
                <span className="font-bold font-mono tracking-tight text-sm mt-0.5">
                  {isLoading ? '🔄 EVALUATING LIVE TELEMETRIC MATRIX...' : report ? getRiskLabelText(report.riskLevel) : 'NO REPORT GENERATED'}
                </span>
              </div>
              <div className="p-1.5 rounded bg-white/10">
                <FileSignature className="h-4.5 w-4.5 text-white" />
              </div>
            </div>

            {/* Diagnostic Output Content */}
            <div className="p-5 flex-1 space-y-5 overflow-y-auto max-h-[460px]">
              
              {isLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 animate-pulse">
                  <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                  <div className="space-y-1.5 font-mono">
                    <p className="text-xs text-slate-300 font-bold">CrowdFlow Guardian Evaluating Scenario...</p>
                    <p className="text-[10px] text-slate-500 max-w-[280px] leading-relaxed mx-auto">Calculating localized density gradients, escape exit paths availability, weather friction, & deployment status.</p>
                  </div>
                </div>
              ) : report ? (
                <div className="space-y-4 text-xs font-mono divide-y divide-slate-800/60 select-text">
                  
                  {/* Danger zones itemized */}
                  <div className="pb-3.5" id="danger-zones-segment">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-2 font-mono flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      <span>Danger Zones Identfied</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {report.dangerZones && report.dangerZones.length > 0 ? (
                        report.dangerZones.map((zone, idx) => (
                          <span 
                            key={idx} 
                            className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-2.5 py-1 rounded text-[10px] flex items-center space-x-1"
                          >
                            <AlertTriangle className="h-3 w-3 text-rose-400 inline" />
                            <span>{zone}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 text-[11px]">No immediate dangerously overloaded zones reported.</span>
                      )}
                    </div>
                  </div>

                  {/* AI Crowd routing recommendations list */}
                  <div className="py-3.5" id="recommendations-segment">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-2 flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>AI Routing Recommendations</span>
                    </span>
                    <p className="text-[10px] text-slate-500 mb-1 font-sans">Click on any instruction tag to dispatch orders to stewards:</p>
                    {report.aiRecommendations && report.aiRecommendations.length > 0 ? (
                      <ul className="space-y-2 mt-2">
                        {report.aiRecommendations.map((rec, idx) => {
                          const actioned = actionedRecs.has(rec);
                          return (
                            <li 
                              key={idx} 
                              className={`p-2 border rounded-lg cursor-pointer transition-all ${
                                actioned 
                                  ? 'bg-slate-900 border-emerald-500/50 text-slate-400 line-through' 
                                  : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40 text-slate-300'
                              }`}
                              onClick={() => executeSafetyRec(rec)}
                            >
                              <div className="flex items-start space-x-2">
                                <span className={`h-4 w-4 rounded-full border text-[9px] flex items-center justify-center mt-0.5 ${
                                  actioned ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="flex-1 font-sans text-[11px] leading-snug">{rec}</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-slate-500 text-[10px]">No major flow adjustments requested.</p>
                    )}
                  </div>

                  {/* Emergency Actions directives */}
                  <div className="py-3.5" id="emergency-actions-segment">
                    <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block mb-2 flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span>Crisis Emergency Actions</span>
                    </span>
                    {report.emergencyActions && report.emergencyActions.length > 0 ? (
                      <ul className="space-y-1.5">
                        {report.emergencyActions.map((action, idx) => {
                          const isActioned = actionedRecs.has(action);
                          return (
                            <li 
                              key={idx} 
                              onClick={() => executeSafetyRec(action)}
                              className={`p-2 rounded-lg border cursor-pointer transition-all text-xs font-sans text-slate-300 flex items-start space-x-2 ${
                                isActioned 
                                  ? 'bg-slate-900 border-amber-500/50 text-slate-400 line-through'
                                  : 'bg-slate-950 border-slate-800 hover:border-amber-500/30'
                              }`}
                            >
                              <span className="text-amber-500 mt-0.5">⚠️</span>
                              <span className="flex-1 text-[11px] leading-snug">{action}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-slate-500 text-[10px]">No emergency alerts raised. Standard monitoring.</p>
                    )}
                  </div>

                  {/* Predictive outcome explanation */}
                  <div className="pt-3.5" id="predicted-outcome-segment">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-2 flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>Simulated Crowdflow Exit Outcome</span>
                    </span>
                    <p className="text-[11px] font-sans text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-850">
                      {report.predictedOutcome || "Evaluating simulation variables to lock down crowd egress timings metrics."}
                    </p>
                  </div>

                  {/* Archval Commit Button */}
                  {user && (
                    <div className="pt-3.5 pb-1 border-t border-slate-800/60 flex items-center justify-between gap-2.5 font-sans">
                      <div className="text-[10px] text-slate-500 max-w-[180px] leading-relaxed">
                        Log this evaluation certificate into the permanent cloud register.
                      </div>
                      <button
                        onClick={handleSaveReport}
                        disabled={isSavingReport}
                        className="flex items-center space-x-1.5 py-1.5 px-3 bg-gradient-to-r from-indigo-600/30 to-violet-600/30 hover:from-indigo-600/50 hover:to-violet-600/50 border border-indigo-500/30 hover:border-indigo-500/60 rounded text-indigo-300 hover:text-white text-[10px] font-mono tracking-tight transition-all font-bold cursor-pointer disabled:opacity-40"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{isSavingReport ? 'Archiving...' : 'Archive Report'}</span>
                      </button>
                    </div>
                  )}

                  {/* Timestamp report stamp */}
                  {report.generatedAt && (
                    <div className="pt-2 text-right select-none">
                      <span className="text-[9px] text-slate-500 italic block">Safety Certificate Generated At: {new Date(report.generatedAt).toLocaleString()}</span>
                    </div>
                  )}

                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                  <HelpCircle className="h-9 w-9 text-slate-600" />
                  <p className="text-xs text-slate-400 max-w-[240px] font-sans mx-auto leading-relaxed">No telemetry scenario analyzed. Select one of the operations presets below to begin crowd modeling.</p>
                </div>
              )}

            </div>

            {/* Offline logic disclaimer message */}
            <div className="bg-slate-950/90 border-t border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono select-none">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full inline-block" />
                Security Gateway Configured
              </span>
              <span>The Oval Arena Logistics Command</span>
            </div>

          </div>

          {/* HISTORIC VERIFIED AUDITS REGISTRY */}
          {user && historicReports.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex flex-col animate-fadeIn" id="historic-ledgers-register">
              <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-wider mb-3">
                <FileSignature className="h-4 w-4" />
                <span>Certified Safety Ledger Archives</span>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {historicReports.map((rep) => {
                  const certTime = formatFirestoreTimestamp(rep.generatedAt);
                  return (
                    <div key={rep.id} className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-[11px] font-mono space-y-1">
                      <div className="flex justify-between items-center select-none">
                        <span className="font-bold text-slate-400 text-[10px]">Registry Certificate {rep.id}</span>
                        <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] tracking-wider ${
                          rep.riskLevel === 'CRITICAL' ? 'bg-rose-950/60 text-rose-400' :
                          rep.riskLevel === 'HIGH' ? 'bg-orange-950/60 text-orange-400' :
                          rep.riskLevel === 'MODERATE' ? 'bg-yellow-950/60 text-yellow-400' :
                          'bg-emerald-950/60 text-emerald-400'
                        }`}>
                          {rep.riskLevel} RISK
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-2 mt-1 select-text">
                        {rep.predictedOutcome}
                      </p>
                      <div className="text-[9px] text-slate-500 flex justify-between items-center select-none pt-1 border-t border-slate-900/40">
                        <span>Logged: {certTime}</span>
                        <span className="text-slate-600">Auditor ID: {rep.creatorId?.substring(0, 6)}...</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DYNAMIC TELEMETRY SCENARIOS & OPERATIONAL CONTROLS */}
          <ControlPanel
            state={{
              gates,
              zones,
              weather,
              matchPhase,
              incidents,
              securityStaff
            }}
            selectedGateId={selectedGateId}
            onUpdateGates={setGates}
            onUpdateZones={setZones}
            onUpdateWeather={setWeather}
            onUpdateMatchPhase={setMatchPhase}
            onUpdateIncidents={handleUpdateIncidents}
            onUpdateSecurityStaff={setSecurityStaff}
            onLoadScenario={handleLoadScenario}
            dbPresets={dbPresets}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
            userUid={user?.uid}
          />

        </div>

      </main>

      {/* FOOTER */}
      <footer className="mt-auto py-5 bg-slate-950/40 border-t border-slate-900 text-center text-[11px] text-slate-600 font-mono tracking-wide">
        <p>© 2026 CrowdFlow Guardian AI • Authorized Stadium Marshall Command Panel. All simulated crowd behaviors conform with safety regulations.</p>
      </footer>

    </div>
  );
}
