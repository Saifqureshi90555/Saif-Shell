import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { HexGrid } from './EngineBridge';
import { Sparkles, MeshDistortMaterial, Text } from '@react-three/drei';
import * as THREE from 'three';

interface WallSceneProps {
    grids?: HexGrid[];
    sunPos: [number, number, number];
    noisePos: [number, number, number];
    activeMode: 'sun' | 'noise' | null;
    maxVisible?: number;
    performanceMode?: boolean;
    simulator?: any;
    statusLines?: string[];
}

const HEX_COUNT = 352;
const ROOM_WIDTH = 210;
const ROOM_HEIGHT = 120;
const ROOM_DEPTH = 100;
const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();
const tempPosition = new THREE.Vector3();

export const HexWallScene: React.FC<WallSceneProps> = ({ grids, sunPos, noisePos, activeMode, maxVisible = HEX_COUNT, performanceMode = false, simulator, statusLines = [] }) => {
    const hexRef = useRef<THREE.InstancedMesh>(null);
    const mechRef = useRef<THREE.InstancedMesh>(null);
    const soundRing1 = useRef<THREE.Mesh>(null);
    const soundRing2 = useRef<THREE.Mesh>(null);
    const soundRing3 = useRef<THREE.Mesh>(null);
    const screenRef = useRef<THREE.Group>(null);
    const screenTextRef = useRef<THREE.Group>(null);
    const soundWavePhase = useRef(0);
    const frameCounter = useRef(0);
    const matrixBuffer = useRef<Float32Array | null>(null);
    const mechMatrixBuffer = useRef<Float32Array | null>(null);
    const colorBuffer = useRef<Float32Array | null>(null);
    const applyScheduled = useRef(false);

    // Ensure scene shows initial grids immediately (synchronous upload).
    // Retry a few times if refs aren't ready yet.
    React.useEffect(() => {
        let attempts = 0;
        const srcProvider = () => (simulator && typeof simulator.getGrids === 'function') ? simulator.getGrids() : grids;

        const doUpload = () => {
            attempts++;
            const src = srcProvider();
            const limit = Math.min(maxVisible, src.length);
            const inst = hexRef.current;
            if (!inst) {
                if (attempts < 6) setTimeout(doUpload, 50);
                return;
            }

            try {
                // ensure instanceColor attribute exists so setColorAt works
                const geom = inst.geometry as THREE.BufferGeometry;
                if (!geom.getAttribute('instanceColor')) {
                    geom.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(new Float32Array(HEX_COUNT * 3), 3));
                }

                for (let i = 0; i < limit; i++) {
                    const g = src[i];
                    const m = new THREE.Matrix4();
                    // compute facing toward sunPos or noisePos based on active mode
                    const targetPos = activeMode === 'noise' ? noisePos : sunPos;
                    const dx = targetPos[0] - g.position.x;
                    const dz = targetPos[2] - g.position.z;
                    const groundDistance = Math.sqrt(dx * dx + dz * dz) || 1.0;
                    const ryDeg = Math.atan2(dx, dz) * 180.0 / Math.PI;
                    let rxDeg = -Math.atan2(targetPos[1] - g.position.y, groundDistance) * 180.0 / Math.PI;
                    // when trapping sound, tilt inward sharply to form a closed barrier
                    if (activeMode === 'noise' && g.isTrappingSound) {
                        rxDeg = Math.min(rxDeg, -55);
                    }
                    m.makeRotationFromEuler(new THREE.Euler(
                        THREE.MathUtils.degToRad(rxDeg),
                        THREE.MathUtils.degToRad(ryDeg + g.mechanicalFoldAngle),
                        0,
                        'XYZ'
                    ));
                    m.setPosition(g.position.x, g.position.y, g.position.z);
                    inst.setMatrixAt(i, m);

                    const c = new THREE.Color();
                    if (activeMode === 'noise' && g.isTrappingSound) {
                        c.set('#4a9fb5');
                    } else if (g.isReflectingHeat) {
                        c.set('#f7e2b0');
                    } else if (g.isTrappingSound) {
                        c.set('#dceae6');
                    } else {
                        c.set('#fbf3eb');
                    }
                    inst.setColorAt(i, c);
                }
                inst.instanceMatrix.needsUpdate = true;
                if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
            } catch (e) {
                if (attempts < 6) setTimeout(doUpload, 50);
            }
        };

        doUpload();
    }, [simulator, grids, maxVisible]);

    const hexGeo = useMemo(() => new THREE.CylinderGeometry(4.75, 4.75, 1.5, 6).rotateX(Math.PI / 2), []);
    const mechGeo = useMemo(() => new THREE.CylinderGeometry(0.4, 0.4, 20, 8).rotateX(Math.PI / 2), []);
    const screenTextMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#88eeff', depthTest: false, transparent: true }), []);
    const screenTextSecondary = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9fdfff', depthTest: false, transparent: true }), []);
    const screenTextLine = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c4f0ff', depthTest: false, transparent: true }), []);

    // SOFT PALE GRID MATERIAL
    const hexMat = useMemo(() => new THREE.MeshPhysicalMaterial({ 
        color: '#fbf1e6', 
        emissive: '#fff5db',
        emissiveIntensity: 0.12,
        metalness: 0.52, 
        roughness: 0.18, 
        clearcoat: 0.7, 
        clearcoatRoughness: 0.1,
        reflectivity: 0.7,
        envMapIntensity: 1.5,
    }), []);

    const mechanicalMat = useMemo(() => new THREE.MeshPhysicalMaterial({ 
        color: '#ece2d7', 
        emissive: '#f7efe5',
        emissiveIntensity: 0.05,
        metalness: 0.45, 
        roughness: 0.22,
        envMapIntensity: 1.0
    }), []);

    const { camera } = useThree();
    useFrame(() => {
        if (screenTextRef.current) {
            screenTextRef.current.lookAt(camera.position);
            screenTextRef.current.up.set(0, 1, 0);
            screenTextRef.current.rotation.z = 0;
        }
        if (!hexRef.current || !mechRef.current) return;
        const src = simulator && typeof simulator.getGrids === 'function' ? simulator.getGrids() : grids;
        if (!src || src.length === 0) return;

        // In performance mode, skip updates on alternate frames to reduce CPU/GPU load
        frameCounter.current++;
        if (performanceMode && (frameCounter.current % 2 !== 0)) return;

        const limit = Math.min(maxVisible, src.length);

        // Ensure buffers allocated
        if (!matrixBuffer.current || matrixBuffer.current.length < limit * 16) {
            matrixBuffer.current = new Float32Array(limit * 16);
            mechMatrixBuffer.current = new Float32Array(limit * 16);
            colorBuffer.current = new Float32Array(limit * 3);
        }

        for (let i = 0; i < limit; i++) {
            const grid = src[i];
            const z = grid.position.z;
            // compute rotation: face sun in sun mode, face noise source in sound mode
            const targetPos = activeMode === 'noise' ? noisePos : sunPos;
            const dxVis = targetPos[0] - grid.position.x;
            const dzVis = targetPos[2] - grid.position.z;
            const groundDistVis = Math.sqrt(dxVis * dxVis + dzVis * dzVis) || 1.0;
            const ryDegVis = Math.atan2(dxVis, dzVis) * 180.0 / Math.PI;
            let rxDegVis = -Math.atan2(targetPos[1] - grid.position.y, groundDistVis) * 180.0 / Math.PI;
            // when trapping sound, tilt inward sharply to form a closed barrier
            if (activeMode === 'noise' && grid.isTrappingSound) {
                rxDegVis = Math.min(rxDegVis, -55); // force steep inward tilt to block sound
            }
            const rx = THREE.MathUtils.degToRad(rxDegVis);
            const ry = THREE.MathUtils.degToRad(ryDegVis + grid.mechanicalFoldAngle);
            // scale up when trapping sound (more aggressive response)
            const scale = (activeMode === 'noise' && grid.isTrappingSound) ? 1.38 : 1.0;

            tempMatrix.makeRotationFromEuler(new THREE.Euler(rx, ry, 0, 'XYZ'));
            tempMatrix.scale(new THREE.Vector3(scale, 1, scale));
            tempPosition.set(grid.position.x, grid.position.y, z);
            tempMatrix.setPosition(tempPosition);
            tempMatrix.toArray(matrixBuffer.current!, i * 16);

            tempMatrix.makeRotationFromEuler(new THREE.Euler(0, 0, 0));
            tempMatrix.setPosition(grid.position.x, grid.position.y, z - 10);
            tempMatrix.toArray(mechMatrixBuffer.current!, i * 16);

            if (!performanceMode) {
                if (activeMode === 'sun' && grid.isReflectingHeat) {
                    tempColor.lerpColors(new THREE.Color('#fbf5ed'), new THREE.Color('#f8e3b6'), 0.95);
                } else if (activeMode === 'noise' && grid.isTrappingSound) {
                    tempColor.lerpColors(new THREE.Color('#fbf5ed'), new THREE.Color('#4a9fb5'), 0.92);
                } else if (activeMode === 'noise') {
                    tempColor.set('#e8f0ed');
                } else {
                    tempColor.set('#fbf5ed');
                }
                colorBuffer.current![i * 3 + 0] = tempColor.r;
                colorBuffer.current![i * 3 + 1] = tempColor.g;
                colorBuffer.current![i * 3 + 2] = tempColor.b;
            }
        }

        // If not in performanceMode, apply updates synchronously to reflect simulation immediately.
        const applyNow = !performanceMode;
        if (applyNow) {
            try {
                if (hexRef.current) {
                    // ensure instanceColor attribute exists
                    const geom = hexRef.current.geometry as THREE.BufferGeometry;
                    if (!geom.getAttribute('instanceColor')) {
                        geom.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(new Float32Array(HEX_COUNT * 3), 3));
                    }
                    for (let i = 0; i < limit; i++) {
                        const m = new THREE.Matrix4();
                        m.fromArray(matrixBuffer.current!, i * 16);
                        hexRef.current.setMatrixAt(i, m);
                        if (colorBuffer.current) {
                            const c = new THREE.Color();
                            c.r = colorBuffer.current[i * 3 + 0];
                            c.g = colorBuffer.current[i * 3 + 1];
                            c.b = colorBuffer.current[i * 3 + 2];
                            hexRef.current.setColorAt(i, c);
                        }
                    }
                    hexRef.current.instanceMatrix.needsUpdate = true;
                    if (hexRef.current.instanceColor) hexRef.current.instanceColor.needsUpdate = true;
                }

                if (mechRef.current) {
                    for (let i = 0; i < limit; i++) {
                        const m2 = new THREE.Matrix4();
                        m2.fromArray(mechMatrixBuffer.current!, i * 16);
                        mechRef.current.setMatrixAt(i, m2);
                    }
                    mechRef.current.instanceMatrix.needsUpdate = true;
                }
            } catch (e) {
                console.warn('Synchronous upload failed', e);
            }
        } else {
            // Schedule a low-priority bulk upload to GPU to avoid blocking render
            if (!applyScheduled.current) {
                applyScheduled.current = true;
                const cb = (window as any).requestIdleCallback || function (fn: any) { setTimeout(fn, 0); };
                cb(() => {
                    try {
                        if (hexRef.current && matrixBuffer.current) {
                            const instArr = (hexRef.current.instanceMatrix as any).array || (hexRef.current.instanceMatrix as any).data || (hexRef.current.instanceMatrix as any);
                            // Some three.js builds expose .array directly
                            if (instArr && instArr.set) {
                                instArr.set(matrixBuffer.current);
                            } else if ((hexRef.current.instanceMatrix as any).set) {
                                (hexRef.current.instanceMatrix as any).set(matrixBuffer.current);
                            } else {
                                // fallback to setMatrixAt loop
                                for (let i = 0; i < limit; i++) {
                                    const m = new THREE.Matrix4();
                                    m.fromArray(matrixBuffer.current!, i * 16);
                                    hexRef.current!.setMatrixAt(i, m);
                                }
                            }
                            hexRef.current.instanceMatrix.needsUpdate = true;
                        }

                        if (mechRef.current && mechMatrixBuffer.current) {
                            const instArr2 = (mechRef.current.instanceMatrix as any).array || (mechRef.current.instanceMatrix as any).data || (mechRef.current.instanceMatrix as any);
                            if (instArr2 && instArr2.set) instArr2.set(mechMatrixBuffer.current);
                            mechRef.current.instanceMatrix.needsUpdate = true;
                        }

                        const hex = hexRef.current;
                        if (colorBuffer.current && hex?.instanceColor) {
                            const instanceColor = hex.instanceColor as any;
                            const colArr = instanceColor.array || instanceColor.data || instanceColor;
                            if (colArr && colArr.set) {
                                colArr.set(colorBuffer.current);
                                instanceColor.needsUpdate = true;
                            }
                        }
                    } catch (e) {
                        // ignore; best-effort
                        console.warn('Deferred upload failed', e);
                    }
                    applyScheduled.current = false;
                });
            }
        }

        const isSoundActive = activeMode === 'noise';
        const wavePhase = soundWavePhase.current + (isSoundActive ? 0.035 : 0.0);
        soundWavePhase.current = wavePhase;
        const normalize = (value: number) => value - Math.floor(value);

        const updateRing = (ref: React.RefObject<THREE.Mesh>, base: number, offset: number, alpha: number) => {
            const mesh = ref.current;
            if (!mesh || !mesh.material) return;
            const material = mesh.material as THREE.Material & { opacity?: number };
            const phase = normalize(wavePhase + offset);
            if (isSoundActive) {
                const scale = 1 + phase * base;
                mesh.scale.set(scale, scale, scale);
                mesh.visible = true;
                material.opacity = Math.max(0, alpha * (1 - phase));
            } else {
                mesh.visible = false;
            }
        };

        updateRing(soundRing1, 1.3, 0.0, 0.24);
        updateRing(soundRing2, 1.0, 0.33, 0.18);
        updateRing(soundRing3, 0.7, 0.66, 0.12);
    });

    return (
        <group position={[0, 0, 0]}> 
            <group>
                {/* ROOM ENVIRONMENT */}
                <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]} receiveShadow>
                    <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
                    <meshStandardMaterial color="#3b2f2a" side={THREE.FrontSide} roughness={0.88} metalness={0.16} />
                </mesh>
                <group ref={screenRef} position={[-180, 12, 60]} rotation={[0, 0, 0]}>
                    <mesh>
                        <boxGeometry args={[72, 92, 4.5]} />
                        <meshStandardMaterial color="#041623" emissive="#064d8a" emissiveIntensity={0.96} transparent opacity={0.94} roughness={0.08} metalness={0.35} />
                    </mesh>
                    <mesh position={[0, 0, 1.6]}>
                        <boxGeometry args={[68, 86, 0.35]} />
                        <meshStandardMaterial color="#061f36" emissive="#0b5caa" emissiveIntensity={1.0} transparent opacity={0.97} roughness={0.1} metalness={0.3} />
                    </mesh>
                    <mesh position={[0, 0, 2.15]}>
                        <boxGeometry args={[72, 92, 0.6]} />
                        <meshStandardMaterial color="#01101f" roughness={0.3} metalness={0.55} />
                    </mesh>
                    <group ref={screenTextRef} position={[-30, 28, 3.3]}>
                        <Text fontSize={5.4} anchorX="left" anchorY="middle" maxWidth={48} position={[0, 14, 0]} renderOrder={999} material={screenTextMaterial}>
                            LIVE CALC
                        </Text>
                        {statusLines.length === 0 ? (
                            <Text fontSize={3.2} anchorX="left" anchorY="middle" maxWidth={48} position={[0, 4, 0]} renderOrder={999} material={screenTextSecondary}>
                                Initializing...
                            </Text>
                        ) : statusLines.map((line, index) => (
                            <Text key={index} fontSize={3.0} anchorX="left" anchorY="middle" maxWidth={48} position={[0, 8 - index * 6.2, 0]} renderOrder={999} material={screenTextLine}>
                                {line}
                            </Text>
                        ))}
                    </group>
                </group>
                <group position={[0, ROOM_HEIGHT * 0.85, -ROOM_DEPTH / 2 + 0.5]}>
                    <Text fontSize={10} color="#fde68a" anchorX="center" anchorY="middle" rotation={[0, 0, 0]} maxWidth={400} lineHeight={1} letterSpacing={0.08}>
                        SAIF SHELL
                    </Text>
                </group>
                <mesh position={[0, -ROOM_HEIGHT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
                    <meshStandardMaterial color="#271f1d" roughness={0.86} metalness={0.12} />
                </mesh>
                <mesh position={[-ROOM_WIDTH / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
                    <meshStandardMaterial color="#332a28" side={THREE.DoubleSide} roughness={0.88} metalness={0.1} />
                </mesh>
                <mesh position={[ROOM_WIDTH / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
                    <meshStandardMaterial color="#332a28" side={THREE.DoubleSide} roughness={0.88} metalness={0.1} />
                </mesh>
            </group>

            {/* CINEMATIC SUN DESIGN */}
            {activeMode === 'sun' && (
                <group position={sunPos}>
                    <directionalLight position={[0, 0, 0]} intensity={1.1} color="#fcd34d" />
                    <mesh>
                        <sphereGeometry args={[10, 64, 64]} />
                        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={10} roughness={0.18} metalness={0.14} />
                    </mesh>
                    <pointLight intensity={220} distance={220} decay={1.5} color="#fbbf24" />
                    <Sparkles count={180} scale={32} size={14} speed={0.35} color="#fbbf24" />
                </group>
            )}

            <group position={noisePos}>
                <mesh>
                    <sphereGeometry args={[8, 32, 32]} />
                    <MeshDistortMaterial color="#faf8eb" speed={16} distort={0.92} radius={1} emissive="#fde68a" emissiveIntensity={10} transparent opacity={0.28} />
                </mesh>
                {activeMode === 'noise' && <Sparkles count={240} scale={42} size={10} speed={3} color="#fcd34d" />}
                <mesh ref={soundRing1} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[6, 7.4, 96]} />
                    <meshBasicMaterial transparent opacity={0.24} color="#fcd34d" side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh ref={soundRing2} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[4.2, 4.8, 96]} />
                    <meshBasicMaterial transparent opacity={0.18} color="#fde68a" side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh ref={soundRing3} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[3.2, 3.6, 96]} />
                    <meshBasicMaterial transparent opacity={0.12} color="#fef3c7" side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
            </group>

            <instancedMesh ref={hexRef} args={[hexGeo, hexMat, HEX_COUNT]} castShadow receiveShadow />
            <instancedMesh ref={mechRef} args={[mechGeo, mechanicalMat, HEX_COUNT]} />

            {/* INDUSTRIAL BUILDING ELEMENTS */}
            <group position={[0, 0, -20]}>
                {/* Horizontal Heavy Steel Trusses */}
                <mesh position={[0, 52, 0]} castShadow><boxGeometry args={[300, 10, 10]} /><meshStandardMaterial color="#08080a" /></mesh>
                <mesh position={[0, -52, 0]} castShadow><boxGeometry args={[300, 10, 10]} /><meshStandardMaterial color="#08080a" /></mesh>
                
                {/* Vertical Cable Suspension */}
                {[...Array(20)].map((_, i) => (
                    <mesh key={i} position={[(i - 10) * 15, 0, -5]}>
                        <cylinderGeometry args={[0.1, 0.1, 150]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                ))}
            </group>

            {/* BUILDING GLASS SKIN */}
            <mesh position={[0, 0, -10]}>
                <boxGeometry args={[260, 120, 0.6]} />
                <meshPhysicalMaterial 
                    color="#c7d2fe" 
                    transparent 
                    opacity={0.06} 
                    transmission={0.94} 
                    thickness={4} 
                    roughness={0}
                    metalness={0.2}
                />
            </mesh>
        </group>
    );
};
