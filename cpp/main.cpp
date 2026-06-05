// Main entry point for the native C++ simulation build.
// This file demonstrates how the C++ OOP core works on its own.
// When compiled to WebAssembly, the same Simulator class is exposed
// to JavaScript through the Emscripten bindings below.

#include <iostream>
#include "Simulator.h"

int main() {
    std::cout << "=======================================\n";
    std::cout << " SAIF SHELL - KINETIC WALL SIMULATOR\n";
    std::cout << " (C++ CORE OOP PROOF OF EXECUTION)\n";
    std::cout << "=======================================\n\n";

    // Create a 5x5 wall with hex radius of 10 units
    Simulator sim(5, 5, 10.0f);

    std::cout << "Initial Default State (No extreme heat, No extreme noise)\n";
    sim.tick();
    auto& grids = sim.getWall().getGrids();
    std::cout << "Hex 0 Temp: " << grids[0].getTemperature() << " Noise: " << grids[0].getSoundLevel() << "\n";

    std::cout << "\n--- Scenario 1: Intense Sun (Heat) hits Center of Wall ---\n";
    // Set sun physically close to the origin (x=0, y=0) with high intensity
    sim.setSunLighting(0.0f, 0.0f, 50.0f, 50000.0f);
    sim.tick();
    
    std::cout << "Hex 0 (Near Sun) Temp: " << grids[0].getTemperature() 
              << " | Is Reflecting Heat: " << (grids[0].getIsReflectingHeat() ? "YES" : "NO") 
              << " | Rotation X: " << grids[0].getRotation().x << "\n";

    std::cout << "\n--- Scenario 2: Loud AC / Fans Noise from inside Room ---\n";
    // Move sun away, simulate noise source near the wall
    sim.setSunLighting(0.0f, 0.0f, 500.0f, 100.0f); 
    sim.setNoiseSource(10.0f, 10.0f, 30.0f, 80000.0f);
    sim.tick();

    std::cout << "Hex 0 Noise Level: " << grids[0].getSoundLevel() 
              << " | Is Trapping Sound: " << (grids[0].getIsTrappingSound() ? "YES" : "NO") 
              << " | Grid Z Position: " << grids[0].getPosition().z << "\n";

    std::cout << "\nSimulation tick complete. C++ logic is fully active.\n";

    return 0;
}

// Emscripten Binding block (will only be compiled when emcc is used)
#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
using namespace emscripten;

EMSCRIPTEN_BINDINGS(saif_shell_module) {
    class_<Vector3>("Vector3")
        .constructor<float, float, float>()
        .property("x", &Vector3::x)
        .property("y", &Vector3::y)
        .property("z", &Vector3::z);

    class_<HexGrid>("HexGrid")
        .function("getId", &HexGrid::getId)
        .function("getPosition", &HexGrid::getPosition)
        .function("getRotation", &HexGrid::getRotation)
        .function("getTemperature", &HexGrid::getTemperature)
        .function("getSoundLevel", &HexGrid::getSoundLevel)
        .function("getIsReflectingHeat", &HexGrid::getIsReflectingHeat)
        .function("getIsTrappingSound", &HexGrid::getIsTrappingSound);

    // Provide a wrapper to return grids as JS arrays easily
    class_<Simulator>("Simulator")
        .constructor<int, int, float>()
        .function("setSunLighting", &Simulator::setSunLighting)
        .function("setNoiseSource", &Simulator::setNoiseSource)
        .function("tick", &Simulator::tick)
        .function("getInsideNoiseLevel", &Simulator::getInsideNoiseLevel);
        
    // Embind helper for std::vector
    register_vector<HexGrid>("VectorHexGrid");
    
    // We bind a global helper to easily get the grids to JS
    function("getGridsFromSim", optional_override([](const Simulator& sim) -> std::vector<HexGrid> {
        return sim.getWall().getGrids();
    }));
}
#endif
