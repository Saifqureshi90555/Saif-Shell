#pragma once
#include "DynamicWall.h"

// Simulator is the top-level controller for the wall system.
// It owns a DynamicWall and stores the current sun and noise state.
// The public API is intentionally small: set environment values,
// advance the simulation frame, and read status from the wall.
class Simulator {
private:
    DynamicWall wall;
    Vector3 sunPosition;
    float sunIntensity;
    
    Vector3 noisePosition;
    float noiseIntensity;

public:
    Simulator(int wallRows, int wallCols, float hexRadius);

    void setSunLighting(float x, float y, float z, float intensity);
    void setNoiseSource(float x, float y, float z, float intensity);

    void tick(); // Progresses the simulation frame

    const DynamicWall& getWall() const;
    float getInsideNoiseLevel() const;
};
