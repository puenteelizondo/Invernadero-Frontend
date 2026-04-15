import React, { useState } from 'react';

export default function AdvancedPanel({ onBack }) {
  const [lightIntensity, setLightIntensity] = useState(75);
  const [fanSpeed, setFanSpeed] = useState(40);
  const [autoWatering, setAutoWatering] = useState(true);

  return (
    <div className="min-h-screen bg-[#0f172a] relative overflow-hidden font-sans pb-10">
      
      {/* Fondos Decorativos */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen fixed"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none mix-blend-screen fixed"></div>

      <div className="max-w-[1200px] mx-auto p-6 md:p-8 relative z-10">
        
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-white/10 pb-6">
          <div>
            <button 
              onClick={onBack}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium mb-4 flex items-center gap-1 transition-colors"
            >
              ← Volver al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight flex items-center gap-3">
              <span className="text-2xl">⚙️</span> Configuración Avanzada
            </h1>
            <p className="text-emerald-200/70 text-sm font-medium">
              Sintonía fina, automatizaciones y monitoreo en vivo
            </p>
          </div>
          
          <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10 flex items-center gap-2">
            Guardar Cambios
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Controles Precisos y Automatización */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Controles de Precisión */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span>🎛️</span> Controles de Precisión
              </h2>
              
              <div className="space-y-8">
                {/* Slider Luz */}
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Espectro Lumínico UV</h3>
                      <p className="text-xs text-slate-400">Ajusta la intensidad de las lámparas de crecimiento</p>
                    </div>
                    <span className="text-emerald-400 font-bold bg-emerald-400/10 px-3 py-1 rounded-lg">
                      {lightIntensity}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={lightIntensity}
                    onChange={(e) => setLightIntensity(e.target.value)}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Slider Ventilación */}
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Potencia de Extracción</h3>
                      <p className="text-xs text-slate-400">Velocidad de los ventiladores principales</p>
                    </div>
                    <span className="text-blue-400 font-bold bg-blue-400/10 px-3 py-1 rounded-lg">
                      {fanSpeed}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={fanSpeed}
                    onChange={(e) => setFanSpeed(e.target.value)}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Reglas de Automatización */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🤖</span> Reglas Automáticas
                </h2>
                <button className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors">
                  + Nueva Regla
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white mb-1">Riego Inteligente</p>
                    <p className="text-xs text-slate-400">Si humedad del suelo &lt; 30%, regar por 5 mins</p>
                  </div>
                  <button 
                    onClick={() => setAutoWatering(!autoWatering)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${autoWatering ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${autoWatering ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white mb-1">Control Térmico</p>
                    <p className="text-xs text-slate-400">Si temperatura &gt; 28°C, ventiladores al 100%</p>
                  </div>
                  <button className="w-12 h-6 rounded-full transition-colors relative bg-emerald-500">
                    <div className="w-4 h-4 rounded-full bg-white absolute top-1 left-7"></div>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Columna Derecha: Cámara en Vivo */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">Cámara Sector 1</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-red-400 font-bold tracking-wider">LIVE</span>
                </div>
              </div>
              
              {/* Simulador de Video */}
              <div className="flex-1 bg-black/50 rounded-2xl border border-white/10 relative overflow-hidden min-h-[250px] flex items-center justify-center group cursor-pointer">
                <div className="absolute inset-0 bg-emerald-900/20 mix-blend-overlay"></div>
                {/* Rejilla decorativa para simular interfaz de cámara */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                
                <div className="text-center relative z-10">
                  <span className="text-5xl opacity-50 group-hover:scale-110 transition-transform block mb-2">🌿</span>
                  <p className="text-xs text-white/50 font-mono">CAM-01 / NO SIGNAL ERROR</p>
                  <p className="text-[10px] text-white/30 font-mono mt-1">Simulación activa</p>
                </div>

                <div className="absolute bottom-3 left-3 text-[10px] font-mono text-white/50">
                  REC • 1080p
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] font-mono text-white/50">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>

              <button className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium rounded-xl transition-colors">
                Cambiar de Cámara ⟳
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}