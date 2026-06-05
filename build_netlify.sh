#!/bin/bash
set -e

echo "🔨 Building Saif Shell - Netlify Deployment"
echo "==========================================="

# Store the saif-shell directory path
PROJECT_DIR="$(pwd)"
CPP_DIR="$(dirname "$PROJECT_DIR")/cpp"

echo "📍 Project directory: $PROJECT_DIR"
echo "📍 C++ source directory: $CPP_DIR"

# Clone and set up Emscripten SDK
echo "📦 Setting up Emscripten SDK..."
if [ ! -d "emsdk" ]; then
  git clone https://github.com/emscripten-core/emsdk.git
fi

cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd "$PROJECT_DIR"

# Create WASM output directory
mkdir -p src/wasm

# Verify C++ files exist
if [ ! -f "$CPP_DIR/main.cpp" ]; then
  echo "❌ Error: C++ files not found at $CPP_DIR"
  echo "Expected: $CPP_DIR/main.cpp"
  exit 1
fi

echo "🔗 Compiling C++ to WebAssembly..."
emcc "$CPP_DIR/main.cpp" "$CPP_DIR/HexGrid.cpp" "$CPP_DIR/DynamicWall.cpp" "$CPP_DIR/Simulator.cpp" \
  -o src/wasm/saif_shell.js \
  -O3 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="createSaifShellModule" \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  --bind

echo "✅ WASM Compilation Complete!"
echo "📊 Built files:"
ls -lh src/wasm/

echo "📦 Installing Node dependencies..."
npm install

echo "🏗️  Building Vite application..."
npm run build

echo "✅ Build Complete! Ready for deployment."
echo "📁 Publish directory: dist/"
