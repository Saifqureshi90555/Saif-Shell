#include "DynamicWall.h"
#include <cmath>

DynamicWall::DynamicWall(int r, int c, float radius) 
    : rows(r), cols(c), hexRadius(radius) {
    initializeGrid();
}

void DynamicWall::initializeGrid() {
    int idCounter = 0;
    float hexWidth = std::sqrt(3.0f) * hexRadius;
    float hexHeight = 2.0f * hexRadius;
    
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            float xOffset = c * hexWidth;
            if (r % 2 == 1) {
                xOffset += hexWidth / 2.0f; // Offset staggered row
            }
            float yOffset = r * hexHeight * 0.75f; // 3/4 vertical spacing
            
            grids.emplace_back(idCounter++, xOffset, yOffset, 0.0f);
        }
    }
}

void DynamicWall::reactToEnvironment(const Vector3& lightSource, float lightIntensity, const Vector3& soundSource, float soundIntensity) {
    // Tell each grid unit to update its form based on the environmental factors
    for (auto& grid : grids) {
        grid.updateState(lightSource, lightIntensity, soundSource, soundIntensity);
    }
}

const std::vector<HexGrid>& DynamicWall::getGrids() const {
    return grids;
}

size_t DynamicWall::getGridCount() const {
    return grids.size();
}

float DynamicWall::getTotalSoundAttenuation() const {
    if (grids.empty()) return 0.0f;
    float total = 0.0f;
    for (const auto& grid : grids) {
        total += grid.getAcousticBlockingFactor();
    }
    return total / grids.size(); // Average blocking
}
