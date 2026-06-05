import { Vector3 } from 'three';

// Minimal plain-JS HexGrid shape used by React rendering code
export type HexGrid = {
    id: number;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    temperature: number;
    soundLevel: number;
    isReflectingHeat: boolean;
    isTrappingSound: boolean;
    acousticBlockingFactor: number;
    mechanicalFoldAngle: number;
};

// Wrapper that uses the compiled C++ (emscripten/embind) Simulator exclusively.
// If the WASM module isn't loaded, the app fails explicitly instead of using JS fallback.
export class SimulatorEngine {
    private useWasm: boolean = false;
    private wasmSim: any = null; // emscripten Simulator instance
    private gridsCache: HexGrid[] = [];
    private rows = 0;
    private cols = 0;
    private radius = 0;
    private positionOffset = { x: 0, y: 0, z: 0 };
    private positionScale = { x: 1, y: 1, z: 1 };
    private positionBias = { x: 0, y: 0, z: 0 };
    private lastCentroid = { x: 0, y: 0, z: 0 };
    private lastSunVisual = { x: 0, y: 0, z: 0 };
    private lastNoiseVisual = { x: 0, y: 0, z: 0 };

    constructor(rows: number, cols: number, radius: number) {
        this.rows = rows; this.cols = cols; this.radius = radius;
        const M = (window as any).Module;
        if (!M || !M.Simulator) {
            throw new Error('C++ WASM backend is required but unavailable. Ensure /src/wasm/saif_shell.js is loaded and exports Simulator.');
        }

        try {
            this.wasmSim = new M.Simulator(rows, cols, radius);
            this.useWasm = true;
            this.syncFromWasm();
        } catch (e) {
            console.error('WASM Simulator instantiation failed', e);
            throw new Error('Failed to instantiate C++ WASM Simulator. Check the compiled backend and browser console for details.');
        }
    }

    setSunLighting(x: number, y: number, z: number, intensity: number) {
        if (!this.wasmSim) throw new Error('WASM simulator unavailable');
        this.lastSunVisual = { x, y, z };
        // Translate incoming visual coordinates back to original WASM world coordinates using computed offset
        const tx = x - (this.positionOffset?.x || 0);
        const ty = y - (this.positionOffset?.y || 0);
        const tz = z - (this.positionOffset?.z || 0);
        if (typeof console !== 'undefined') console.log('setSunLighting: visual=', { x, y, z }, 'translated-to-wasm=', { tx, ty, tz }, 'positionOffset=', this.positionOffset);
        return this.wasmSim.setSunLighting(tx, ty, tz, intensity);
    }

    setNoiseSource(x: number, y: number, z: number, intensity: number) {
        if (!this.wasmSim) throw new Error('WASM simulator unavailable');
        this.lastNoiseVisual = { x, y, z };
        const tx = x - (this.positionOffset?.x || 0);
        const ty = y - (this.positionOffset?.y || 0);
        const tz = z - (this.positionOffset?.z || 0);
        if (typeof console !== 'undefined') console.log('setNoiseSource: visual=', { x, y, z }, 'translated-to-wasm=', { tx, ty, tz }, 'positionOffset=', this.positionOffset);
        return this.wasmSim.setNoiseSource(tx, ty, tz, intensity);
    }

    tick() {
        if (!this.wasmSim) throw new Error('WASM simulator unavailable');
        this.wasmSim.tick();
        this.syncFromWasm();
    }
    // Returns an array of plain objects suitable for React rendering.
    getGrids(): HexGrid[] {
        return this.gridsCache;
    }

    getBackendName(): string {
        return this.useWasm ? 'C++ / WASM backend' : 'C++ WASM backend unavailable';
    }

    isWasmEnabled(): boolean {
        return this.useWasm;
    }

    getInsideNoiseLevel(): number {
        if (!this.wasmSim) return 0;
        if (typeof this.wasmSim.getInsideNoiseLevel === 'function') return this.wasmSim.getInsideNoiseLevel();
        return 0;
    }

    private syncFromWasm() {
        try {
            const M = (window as any).Module;
            if (!M) return;
            const vec = M.getGridsFromSim(this.wasmSim);
            const arr: HexGrid[] = [];
            for (let i = 0; i < vec.size(); i++) {
                const g = vec.get(i);
                arr.push({
                    id: g.getId(),
                    position: { x: g.getPosition().x, y: g.getPosition().y, z: g.getPosition().z },
                    rotation: { x: g.getRotation().x, y: g.getRotation().y, z: g.getRotation().z },
                    temperature: g.getTemperature(),
                    soundLevel: g.getSoundLevel(),
                    isReflectingHeat: g.getIsReflectingHeat(),
                    isTrappingSound: g.getIsTrappingSound(),
                    acousticBlockingFactor: g.getAcousticBlockingFactor ? g.getAcousticBlockingFactor() : 0.1,
                    mechanicalFoldAngle: g.getMechanicalFoldAngle ? g.getMechanicalFoldAngle() : 0.0,
                });
            }
            // Recenter positions: compute centroid and translate to room center (0,0,0)
            // This keeps relative simulation results but ensures the grids show inside the room
            try {
                    // Compute best-fit linear transform (scale + bias) mapping raw WASM positions -> expected frontend positions
                    const w = Math.sqrt(3) * this.radius;
                    const h = 2 * this.radius * 0.75;
                    const n = arr.length || 1;

                    // build arrays of raw and expected coordinates
                    const rawX: number[] = [];
                    const rawY: number[] = [];
                    const rawZ: number[] = [];
                    const expX: number[] = [];
                    const expY: number[] = [];
                    const expZ: number[] = [];

                    for (const g of arr) {
                        const id = g.id;
                        const r = Math.floor(id / this.cols);
                        const c = id % this.cols;
                        let expectedX = (c * w) - (this.cols * w / 2);
                        if (r % 2 === 1) expectedX += w / 2;
                        const expectedY = (r * h) - (this.rows * h / 2);
                        const expectedZ = 0;
                        rawX.push(Number(g.position.x)); rawY.push(Number(g.position.y)); rawZ.push(Number(g.position.z));
                        expX.push(expectedX); expY.push(expectedY); expZ.push(expectedZ);
                    }

                    // least-squares scale (a) and bias (b) per axis: minimize sum((a*raw + b - exp)^2)
                    const fitLinear = (rarr: number[], earr: number[]) => {
                        const m = rarr.length;
                        if (m === 0) return { a: 1, b: 0 };
                        const rmean = rarr.reduce((s, v) => s + v, 0) / m;
                        const emean = earr.reduce((s, v) => s + v, 0) / m;
                        let num = 0, den = 0;
                        for (let i = 0; i < m; i++) { const dr = rarr[i] - rmean; const de = earr[i] - emean; num += dr * de; den += dr * dr; }
                        const a = den === 0 ? 1 : num / den;
                        const b = emean - a * rmean;
                        return { a, b };
                    };

                    const fx = fitLinear(rawX, expX);
                    const fy = fitLinear(rawY, expY);
                    const fz = fitLinear(rawZ, expZ);

                    this.positionScale = { x: fx.a || 1, y: fy.a || 1, z: fz.a || 1 };
                    this.positionBias = { x: fx.b || 0, y: fy.b || 0, z: fz.b || 0 };

                    // apply transform to raw positions
                    for (const g of arr) {
                        g.position.x = this.positionScale.x * Number(g.position.x) + this.positionBias.x;
                        g.position.y = this.positionScale.y * Number(g.position.y) + this.positionBias.y;
                        g.position.z = this.positionScale.z * Number(g.position.z) + this.positionBias.z;
                    }
                if (typeof console !== 'undefined') {
                    const sample = arr.slice(0, 6).map(g => ({ id: g.id, x: Number(g.position.x).toFixed(3), y: Number(g.position.y).toFixed(3), z: Number(g.position.z).toFixed(3) }));
                    console.groupCollapsed && console.groupCollapsed('WASM Simulator - grid positions (sample, recentered)');
                    console.table ? console.table(sample) : console.log('WASM sample (recentered):', sample);
                    // show computed offset used to align WASM -> frontend layout
                    console.log('WASM -> frontend positionOffset', this.positionOffset);
                    // If we have a last visual sun position, compute expected facing for the first sample
                    if (this.lastSunVisual && arr.length > 0) {
                        const g0 = arr[0];
                        const dx = this.lastSunVisual.x - g0.position.x;
                        const dz = this.lastSunVisual.z - g0.position.z;
                        const groundDistance = Math.sqrt(dx*dx + dz*dz) || 1.0;
                        const expectedY = Math.atan2(dx, dz) * 180.0 / Math.PI;
                        const expectedX = Math.atan2(this.lastSunVisual.y - g0.position.y, groundDistance) * 180.0 / Math.PI;
                        console.log('WASM sample[0] actual rotation:', { rx: g0.rotation.x, ry: g0.rotation.y }, 'expected rotation (facing sun):', { rx: expectedX.toFixed(2), ry: expectedY.toFixed(2) });
                    }
                    console.groupEnd && console.groupEnd();
                }
            } catch (e) {
                // swallow logging errors
            }
            this.gridsCache = arr;
        } catch (e) {
            console.warn('Failed to sync from WASM', e);
        }
    }
}
