import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log("main.tsx is starting...");

const rootEl = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootEl);
let hasRendered = false;

function renderApp() {
  if (hasRendered) return;
  hasRendered = true;
  root.render(<App />);
}

function renderMissingWasm() {
  if (hasRendered) return;
  hasRendered = true;
  root.render(
    <div className="min-h-screen bg-[#050816] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-xl rounded-3xl border border-amber-300/20 bg-slate-950/95 p-10 shadow-2xl shadow-amber-500/10">
        <h1 className="text-3xl font-bold text-amber-300 mb-4">C++ WASM Backend Required</h1>
        <p className="text-slate-300 mb-4">This app is configured to run only with the compiled C++ WebAssembly module. No JavaScript fallback is allowed.</p>
        <p className="text-slate-400 leading-relaxed">
          Build the simulation with Emscripten and place the generated file at <span className="font-mono text-amber-200">/src/wasm/saif_shell.js</span>, then reload the page.
        </p>
      </div>
    </div>
  );
}

function loadWasmThenRender() {
  const globalAny: any = window as any;
  if (typeof globalAny.createSaifShellModule === 'function') {
    globalAny.createSaifShellModule()
      .then((Module: any) => { globalAny.Module = Module; renderApp(); })
      .catch((e: any) => { console.warn('WASM module initialization failed', e); renderMissingWasm(); });
    return;
  }

  const scriptUrl = '/src/wasm/saif_shell.js';
  const s = document.createElement('script');
  s.src = scriptUrl;
  s.async = true;
  s.onload = () => {
    if (typeof (window as any).createSaifShellModule === 'function') {
      (window as any).createSaifShellModule()
        .then((Module: any) => { (window as any).Module = Module; renderApp(); })
        .catch((e: any) => { console.warn('WASM module initialization failed', e); renderMissingWasm(); });
    } else {
      console.warn('WASM loader script did not expose createSaifShellModule');
      renderMissingWasm();
    }
  };
  s.onerror = () => {
    console.warn('WASM script failed to load:', scriptUrl);
    renderMissingWasm();
  };
  document.head.appendChild(s);

  setTimeout(() => {
    const hasModule = !!(window as any).Module && typeof (window as any).Module.Simulator === 'function';
    if (!hasModule) {
      console.warn('WASM module did not initialize in time');
      renderMissingWasm();
    }
  }, 2000);
}

loadWasmThenRender();
