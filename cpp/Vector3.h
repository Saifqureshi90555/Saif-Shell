#pragma once
#include <cmath>

// Vector3 is a simple value type for 3D coordinates and directions.
// It provides basic vector arithmetic so the simulation code remains readable.
class Vector3 {
public:
    float x, y, z;

    Vector3() : x(0), y(0), z(0) {}
    Vector3(float x, float y, float z) : x(x), y(y), z(z) {}

    Vector3 operator+(const Vector3& other) const { return Vector3(x + other.x, y + other.y, z + other.z); }
    Vector3 operator-(const Vector3& other) const { return Vector3(x - other.x, y - other.y, z - other.z); }
    Vector3 operator*(float scalar) const { return Vector3(x * scalar, y * scalar, z * scalar); }
    
    // Member function to modify state
    void set(float vx, float vy, float vz) {
        x = vx; y = vy; z = vz;
    }

    float distanceTo(const Vector3& other) const {
        return std::sqrt(std::pow(x - other.x, 2) + std::pow(y - other.y, 2) + std::pow(z - other.z, 2));
    }
};
