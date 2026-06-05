#pragma once
#include "Vector3.h"

// HexGrid represents a single hexagonal panel in the Dynamic Wall.
// Each grid has its own position, rotation, and local state for
// temperature, sound level, and whether it is responding to heat or noise.
class HexGrid {
private:
    int id;
    Vector3 position;
    Vector3 rotation;
    
    float temperature; // Current local temperature
    float soundLevel;  // Current local sound level

    // States
    bool isReflectingHeat;
    bool isTrappingSound;
    float acousticBlockingFactor; // 0.0 to 1.0 (how well it blocks sound)
    float mechanicalFoldAngle;    // Angle for zig-zag physical structure

public:
    HexGrid();
    HexGrid(int id, float x, float y, float z);

    // Core OOP behaviors
    void updateState(const Vector3& lightSource, float lightIntensity, const Vector3& soundSource, float soundIntensity);
    
    // Getters for simulation rendering
    int getId() const;
    Vector3 getPosition() const;
    Vector3 getRotation() const;
    float getTemperature() const;
    float getSoundLevel() const;
    bool getIsReflectingHeat() const;
    bool getIsTrappingSound() const;
    float getAcousticBlockingFactor() const;
    float getMechanicalFoldAngle() const;
};
