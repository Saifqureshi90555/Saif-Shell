import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ComputerLabProps {
    noiseLevel: number;
    temperature: number;
}

export const ComputerLab: React.FC<ComputerLabProps> = ({ noiseLevel, temperature }) => {
    return (
        <group position={[0, -25, -75]}>
            {/* HYPER-REALISTIC ARCHITECTURAL INTERIOR */}
            
            {/* Scuffed Obsidian Floor */}
            <mesh position={[0, -0.5, 20]} receiveShadow>
                <boxGeometry args={[500, 1.5, 300]} />
                <meshPhysicalMaterial 
                    color="#020202" 
                    roughness={0.2} 
                    metalness={0.8} 
                    clearcoat={1} 
                    clearcoatRoughness={0.3} // Imperfect scuffs
                /> 
            </mesh>
            
            {/* Exposed Industrial Ceiling */}
            <group position={[0, 100, 20]}>
                <mesh><boxGeometry args={[500, 1, 300]} /><meshStandardMaterial color="#050505" /></mesh>
                {/* Exposed Ventilation Pipes */}
                <mesh position={[0, -10, 40]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[4, 4, 500]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[0, -10, -40]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[4, 4, 500]} /><meshStandardMaterial color="#111" /></mesh>
                
                {/* Grid Warm Lights */}
                {[...Array(8)].map((_, i) => (
                    <mesh key={i} position={[0, -1.5, (i - 3.5) * 40]}>
                        <boxGeometry args={[450, 0.2, 5]} />
                        <meshStandardMaterial color="#ffedd5" emissive="#fed7aa" emissiveIntensity={5} />
                    </mesh>
                ))}
            </group>

            {/* Industrial Support Pillars */}
            <Pillar position={[-220, 50, 80]} />
            <Pillar position={[220, 50, 80]} />
            <Pillar position={[-220, 50, -80]} />
            <Pillar position={[220, 50, -80]} />

            {/* Workstations with Messy Props */}
            <Workstation position={[-100, 0, 15]} noise={noiseLevel} temp={temperature} status="RESEARCH" />
            <Workstation position={[-35, 0, 15]} noise={noiseLevel} temp={temperature} status="ACTIVE" />
            <Workstation position={[35, 0, 15]} noise={noiseLevel} temp={temperature} status="SCANNING" />
            <Workstation position={[100, 0, 15]} noise={noiseLevel} temp={temperature} status="SECURE" />

            {/* Instructor Command Center */}
            <group position={[0, 0, -45]}>
                <mesh position={[0, 7, 0]} castShadow>
                   <boxGeometry args={[60, 14, 24]} />
                   <meshPhysicalMaterial color="#050505" metalness={1} roughness={0.2} />
                </mesh>
                <Character position={[0, 0, 0]} isTeacher noise={noiseLevel} temp={temperature} />
            </group>
        </group>
    );
};

const Pillar = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position} castShadow>
        <boxGeometry args={[18, 150, 18]} />
        <meshStandardMaterial color="#08080a" roughness={0.9} />
    </mesh>
);

const Workstation = ({ position, noise, temp, status }: { position: [number, number, number], noise: number, temp: number, status: string }) => (
    <group position={position}>
        {/* Table with Cables */}
        <mesh position={[0, 13, 0]} receiveShadow><boxGeometry args={[56, 1, 32]} /><meshPhysicalMaterial color="#050505" metalness={1} /></mesh>
        
        {/* Gear */}
        <Laptop position={[-18, 13.5, 10]} status={status} />
        <Laptop position={[18, 13.5, 10]} status={status} />
        
        {/* Cables on floor */}
        <mesh position={[0, 1, 10]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.2, 0.2, 50]} /><meshStandardMaterial color="#000" /></mesh>

        <Character position={[-18, 0, -8]} noise={noise} temp={temp} />
        <Character position={[18, 0, -8]} noise={noise} temp={temp} />
    </group>
);

const Laptop = ({ position, status }: { position: [number, number, number], status: string }) => (
    <group position={position}>
        <mesh><boxGeometry args={[12, 0.4, 8]} /><meshStandardMaterial color="#27272a" metalness={1} /></mesh>
        <group position={[0,0,-4]} rotation={[-Math.PI / 2.8, 0, 0]}>
            <mesh position={[0, 5, 0]}><boxGeometry args={[12, 10, 0.2]} /><meshStandardMaterial color="#020202" /></mesh>
            <mesh position={[0, 5, 0.12]}><planeGeometry args={[11.5, 9.5]} /><meshStandardMaterial color="#22d3ee" emissive="#0ea5e9" emissiveIntensity={5} /></mesh>
        </group>
        {/* Coffee cup */}
        <mesh position={[8, 1.2, 4]}><cylinderGeometry args={[1, 0.8, 2.5]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
    </group>
);

const Character = ({ position, noise, temp, isTeacher = false }: { position: [number, number, number], noise: number, temp: number, isTeacher?: boolean }) => {
    const headRef = useRef<THREE.Mesh>(null);
    const torsoRef = useRef<THREE.Mesh>(null);
    const isStressed = noise > 180000 || temp > 33;

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (headRef.current && torsoRef.current) {
            const h = isTeacher ? 24 : 10;
            if (isStressed) {
                headRef.current.position.y = h + Math.sin(time * 35) * 0.2;
                headRef.current.rotation.y = Math.sin(time * 20) * 0.4;
                torsoRef.current.rotation.x = Math.sin(time * 35) * 0.05;
            } else {
                headRef.current.position.y = h + Math.sin(time * 2) * 0.05;
                headRef.current.rotation.y = Math.sin(time * 1.5) * 0.1;
                torsoRef.current.rotation.x = Math.sin(time * 0.5) * 0.02;
            }
        }
    });

    return (
        <group position={position}>
            <mesh ref={torsoRef} position={[0, isTeacher ? 12 : 5, 0]} castShadow>
                <capsuleGeometry args={[2.8, isTeacher ? 22 : 9, 8, 12]} />
                <meshStandardMaterial color="#1a1a1f" />
            </mesh>
            <mesh ref={headRef} position={[0, isTeacher ? 24 : 10, 0]} castShadow>
                <sphereGeometry args={[3.2, 24, 24]} />
                <meshStandardMaterial color={isStressed ? "#ef4444" : "#fbbf24"} />
            </mesh>
        </group>
    );
};
