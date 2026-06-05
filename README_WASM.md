
18:45:12 [vite] hmr update /src/HexWallScene.tsx, /src/index.css

18:45:15 [vite] hmr update /src/HexWallScene.tsx, /src/index.css (x2)
18:46:08 [vite] Pre-transform error: Transform failed with 2 errors:
D:/OOP Project/saif-shell/src/EngineBridge.ts:169:18: ERROR: The symbol "dx" has already been declared
D:/OOP Project/saif-shell/src/EngineBridge.ts:170:18: ERROR: The symbol "dz" has already been declared

18:46:09 [vite] Internal server error: Transform failed with 2 errors:
D:/OOP Project/saif-shell/src/EngineBridge.ts:169:18: ERROR: The symbol "dx" has already been declared
D:/OOP Project/saif-shell/src/EngineBridge.ts:170:18: ERROR: The symbol "dz" has already been declared
  Plugin: vite:esbuild
  File: D:/OOP Project/saif-shell/src/EngineBridge.ts:169:18
  
  The symbol "dx" has already been declared
  167|              g.soundLevel = 30.0 + Math.min(soundFactor, 80.0);
  168|
  169|              const dx = sunPos.x - g.position.x;   
     |                    ^
  170|              const dz = sunPos.z - g.position.z;   
  171|              const groundDistance = Math.sqrt(dx*dx + dz*dz) || 1.0;

  The symbol "dz" has already been declared
  168|
  169|              const dx = sunPos.x - g.position.x;   
  170|              const dz = sunPos.z - g.position.z;   
     |                    ^
  171|              const groundDistance = Math.sqrt(dx*dx + dz*dz) || 1.0;
  172|              g.rotation.y = Math.atan2(dx, dz) * 180.0 / Math.PI;

      at failureErrorWithLog (D:\OOP Project\saif-shell\node_modules\esbuild\lib\main.js:1472:15)
      at D:\OOP Project\saif-shell\node_modules\esbuild\lib\main.js:755:50
      at responseCallbacks.<computed> (D:\OOP Project\saif-shell\node_modules\esbuild\lib\main.js:622:9)
      at handleIncomingPacket (D:\OOP Project\saif-shell\node_modules\esbuild\lib\main.js:677:12)
      at Socket.readFromStdout (D:\OOP Project\saif-shell\node_modules\esbuild\lib\main.js:600:7)
      at Socket.emit (node:events:508:28)
      at addChunk (node:internal/streams/readable:559:12) 
      at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
      at Readable.push (node:internal/streams/readable:390:5)
      at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)
Building the C++ core (WASM) and enabling it in the app

Prerequisites
- Emscripten SDK (emsdk) installed. See https://emscripten.org/docs/getting_started/downloads.html

Quick build (unix-like shell):

```bash
# from saif-shell/
./build_netlify.sh
```

What this does
- Compiles the C++ core with Embind to `src/wasm/saif_shell.js` (exports `createSaifShellModule`)
- Builds the Vite app

Local dev without Netlify script

```bash
# install emsdk, then in saif-shell/
emcc ../cpp/main.cpp ../cpp/HexGrid.cpp ../cpp/DynamicWall.cpp ../cpp/Simulator.cpp \
  -o src/wasm/saif_shell.js \
  -O3 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="createSaifShellModule" \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
  --bind

# then in saif-shell/:
npm install
npm run dev
```

Netlify deployment

Netlify is configured to compile the C++ core during build using `build_netlify.sh` and `netlify.toml`.
From the `saif-shell/` folder, the deployment build command is:

```bash
bash build_netlify.sh
```

This will:
- clone and activate `emsdk`
- compile the C++ simulation to `src/wasm/saif_shell.js`
- build the Vite app into `dist`

If you deploy with Netlify, it will automatically run the same script and publish `dist`.

How the frontend picks up WASM
- `src/main.tsx` injects `/src/wasm/saif_shell.js` and calls `createSaifShellModule()`.
- When the module initializes it sets `window.Module`.
- `src/EngineBridge.ts` detects `window.Module.Simulator` and instantiates the C++ `Simulator` via Embind.
- If the WASM module isn't available, a JS fallback simulator is used so the app still runs.

Notes / Troubleshooting
- Ensure `--bind` is present so Embind bindings are generated.
- If you prefer a global `Module` instead of `createSaifShellModule`, compile without `-s MODULARIZE=1` and `EXPORT_NAME` flags.
- Building Emscripten on Windows: use WSL or follow Emscripten Windows instructions.
