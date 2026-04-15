import React, { useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- DATOS SIMULADOS ---
const datosLuz = [
  { hora: '00:00', lux: 0 }, { hora: '04:00', lux: 0 },
  { hora: '08:00', lux: 450 }, { hora: '12:00', lux: 850 },
  { hora: '16:00', lux: 720 }, { hora: '20:00', lux: 200 },
];

const sensoresLuz = [
  { id: 1, nombre: "Tomates Cherry", valor: 850, estado: "DLI Alcanzado", icono: "🍅", color: "text-amber-400" },
  { id: 2, nombre: "Lechuga Hidropónica", valor: 600, estado: "Suficiente", icono: "🥬", color: "text-yellow-400" },
  { id: 3, nombre: "Fresas", valor: 800, estado: "Luz UV Activa", icono: "🍓", color: "text-orange-400" },
];

export default function LightDetails(props) {
  const [lucesArtificiales, setLucesArtificiales] = useState(true);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 md:p-10 relative overflow-hidden">
      
      {/* Luz de fondo ambiental (Tonos Ámbar/Amarillo) */}
      <div className="absolute top-[-10%] right-[30%] w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen fixed"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen fixed"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Cabecera */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <button onClick={props.onBack} className="text-emerald-500 hover:text-emerald-400 font-semibold mb-2 flex items-center gap-2 transition-colors">
              ← Regresar al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <span className="text-amber-400">☀️</span> Espectro e Intensidad Lumínica
            </h1>
          </div>
          
          <button 
            onClick={() => setLucesArtificiales(!lucesArtificiales)}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all border flex items-center gap-2 ${
              lucesArtificiales 
              ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
              : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>{lucesArtificiales ? '💡' : '🔌'}</span>
            {lucesArtificiales ? 'Luces UV: ENCENDIDAS' : 'Luces UV: APAGADAS'}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Sol Digital (Radiación) */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
            <h2 className="text-lg font-bold text-slate-300 mb-8 w-full text-center">Recepción de Fotones (PAR)</h2>
            
            {/* Esfera Lumínica */}
            <div className="relative w-56 h-56 flex items-center justify-center mb-6">
              {/* Halos de luz */}
              <div className={`absolute inset-0 bg-gradient-to-tr from-orange-500 to-yellow-300 rounded-full blur-[20px] opacity-40 ${lucesArtificiales ? 'animate-pulse' : 'opacity-10'}`}></div>
              <div className={`absolute inset-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full blur-[10px] ${lucesArtificiales ? 'opacity-80' : 'opacity-20'}`}></div>
              
              {/* Núcleo */}
              <div className="relative z-20 w-40 h-40 bg-slate-900 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center shadow-[inset_0_0_30px_rgba(245,158,11,0.2)]">
                <span className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">850</span>
                <span className="text-sm font-bold text-amber-400 tracking-widest mt-1">LUX</span>
              </div>
            </div>
            
            <div className="text-center bg-black/30 p-4 rounded-2xl border border-white/5 w-full">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Fotoperiodo Actual</p>
              <p className="text-amber-400 font-mono text-lg">18h Luz / 6h Oscuridad</p>
            </div>
          </div>

          {/* Columna Derecha: Gráfica y Sensores */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Gráfica de Luz */}
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">Ciclo Solar y Artificial (24h)</h3>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">Luz Mixta</span>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosLuz}>
                    <defs>
                      <linearGradient id="colorLuz" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hora" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px' }} itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="lux" stroke="#f59e0b" strokeWidth={3} fill="url(#colorLuz)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensores Específicos por Planta */}
            <h3 className="text-xl font-bold text-white mb-2">Recepción por Cultivo (DLI)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sensoresLuz.map(function(sensor) {
                return (
                  <div key={sensor.id} className="bg-black/30 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800/60 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-2xl bg-slate-800 p-2.5 rounded-xl border border-slate-700">{sensor.icono}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500/10 ${sensor.color}`}>
                        {sensor.estado.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-300 font-medium mb-1">{sensor.nombre}</p>
                    
                    <div className="flex items-end gap-2">
                      <p className={`text-3xl font-black ${sensor.color}`}>{sensor.valor}</p>
                      <p className="text-xs text-slate-400 mb-1 font-mono">lux</p>
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