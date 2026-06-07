# Saif Shell - Smart Dynamic Wall System

This is my OOP project that shows how a smart wall can move and adapt based on the sun and sound around it. The wall is made of hexagonal panels that track the sun's position. When the sun gets too intense, the panels rotate to block light from entering the building, keeping the inside cool. At the same time, the solar panels on each hexagon generate energy and store it in batteries. For sound, the panels change their shape and arrangement to trap and absorb noise so it doesn't enter the building. The C++ backend does all the physics calculations to decide how each panel should move and rotate.

## Live demo & repo

Try the live demo here: https://saifshell.netlify.app/

Check the source code on GitHub: https://github.com/Saifqureshi90555/Saif-Shell


## Real-world problem and solution

### Problem
- Buildings lose heat in winter and gain too much heat in summer through windows and walls.
- Noise pollution from outside traffic, HVAC systems, and machinery makes buildings uncomfortable.
- Energy consumption for cooling and heating is expensive.

### Solution
A dynamic wall system that:
- **Protects from heat**: Panels track and face the sun, then rotate to block direct sunlight and reduce cooling costs.
- **Generates solar energy**: Each hexagonal panel has integrated solar cells that produce electricity while blocking heat.
- **Stores energy**: Generated power is stored in battery systems for later use.
- **Blocks noise**: Panels rearrange to create an acoustic barrier that absorbs and traps sound waves, reducing noise entering the building.

## Real-world materials

For this system to work in reality, you could use:
- **Panel material**: Thermochromic materials (change color/reflectivity with temperature) or metallic coatings to reflect sunlight.
- **Solar integration**: Thin-film PV cells or perovskite solar cells embedded in each hexagon.
- **Acoustic layer**: Foam or fibrous materials (like basalt fiber) inside the hexagons to absorb sound.
- **Structural frame**: Lightweight aluminum or carbon-fiber composite for quick movement.
- **Actuation**: Smart servo motors controlled by sensors and algorithms to position each panel.

## The C++ core

The C++ backend is the brain of this system. It does:

1. **Calculate distances** from each panel to the sun and noise source.
2. **Compute heat intensity** based on distance and angle.
3. **Decide panel rotation** so panels face the sun when needed and block when too hot.
4. **Calculate sound levels** reaching each panel.
5. **Trigger acoustic mode** when sound is too loud, causing panels to tilt inward and trap sound.
6. **Track energy** from solar generation.

All of this is computed in C++ and compiled to WebAssembly so the browser can run the simulation at real speed without JavaScript.

## Project structure

```
.
├── cpp/                 # C++ OOP core - the physics engine
│   ├── Vector3.h        # 3D positioning and distance math
│   ├── HexGrid.h/.cpp   # One panel: position, rotation, temperature, sound level
│   ├── DynamicWall.h/.cpp # The whole wall: grid of panels that update together
│   ├── Simulator.h/.cpp # Main controller: tracks sun/noise and updates the wall
│   └── main.cpp         # Native test program and WebAssembly bindings
├── saif-shell/          # Frontend 3D visualization and web app
│   ├── src/             # React app with Three.js 3D rendering
│   ├── package.json     # Frontend dependencies
│   └── build_netlify.sh # Build script for deployment
```

## How it works - step by step

### Step 1: Environment input
- The system receives the sun's position and intensity.
- The system receives the noise source location and loudness.

### Step 2: C++ calculates response
The C++ `Simulator` passes this data to the `DynamicWall`, which tells each `HexGrid` panel to calculate:
- Distance to the sun.
- Amount of heat it receives.
- Distance to the noise source.
- Amount of sound it receives.

### Step 3: Panels respond
- **If heat is high**: Panel rotates to face the sun and tilts to reflect light away from the building. Solar energy is generated.
- **If sound is high**: Panel tilts inward and adjusts angle to trap acoustic waves. Combined with other panels, they create a sound barrier.

### Step 4: Frontend shows it
The browser receives the panel positions and rotations from C++ and renders them in 3D so you can see the wall moving in real time.

## Running the C++ version locally

To test the pure C++ backend, compile and run:

```powershell
cd "d:\OOP Project\saif-shell\cpp"
g++ main.cpp HexGrid.cpp DynamicWall.cpp Simulator.cpp -o SaifShellCLI
./SaifShellCLI
```

This runs the simulation in the terminal and shows the calculated states for each scenario (sun exposure, noise exposure).

## Web app with Netlify

The `build_netlify.sh` script compiles the C++ code to WebAssembly and builds the web app. When deployed, the browser runs the real C++ logic without needing to install a C++ compiler. The physics calculations happen at native speed inside WebAssembly.

## How to push changes

```powershell
cd "d:\OOP Project\saif-shell"
git add .
git commit -m "Your message here"
git push
```
