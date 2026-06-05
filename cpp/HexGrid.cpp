#include "HexGrid.h"
#include <algorithm>
#include <cmath>

HexGrid::HexGrid() 
    : id(0), position(0, 0, 0), rotation(0, 0, 0), temperature(20.0f), soundLevel(30.0f), 
      isReflectingHeat(false), isTrappingSound(false), acousticBlockingFactor(0.1f), mechanicalFoldAngle(0.0f) {}

HexGrid::HexGrid(int id, float x, float y, float z) 
    : id(id), position(x, y, z), rotation(0, 0, 0), temperature(20.0f), soundLevel(30.0f), 
      isReflectingHeat(false), isTrappingSound(false), acousticBlockingFactor(0.1f), mechanicalFoldAngle(0.0f) {}

void HexGrid::updateState(const Vector3& lightSource, float lightIntensity, const Vector3& soundSource, float soundIntensity) {
    // 1. Heat calculations based on distance to light source
    float distToLight = position.distanceTo(lightSource);
    float heatFactor = (distToLight > 0.0f) ? (lightIntensity / (distToLight * distToLight)) : 0.0f;
    temperature = 20.0f + std::min(heatFactor, 40.0f); // Base + generated

    // Compute sun direction for panel orientation
    Vector3 lightDir = lightSource - position;
    float horizontalDistance = std::sqrt(lightDir.x * lightDir.x + lightDir.z * lightDir.z);
    float horizontalAngle = (horizontalDistance > 0.0f) ? std::atan2(lightDir.x, lightDir.z) * 180.0f / 3.14159265f : 0.0f;
    float verticalAngle = (horizontalDistance > 0.0f) ? std::atan2(lightDir.y, horizontalDistance) * 180.0f / 3.14159265f : 0.0f;

    // 2. Sound calculation based on distance to sound source
    float distToSound = position.distanceTo(soundSource);
    float soundFactor = (distToSound > 0.0f) ? (soundIntensity / (distToSound * distToSound)) : 0.0f;
    soundLevel = 30.0f + std::min(soundFactor, 80.0f);

    // 3. Dynamic adjustment decisions
    // Always point the panel toward the sun horizontally.
    rotation.y = horizontalAngle;
    if (temperature > 30.0f) {
        isReflectingHeat = true;
        rotation.x = std::clamp(-verticalAngle, -45.0f, 0.0f);
    } else {
        isReflectingHeat = false;
        rotation.x = 0.0f;
    }

    // If it gets too loud, adjust position in Z-axis (pop out/in) to trap sound
    if (soundLevel > 55.0f && !isReflectingHeat) {
        isTrappingSound = true;
        // Physical zig-zag constraint: Grids tilt towards each other to damp waves
        // Zig-zag pattern based on ID (staggered tilting)
        mechanicalFoldAngle = (id % 2 == 0) ? 45.0f : -45.0f;
        acousticBlockingFactor = 0.85f; // High blocking in this config
        position.z = 0.0f;
    } else {
        isTrappingSound = false;
        mechanicalFoldAngle = 0.0f;
        acousticBlockingFactor = 0.15f; // Plain wall still blocks some sound
        position.z = 0.0f;
    }
}

int HexGrid::getId() const { return id; }
Vector3 HexGrid::getPosition() const { return position; }
Vector3 HexGrid::getRotation() const { return rotation; }
float HexGrid::getTemperature() const { return temperature; }
float HexGrid::getSoundLevel() const { return soundLevel; }
bool HexGrid::getIsReflectingHeat() const { return isReflectingHeat; }
bool HexGrid::getIsTrappingSound() const { return isTrappingSound; }
float HexGrid::getAcousticBlockingFactor() const { return acousticBlockingFactor; }
float HexGrid::getMechanicalFoldAngle() const { return mechanicalFoldAngle; }
