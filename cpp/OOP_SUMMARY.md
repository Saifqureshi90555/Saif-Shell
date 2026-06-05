# OOP Summary for Saif Shell

This file explains only the object-oriented programming (OOP) used in the C++ part of the project. I wrote it in a simple way so that you people can understand the work flow of my project .

## How many classes are used?

There are 4 main classes in the C++ core:

1. `Vector3`
2. `HexGrid`
3. `DynamicWall`
4. `Simulator`

These classes work together to make the wall move and react in a structured way.

## What each class does

### `Vector3`
- This is a small helper class.
- It stores 3D values: `x`, `y`, and `z`.
- It has simple math operations like adding and subtracting vectors.
- It also calculates distance between two points.

Why this is OOP:
- Instead of using separate `x`, `y`, and `z` values everywhere, we use one object.
- It keeps the code clean and easier to read.

### `HexGrid`
- This class represents one hexagonal panel in the wall.
- It stores the panel's position, rotation, temperature, sound level, and state flags.
- It has a method called `updateState()` that decides how the panel should move.

What it contains:
- `id`
- `position` (a `Vector3` object)
- `rotation` (a `Vector3` object)
- `temperature`
- `soundLevel`
- `isReflectingHeat`
- `isTrappingSound`
- `acousticBlockingFactor`
- `mechanicalFoldAngle`

What it does:
- Calculates how much heat the panel receives from the sun.
- Calculates how much sound reaches the panel.
- If the panel is hot enough, it reflects heat.
- If the sound is loud enough, it goes into sound trapping mode.
- The panel chooses its own rotation and state based on those inputs.

Why this is OOP:
- Each panel is an object with its own data and behavior.
- The `HexGrid` class hides the details so the rest of the code does not need to know the math.
- This is encapsulation: data and methods are grouped together.

### `DynamicWall`
- This class represents the entire wall made of many `HexGrid` panels.
- It contains a list of `HexGrid` objects.
- It creates the layout of the wall in `initializeGrid()`.
- It updates every panel in `reactToEnvironment()`.

What it contains:
- `grids` (a vector of `HexGrid` objects)
- `rows`
- `cols`
- `hexRadius`

What it does:
- Builds the wall using rows and columns.
- Positions each hex panel in a grid pattern.
- Sends sunlight and noise information to each panel.
- Computes the average sound blocking ability of the wall.

Why this is OOP:
- `DynamicWall` is a container class that owns many objects.
- It keeps the wall layout logic separate from each panel's behavior.
- This is composition: the wall has hex panels.

### `Simulator`
- This is the top-level class that controls the whole simulation.
- It owns a `DynamicWall` object.
- It stores the sun position and intensity.
- It stores the noise position and intensity.
- It has a method called `tick()` to update the wall.

What it contains:
- `wall` (a `DynamicWall` object)
- `sunPosition` (a `Vector3` object)
- `sunIntensity`
- `noisePosition` (a `Vector3` object)
- `noiseIntensity`

What it does:
- Receives sun and noise inputs.
- Passes those inputs to the wall.
- Calls `wall.reactToEnvironment()` to update every panel.
- Provides a way to read the wall state from outside.

Why this is OOP:
- `Simulator` is the coordinator that keeps everything organized.
- It encapsulates the environment state.
- It separates the control logic from the wall logic.

## OOP concepts used in this project

### Encapsulation
- Each class keeps its own data and methods together.
- For example, `HexGrid` stores its own temperature and sound state.
- Other parts of the code only use the class methods.

### Composition
- The wall is made of hex grids.
- The simulator has a wall.
- This means one object contains other objects.

### Constructors
- Each class has a constructor that sets its initial state.
- `HexGrid` gets an `id` and position when it is created.
- `DynamicWall` gets the number of rows and columns.
- `Simulator` creates the wall and sets default environment values.

### Methods and behavior
- `updateState()` in `HexGrid` is the main behavior method.
- `reactToEnvironment()` in `DynamicWall` updates all panels.
- `tick()` in `Simulator` advances the simulation.

### Abstraction
- The rest of the project does not need to know how `HexGrid` calculates heat or sound.
- It only needs to call the public methods.
- This makes the code easier to change later.

## How the classes connect

1. `main.cpp` or the WebAssembly binding creates a `Simulator` object.
2. `Simulator` creates a `DynamicWall`.
3. `DynamicWall` creates many `HexGrid` panels.
4. When the sun or noise changes, `Simulator` passes that to the wall.
5. The wall tells each panel to update itself.
6. Each panel uses `Vector3` to calculate distances.

## Why I used OOP here

- It makes the code easier to read.
- It makes it easier to change one part without breaking everything.
- The wall is a group of objects, so classes are a natural fit.
- The math and behavior are grouped with the objects they belong to.

## Simple summary

- `Vector3` is for position math.
- `HexGrid` is one panel.
- `DynamicWall` is many panels.
- `Simulator` controls the environment.

This is the OOP design for the C++ part of the project. It shows the main classes, what they do, and why they are used.
