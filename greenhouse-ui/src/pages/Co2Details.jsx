import React, { useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- DATOS SIMULADOS (CO2 Disuelto en Agua - mg/L o ppm) ---
const datosCO2Acuatico = [
  { hora: '00:00', ppm: 15 }, { hora: '04:00', ppm: 18 },
  { hora: '08:00', ppm: 25 }, { hora: '12:00', ppm: 30 },
  { hora: '16:00', ppm: 28 }, { hora: '20:00', ppm: 20 },
];

const lineasAguaCO2 = [
  { id: 1, nombre: "Línea Tomates", valor: 28, estado: "Óptimo", icono: "🍅", color: "text-teal-400" },
  { id: 2, nombre: "Línea Lechugas", valor: 15, estado: "Bajo (Inyectando)", icono: "🥬", color: "text-emerald-400" },
  { id: 3, nombre: "Línea Fresas", valor: 25, estado: "Estable", icono: "🍓", color: "text-cyan-400" },
];

export default function Co2Details(props) {
  const [burbujeoActivo, setBurbujeoActivo] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 md:p-10 relative overflow-hidden">
      
      {/* Luz de fondo ambiental (Tonos Agua/Burbujas) */}
      <div className="absolute top-[-10%] right-[30%] w-[600px] h-[600px] bg-teal-500/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen fixed"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen fixed"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Cabecera */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <button onClick={props.onBack} className="text-emerald-500 hover:text-emerald-400 font-semibold mb-2 flex items-center gap-2 transition-colors">
              ← Regresar al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <span className="text-teal-400">🫧</span> CO₂ Disuelto en Solución
            </h1>
          </div>
          
          <button 
            onClick={() => setBurbujeoActivo(!burbujeoActivo)}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all border flex items-center gap-2 ${
              burbujeoActivo 
              ? 'bg-teal-500 text-slate-900 border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.4)]' 
              : 'bg-slate-800 text-teal-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>{burbujeoActivo ? '💧' : '🛑'}</span>
            {burbujeoActivo ? 'Inyector de CO₂: ACTIVO' : 'Iniciar Burbujeo'}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Medidor de CO2 Acuático */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
            <h2 className="text-lg font-bold text-slate-300 mb-8 w-full text-center">Nivel en Tanque Principal</h2>
            
            {/* Esfera de Burbujas */}
            <div className="relative w-56 h-56 flex items-center justify-center mb-6">
              {/* Anillo de contención simulando un tubo */}
              <div className="absolute inset-0 border-8 border-slate-700 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] z-30 pointer-events-none"></div>
              
              {/* Fondo líquido */}
              <div className="absolute inset-2 bg-slate-900 rounded-full overflow-hidden flex items-end justify-center z-10">
                 <div className={`w-full bg-gradient-to-t from-teal-600 to-cyan-400 opacity-60 transition-all duration-1000 ${burbujeoActivo ? 'h-[80%]' : 'h-[40%]'}`}></div>
                 
                 {/* Efecto de burbujas (CSS puro) si está activo */}
                 {burbujeoActivo && (
                   <div className="absolute inset-0 flex justify-between px-6 items-end pb-4 opacity-50">
                     <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                     <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                     <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                     <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                   </div>
                 )}
              </div>
              
              {/* Núcleo de Texto */}
              <div className="relative z-20 flex flex-col items-center justify-center bg-black/40 w-32 h-32 rounded-full backdrop-blur-sm border border-white/10">
                <span className="text-4xl font-black text-white">30</span>
                <span className="text-sm font-bold text-teal-400 tracking-widest mt-1">PPM</span>
              </div>
            </div>
            
            <div className="text-center bg-black/30 p-4 rounded-2xl border border-white/5 w-full">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Impacto en pH</p>
              <p className="text-teal-400 font-mono text-lg">pH Estable: 6.0</p>
            </div>
          </div>

          {/* Columna Derecha: Gráfica y Líneas de Riego */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Gráfica de CO2 Disuelto */}
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">Saturación de CO₂ (24h)</h3>
                <span className="text-xs bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full border border-teal-500/30">Línea Principal</span>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosCO2Acuatico}>
                    <defs>
                      <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hora" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px' }} itemStyle={{ color: '#14b8a6', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="ppm" stroke="#14b8a6" strokeWidth={3} fill="url(#colorCO2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensores Específicos por Línea de agua */}
            <h3 className="text-xl font-bold text-white mb-2">Saturación por Líneas de Riego</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lineasAguaCO2.map(function(linea) {
                return (
                  <div key={linea.id} className="bg-black/30 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800/60 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-2xl bg-slate-800 p-2.5 rounded-xl border border-slate-700">{linea.icono}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-teal-500/10 ${linea.color}`}>
                        {linea.estado.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-300 font-medium mb-1">{linea.nombre}</p>
                    
                    <div className="flex items-end gap-2">
                      <p className={`text-3xl font-black ${linea.color}`}>{linea.valor}</p>
                      <p className="text-xs text-slate-400 mb-1 font-mono">ppm</p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}