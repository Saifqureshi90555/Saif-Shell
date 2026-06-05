import React, { useState, useEffect, useMemo, useRef, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { SimulatorEngine } from './EngineBridge';
import { HexWallScene } from './HexWallScene';
import { Sun, Volume2 } from 'lucide-react';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center p-6">
        <div className="max-w-xl rounded-3xl border border-red-500/30 bg-black/90 p-10 shadow-2xl shadow-red-500/20 text-center">
          <h1 className="text-3xl font-bold uppercase text-red-400 mb-4">C++ WASM Backend Required</h1>
          <p className="text-slate-300 mb-4">The app cannot run without the compiled C++ WebAssembly backend. No JavaScript fallback is permitted.</p>
          <p className="text-slate-400 text-sm font-mono">Please provide <span className="text-amber-300">/src/wasm/saif_shell.js</span> and reload.</p>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// No audio; visual-only simulation (sun + sound)

// No camera shake

function SimContent() {
  const simulator = useMemo(() => new SimulatorEngine(16, 22, 4.5), []);
  const simulatorRef = React.useRef(simulator);
  const [sunPos, setSunPos] = useState<[number, number, number]>([0, 100, 50]);
  const [noisePos, setNoisePos] = useState<[number, number, number]>([80, 0, 100]);
  const [insideNoise, setInsideNoise] = useState(0);
  const [averageTemperature, setAverageTemperature] = useState(20);
  const [backendName, setBackendName] = useState('Initializing...');
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<'sun' | 'noise'>('sun');
  const sunIntensity = 280000;
  const noiseIntensity = 280000;

  useEffect(() => {
    setBackendName(simulatorRef.current.getBackendName());
  }, []);

  useEffect(() => {
    const simHz = 60;
    const simInterval = 1000 / simHz;

    const tickFn = () => {
      simulatorRef.current.setSunLighting(sunPos[0], sunPos[1], sunPos[2], activeMode === 'sun' ? sunIntensity : 0);
      simulatorRef.current.setNoiseSource(noisePos[0], noisePos[1], noisePos[2], activeMode === 'noise' ? noiseIntensity : 0);
      simulatorRef.current.tick();
    };

    const updateMetrics = () => {
      const allGrids = simulatorRef.current.getGrids();
      let nextAvgTemp = averageTemperature;
      if (allGrids.length > 0) {
        const tempSum = allGrids.reduce((sum, g) => sum + g.temperature, 0);
        nextAvgTemp = tempSum / allGrids.length;
        setAverageTemperature(nextAvgTemp);
      }
      const nextInsideNoise = simulatorRef.current.getInsideNoiseLevel();
      setInsideNoise(nextInsideNoise);
      const nextBackendName = simulatorRef.current.getBackendName();
      setBackendName(nextBackendName);

      const sampleGrid = allGrids[Math.floor(allGrids.length / 2)];
      const sampleLine = sampleGrid
        ? `GRID[${sampleGrid.id}] SND ${sampleGrid.soundLevel.toFixed(1)}°C T ${sampleGrid.temperature.toFixed(1)}`
        : 'GRID data unavailable';

      setStatusLines([
        `BACKEND: ${nextBackendName}`,
        `MODE: ${activeMode.toUpperCase()}`,
        `SUN POS: ${sunPos.map(v => v.toFixed(0)).join(', ')}`,
        `NOISE POS: ${noisePos.map(v => v.toFixed(0)).join(', ')}`,
        `AVG TEMP: ${nextAvgTemp.toFixed(1)}°C`,
        `INSIDE NOISE: ${nextInsideNoise.toFixed(1)}`,
        sampleLine,
      ]);
    };

    tickFn();
    updateMetrics();
    const simTimer = setInterval(tickFn, simInterval);
    const hudTimer = setInterval(updateMetrics, 100);

    return () => { clearInterval(simTimer); clearInterval(hudTimer); };
  }, [sunPos, noisePos, activeMode]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-[#050816] via-[#121827] to-[#1f2937] overflow-hidden font-sans text-slate-100">
      <div className="absolute inset-0 z-0">
        <Canvas shadows={false} dpr={1} gl={{ antialias: true, stencil: false, powerPreference: "high-performance" }}>
          <color attach="background" args={["#080913"]} />
          <PerspectiveCamera makeDefault position={[0, 80, 220]} fov={28} />
          <ambientLight intensity={0.92} color="#f8fafc" />
          <hemisphereLight skyColor="#fef3c7" groundColor="#070b16" intensity={0.8} />
          <directionalLight intensity={1.9} position={[20, 160, 140]} color="#fb923c" />
          <directionalLight intensity={0.45} position={[-120, 60, 80]} color="#fbd38d" />
          <HexWallScene sunPos={sunPos} noisePos={noisePos} activeMode={activeMode} maxVisible={352} performanceMode={false} simulator={simulatorRef.current} statusLines={statusLines} />
          <OrbitControls makeDefault enablePan enableZoom enableRotate enableDamping={false} target={[0, 16, 0]} />
        </Canvas>
      </div>

      <div className="absolute bottom-6 right-6 z-40 pointer-events-auto bg-slate-950/80 p-4 rounded-3xl backdrop-blur-xl border border-slate-700/80 shadow-xl text-slate-100 max-w-[280px]">
        <div className="flex gap-2 items-center mb-3">
          <button onClick={() => setActiveMode('sun')} className={`flex-1 px-3 py-2 rounded-full text-sm font-semibold transition ${activeMode === 'sun' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'}`}><Sun className="inline mr-2" /> Sun</button>
          <button onClick={() => setActiveMode('noise')} className={`flex-1 px-3 py-2 rounded-full text-sm font-semibold transition ${activeMode === 'noise' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'}`}><Volume2 className="inline mr-2" /> Sound</button>
        </div>

        <div className="grid gap-2 text-sm text-slate-300 mb-3">
          <div className="flex justify-between items-center"><span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Mode</span><span className="font-semibold text-slate-100 uppercase">{activeMode}</span></div>
        </div>

        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Move {activeMode === 'sun' ? 'Sun' : 'Sound'}</div>
        {['X', 'Y', 'Z'].map((axis, index) => {
          const pos = activeMode === 'sun' ? sunPos : noisePos;
          const setter = activeMode === 'sun' ? setSunPos : setNoisePos;
          const min = axis === 'Y' ? -20 : -120;
          const max = axis === 'Y' ? 120 : 120;
          return (
            <div key={axis} className="mb-3">
              <div className="flex justify-between text-[11px] text-slate-400 uppercase mb-1"><span>{axis}</span><span>{Math.round(pos[index])}</span></div>
              <input type="range" min={min} max={max} value={pos[index]} onChange={e => {
                const next = [...pos] as [number, number, number];
                next[index] = Number(e.target.value);
                setter(next);
              }} className="w-full accent-amber-400" />
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default function App() { return <ErrorBoundary><SimContent /></ErrorBoundary>; }
