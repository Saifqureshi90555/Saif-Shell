#pragma once
#include <vector>
#include "HexGrid.h"

// DynamicWall is a container of HexGrid objects.
// It is responsible for creating the grid layout and forwarding
// the environment state to every hex cell for local updates.
class DynamicWall {
private:
    std::vector<HexGrid> grids;
    int rows;
    int cols;
    float hexRadius;

public:
    DynamicWall(int r, int c, float radius);

    void initializeGrid();
    void reactToEnvironment(const Vector3& lightSource, float lightIntensity, const Vector3& soundSource, float soundIntensity);
    
    const std::vector<HexGrid>& getGrids() const;
    size_t getGridCount() const;
    float getTotalSoundAttenuation() const;
};
