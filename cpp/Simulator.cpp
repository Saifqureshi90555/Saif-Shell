#include "Simulator.h"

Simulator::Simulator(int wallRows, int wallCols, float hexRadius)
    : wall(wallRows, wallCols, hexRadius),
      sunPosition(0, 0, 100), sunIntensity(0),
      noisePosition(0, 0, 100), noiseIntensity(0) {}

void Simulator::setSunLighting(float x, float y, float z, float intensity) {
    sunPosition.set(x, y, z);
    sunIntensity = intensity;
}

void Simulator::setNoiseSource(float x, float y, float z, float intensity) {
    noisePosition.set(x, y, z);
    noiseIntensity = intensity;
}

void Simulator::tick() {
    // Passes the environmental state to the Wall, which propagates to the HexGrids
    wall.reactToEnvironment(sunPosition, sunIntensity, noisePosition, noiseIntensity);
}

const DynamicWall& Simulator::getWall() const {
    return wall;
}

float Simulator::getInsideNoiseLevel() const {
    // Noise level drops based on wall attenuation
    float attenuation = wall.getTotalSoundAttenuation(); 
    float insideNoise = noiseIntensity * (1.0f - attenuation);
    return (insideNoise < 0.0f) ? 0.0f : insideNoise;
}
