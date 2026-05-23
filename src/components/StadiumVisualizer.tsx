import React, { useEffect, useRef, useState } from 'react';
import { GateTelemetry, ZoneTelemetry, EmergencyIncident } from '../types';
import { AlertCircle, ShieldAlert, CheckCircle2, CloudLightning } from 'lucide-react';

interface StadiumVisualizerProps {
  gates: GateTelemetry[];
  zones: ZoneTelemetry[];
  incidents: EmergencyIncident[];
  weather: string;
  onToggleGateBlock: (id: number) => void;
  onSelectGate: (id: number) => void;
  selectedGateId: number | null;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  zoneId: string;
  gateId: number;
  progress: number; // 0 to 1
  speed: number;
  color: string;
}

export default function StadiumVisualizer({
  gates,
  zones,
  incidents,
  weather,
  onToggleGateBlock,
  onSelectGate,
  selectedGateId,
}: StadiumVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  // Setup animated particles representing dynamic crowd dispersion to nearest gates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let particleIdCounter = 0;

    // Define center of the elliptical stadium in canvas coordinate space (300, 200)
    const centerX = 320;
    const centerY = 220;

    // Radius parameters for tiers
    const pRadiusX = 135;
    const pRadiusY = 100;

    // Coordinates mapping for zones around the field center
    const zoneAngles: { [key: string]: { start: number; end: number; name: string } } = {
      'A': { start: -Math.PI / 2 - 0.5, end: -Math.PI / 2 + 0.5, name: 'North Stand' },
      'B': { start: -0.5, end: 0.5, name: 'East General' },
      'C': { start: Math.PI / 2 - 0.5, end: Math.PI / 2 + 0.5, name: 'South Premium' },
      'D': { start: Math.PI - 0.5, end: Math.PI + 0.5, name: 'West General' },
      'E': { start: -Math.PI / 2 - 1.2, end: -Math.PI / 2 - 0.6, name: 'Clubhouse' },
      'F': { start: Math.PI / 2 + 0.6, end: Math.PI / 2 + 1.2, name: 'Pavilion Tier' },
    };

    // Gate angles visually distributed in oval boundary
    const gatePositions = [
      { id: 1, angle: -Math.PI / 2, name: 'Gate 1' },
      { id: 2, angle: -Math.PI / 4, name: 'Gate 2' },
      { id: 3, angle: 0, name: 'Gate 3' },
      { id: 4, angle: Math.PI / 4, name: 'Gate 4' },
      { id: 5, angle: Math.PI / 2, name: 'Gate 5' },
      { id: 6, angle: 3 * Math.PI / 4, name: 'Gate 6' },
      { id: 7, angle: Math.PI, name: 'Gate 7' },
      { id: 8, angle: -3 * Math.PI / 4, name: 'Gate 8' },
    ];

    const generateParticles = () => {
      // Determine flow rates based on stadium occupancy and weather constraints
      const activeIncidents = incidents.filter(i => i.type !== 'None');
      const isSevereWeather = weather === 'Rainy' || weather === 'Thunderstorm';
      const maxSpawn = isSevereWeather ? 4 : 2;

      zones.forEach(zone => {
        const occupancyRate = zone.occupancy / zone.capacity;
        if (occupancyRate > 0.1 && Math.random() < occupancyRate * 0.15) {
          // Find closest unblocked gates for this zone
          const zAngles = zoneAngles[zone.id];
          if (!zAngles) return;
          const avgAngle = (zAngles.start + zAngles.end) / 2;

          const availableGates = gates.filter(g => !g.isBlocked);
          if (availableGates.length === 0) return;

          // Find gate with closest angle
          let bestGate = availableGates[0];
          let minDiff = Infinity;
          availableGates.forEach(g => {
            const gPos = gatePositions.find(p => p.id === g.id);
            if (gPos) {
              const diff = Math.abs(Math.atan2(Math.sin(gPos.angle - avgAngle), Math.cos(gPos.angle - avgAngle)));
              if (diff < minDiff) {
                minDiff = diff;
                bestGate = g;
              }
            }
          });

          // Generate state
          const angle = zAngles.start + Math.random() * (zAngles.end - zAngles.start);
          const startDistX = pRadiusX * (0.6 + Math.random() * 0.35);
          const startDistY = pRadiusY * (0.6 + Math.random() * 0.35);

          const startX = centerX + startDistX * Math.cos(angle);
          const startY = centerY + startDistY * Math.sin(angle);

          // Find gate pos targets
          const gatePos = gatePositions.find(p => p.id === bestGate.id);
          const targetAngle = gatePos ? gatePos.angle : avgAngle;
          const targetX = centerX + (pRadiusX * 1.55) * Math.cos(targetAngle);
          const targetY = centerY + (pRadiusY * 1.55) * Math.sin(targetAngle);

          // Coloring based on zone status
          let color = 'rgba(74, 222, 128, 0.45)'; // Green
          if (occupancyRate > 0.85) color = 'rgba(239, 68, 68, 0.65)'; // Red
          else if (occupancyRate > 0.6) color = 'rgba(249, 115, 22, 0.55)'; // Orange

          if (particles.length < 120) {
            particles.push({
              id: particleIdCounter++,
              x: startX,
              y: startY,
              vx: startX,
              vy: startY,
              zoneId: zone.id,
              gateId: bestGate.id,
              progress: 0,
              speed: 0.004 + Math.random() * 0.007 + (activeIncidents.length * 0.002),
              color
            });
          }
        }
      });
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Generate next frame's particles
      generateParticles();

      // Update and draw flow particles
      particles.forEach((p, index) => {
        p.progress += p.speed;
        if (p.progress >= 1) {
          particles.splice(index, 1);
          return;
        }

        // Target gate coordinate
        const gatePos = gatePositions.find(gp => gp.id === p.gateId);
        const targetAngle = gatePos ? gatePos.angle : 0;
        const targetX = centerX + (pRadiusX * 1.5) * Math.cos(targetAngle);
        const targetY = centerY + (pRadiusY * 1.5) * Math.sin(targetAngle);

        // Cubic bezier or quadratic curve curve towards gate for natural flow visual
        const cx = p.vx + (targetX - p.vx) * p.progress;
        const cy = p.vy + (targetY - p.vy) * p.progress;

        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [zones, gates, incidents, weather]);

  const getZoneColor = (occupancyLimit: number) => {
    if (occupancyLimit >= 0.9) return 'fill-rose-500/30 stroke-rose-400 hover:fill-rose-500/40';
    if (occupancyLimit >= 0.75) return 'fill-orange-500/30 stroke-orange-400 hover:fill-orange-500/40';
    if (occupancyLimit >= 0.5) return 'fill-yellow-500/20 stroke-yellow-400 hover:fill-yellow-500/30';
    return 'fill-emerald-500/10 stroke-emerald-500/40 hover:fill-emerald-500/25';
  };

  const getGateBlockStyle = (gate: GateTelemetry) => {
    if (gate.isBlocked) return 'bg-red-500/20 border-red-500 text-red-400 shadow-red-500/10';
    if (gate.count > gate.capacity) return 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-amber-500/10';
    return 'bg-slate-900/80 border-slate-700 hover:border-emerald-500 text-slate-300';
  };

  return (
    <div className="relative border border-slate-800/80 rounded-xl bg-slate-950/70 backdrop-blur-md p-6 h-full flex flex-col justify-between overflow-hidden" id="stadium-visualizer-card">
      {/* Stadium Card Header */}
      <div className="flex items-center justify-between mb-2 border-b border-slate-800/60 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="font-mono text-sm tracking-wider text-slate-400 uppercase">Live Arena Floor Plan</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Click zones or gates below to inspect or trigger overrides</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400">
          <CloudLightning className="h-3.5 w-3.5 text-sky-400" />
          <span>Atmos: {weather}</span>
        </div>
      </div>

      {/* Main Stadium SVG Arena Container */}
      <div className="relative flex-1 flex items-center justify-center min-h-[360px]" ref={containerRef}>
        {/* Animated canvas underneath SVG to display crowd flows */}
        <canvas
          ref={canvasRef}
          width={640}
          height={440}
          className="absolute inset-0 pointer-events-none z-10 w-full h-full"
        />

        <svg
          viewBox="0 0 640 440"
          className="w-full max-w-[620px] aspect-[64/44] relative z-20"
          id="stadium-vector"
        >
          {/* Defs for glossy background glow effects */}
          <defs>
            <radialGradient id="fieldGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
            <filter id="neonSiren">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grass Pitch Ellipse (Green Field) */}
          <ellipse cx="320" cy="220" rx="90" ry="60" className="fill-emerald-950/45 stroke-emerald-500/20 stroke-2" />
          <ellipse cx="320" cy="220" rx="90" ry="60" fill="url(#fieldGlow)" />
          
          {/* Cricket Pitch center wickets rectangle */}
          <rect x="312" y="202" width="16" height="36" className="fill-amber-600/20 stroke-amber-500/10" />
          
          {/* Radial divisions - Inner boundary ring */}
          <ellipse cx="320" cy="220" rx="140" ry="104" className="fill-none stroke-slate-800/60 stroke-dashed" />

          {/* SEATING ZONES GEOMETRY (Interactive SVG Paths) */}
          {/* Zone A: North (Top Center) */}
          <path
            d="M 230 145 A 140 105 0 0 1 410 145 L 434 116 A 176 132 0 0 0 206 116 Z"
            className={`${getZoneColor((zones.find(z => z.id === 'A')?.occupancy || 0) / (zones.find(z => z.id === 'A')?.capacity || 1))} transition-colors duration-200 stroke-2 cursor-pointer`}
            onMouseEnter={() => setHoveredZone('A')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="320" y="112" className="fill-slate-400 text-[10px] font-mono select-none pointer-events-none text-center" textAnchor="middle">Zone A</text>

          {/* Zone E: Clubhouse (Top Left) */}
          <path
            d="M 148 180 A 140 105 0 0 1 230 145 L 206 116 A 176 132 0 0 0 111 155 Z"
            className={`${getZoneColor((zones.find(z => z.id === 'E')?.occupancy || 0) / (zones.find(z => z.id === 'E')?.capacity || 1))} transition-colors duration-200 stroke-2 cursor-pointer`}
            onMouseEnter={() => setHoveredZone('E')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="165" y="132" className="fill-slate-400 text-[10px] font-mono select-none pointer-events-none" textAnchor="middle">Zone E</text>

          {/* Zone B: East Stand (Right) */}
          <path
            d="M 410 145 A 140 105 0 0 1 410 295 L 434 324 A 176 132 0 0 0 434 116 Z"
            className={`${getZoneColor((zones.find(z => z.id === 'B')?.occupancy || 0) / (zones.find(z => z.id === 'B')?.capacity || 1))} transition-colors duration-200 stroke-2 cursor-pointer`}
            onMouseEnter={() => setHoveredZone('B')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="440" y="224" className="fill-slate-400 text-[10px] font-mono select-none pointer-events-none" textAnchor="middle">Zone B</text>

          {/* Zone C: South Premium (Bottom Center) */}
          <path
            d="M 230 295 A 140 105 0 0 0 410 295 L 434 324 A 176 132 0 0 1 206 324 Z"
            className={`${getZoneColor((zones.find(z => z.id === 'C')?.occupancy || 0) / (zones.find(z => z.id === 'C')?.capacity || 1))} transition-colors duration-200 stroke-2 cursor-pointer`}
            onMouseEnter={() => setHoveredZone('C')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="320" y="338" className="fill-slate-400 text-[10px] font-mono select-none pointer-events-none" textAnchor="middle">Zone C</text>

          {/* Zone F: Pavilion (Bottom Left) */}
          <path
            d="M 148 260 A 140 105 0 0 0 230 295 L 206 324 A 176 132 0 0 1 111 285 Z"
            className={`${getZoneColor((zones.find(z => z.id === 'F')?.occupancy || 0) / (zones.find(z => z.id === 'F')?.capacity || 1))} transition-colors duration-200 stroke-2 cursor-pointer`}
            onMouseEnter={() => setHoveredZone('F')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="165" y="312" className="fill-slate-400 text-[10px] font-mono select-none pointer-events-none" textAnchor="middle">Zone F</text>

          {/* Zone D: West Stand (Left) */}
          <path
            d="M 148 180 A 140 105 0 0 0 148 260 L 111 285 A 176 132 0 0 1 111 155 Z"
            className={`${getZoneColor((zones.find(z => z.id === 'D')?.occupancy || 0) / (zones.find(z => z.id === 'D')?.capacity || 1))} transition-colors duration-200 stroke-2 cursor-pointer`}
            onMouseEnter={() => setHoveredZone('D')}
            onMouseLeave={() => setHoveredZone(null)}
          />
          <text x="100" y="224" className="fill-slate-400 text-[10px] font-mono select-none pointer-events-none" textAnchor="middle">Zone D</text>

          {/* Outer Ring Barrier Fence */}
          <ellipse cx="320" cy="220" rx="190" ry="142" className="fill-none stroke-slate-800 stroke-2" />

          {/* INCIDENT PULSING HAZARDS */}
          {incidents.filter(i => i.type !== 'None').map((inc) => {
            // Pick a coordinate inside the stadium zone
            let rx = 320;
            let ry = 220;
            if (inc.zone.includes('Zone A')) { rx = 320; ry = 135; }
            else if (inc.zone.includes('Zone B')) { rx = 415; ry = 220; }
            else if (inc.zone.includes('Zone C')) { rx = 320; ry = 305; }
            else if (inc.zone.includes('Zone D')) { rx = 125; ry = 220; }
            else if (inc.zone.includes('Zone E')) { rx = 180; ry = 145; }
            else if (inc.zone.includes('Zone F')) { rx = 180; ry = 300; }
            else if (inc.zone.includes('Gate 1')) { rx = 320; ry = 62; }
            else if (inc.zone.includes('Gate 2')) { rx = 445; ry = 112; }
            else if (inc.zone.includes('Gate 3')) { rx = 525; ry = 220; }
            else if (inc.zone.includes('Gate 4')) { rx = 445; ry = 322; }
            else if (inc.zone.includes('Gate 5')) { rx = 320; ry = 378; }
            else if (inc.zone.includes('Gate 6')) { rx = 195; ry = 322; }
            else if (inc.zone.includes('Gate 7')) { rx = 115; ry = 220; }
            else if (inc.zone.includes('Gate 8')) { rx = 195; ry = 112; }

            return (
              <g key={inc.id} className="cursor-help">
                <circle cx={rx} cy={ry} r="16" className="fill-rose-500/20 animate-ping" />
                <circle cx={rx} cy={ry} r="8" className="fill-rose-600 stroke-white stroke" filter="url(#neonSiren)" />
                <path d={`M ${rx-3} ${ry+2.5} L ${rx} ${ry-3.5} L ${rx+3} ${ry+2.5} Z`} className="fill-white stroke-white stroke-[0.3]" />
                <title>{`ALERT: ${inc.type} (Severity: ${inc.severity}) - ${inc.description}`}</title>
              </g>
            );
          })}
        </svg>

        {/* Floating details overlay for Hovered Zone */}
        {hoveredZone && (() => {
          const z = zones.find(item => item.id === hoveredZone);
          if (!z) return null;
          const pct = Math.round((z.occupancy / z.capacity) * 100);
          return (
            <div className="absolute top-4 left-4 bg-slate-900/95 border border-slate-700/80 rounded px-3 py-2 z-30 font-mono text-xs shadow-xl min-w-[170px] pointer-events-none animate-fadeIn">
              <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1.5 flex justify-between items-center">
                <span>{z.name}</span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${pct > 85 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/35' : pct > 60 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/35' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  Zone {z.id}
                </span>
              </div>
              <div className="flex justify-between mt-1 text-slate-400">
                <span>Occupancy:</span>
                <span className="font-bold text-slate-200">{z.occupancy.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Capacity limit:</span>
                <span>{z.capacity.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="text-right text-[10px] mt-1 font-bold text-slate-400">
                Density: {pct}%
              </div>
            </div>
          );
        })()}
      </div>

      {/* Grid of Peripheral gates for fast details & overrides */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        {gates.map((g) => {
          const isSelected = selectedGateId === g.id;
          const occupancyRate = g.count / g.capacity;
          return (
            <div
              key={g.id}
              className={`p-2 border rounded-lg flex flex-col justify-between cursor-pointer transition-all duration-200 ${getGateBlockStyle(g)} ${
                isSelected ? 'ring-2 ring-emerald-500 border-transparent scale-[1.02] bg-slate-900' : ''
              }`}
              onClick={() => onSelectGate(g.id)}
              id={`gate-inspect-${g.id}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 font-mono">Gate {g.id}</span>
                {g.isBlocked ? (
                  <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                ) : occupancyRate > 1.0 ? (
                  <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                ) : (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </div>

              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400">Flow rate:</span>
                <span className={`font-bold font-mono text-xs ${g.isBlocked ? 'text-red-400 line-through' : occupancyRate > 1.0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {g.isBlocked ? 'CHOKED' : `${g.count}/m`}
                </span>
              </div>

              {/* Quick block toggle button wrapper */}
              <button
                type="button"
                className={`mt-2 py-1 px-1.5 rounded text-[10px] uppercase font-bold text-center transition-colors border ${
                  g.isBlocked
                    ? 'bg-red-500/20 hover:bg-emerald-500/30 border-red-500/50 text-red-200'
                    : 'bg-slate-950/60 hover:bg-red-500/30 border-slate-800 text-slate-400 hover:text-red-200'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleGateBlock(g.id);
                }}
              >
                {g.isBlocked ? 'UNBLOCK' : 'FORCE BLOCK'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
