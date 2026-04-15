import React, { useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- DATOS SIMULADOS ---
const datosHumedad = [
  { hora: '00:00', humedad: 70 }, { hora: '04:00', humedad: 72 },
  { hora: '08:00', humedad: 65 }, { hora: '12:00', humedad: 55 },
  { hora: '16:00', humedad: 60 }, { hora: '20:00', humedad: 68 },
];

const sensoresHumedad = [
  { id: 1, nombre: "Tomates Cherry", valor: 65, estado: "Óptimo", icono: "🍅", min: 60, max: 70 },
  { id: 2, nombre: "Lechuga Hidropónica", valor: 82, estado: "Alto", icono: "🥬", min: 70, max: 80 },
  { id: 3, nombre: "Fresas", valor: 60, estado: "Bajo", icono: "🍓", min: 65, max: 75 },
];

export default function HumidityDetails(props) {
  const [nebulizadores, setNebulizadores] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 md:p-10 relative overflow-hidden">
      
      {/* Luz de fondo ambiental (Tonos Cian/Azul) */}
      <div className="absolute top-[-10%] right-[20%] w-[600px] h-[600px] bg-cyan-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen fixed"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen fixed"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Cabecera */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <button onClick={props.onBack} className="text-emerald-500 hover:text-emerald-400 font-semibold mb-2 flex items-center gap-2 transition-colors">
              ← Regresar al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <span className="text-cyan-400">💧</span> Control de Humedad y Riego
            </h1>
          </div>
          
          <button 
            onClick={() => setNebulizadores(!nebulizadores)}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all border flex items-center gap-2 ${
              nebulizadores 
              ? 'bg-cyan-500 text-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
              : 'bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>{nebulizadores ? '🌧️' : '☁️'}</span>
            {nebulizadores ? 'Nebulizadores ON' : 'Activar Nebulizadores'}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Indicador Circular Principal */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
            <h2 className="text-lg font-bold text-slate-300 mb-8 w-full text-center">Humedad Relativa Promedio</h2>
            
            {/* Círculo de Nivel de Agua */}
            <div className="relative w-56 h-56 rounded-full border-4 border-slate-700 p-2 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] mb-4">
              {/* Olas/Fondo líquido animado con Tailwind */}
              <div className="absolute bottom-2 w-[95%] bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full overflow-hidden flex items-end justify-center transition-all duration-1000 shadow-[0_0_30px_rgba(6,182,212,0.3)]" style={{ height: '65%' }}>
                 <div className="absolute top-0 w-[200%] h-4 bg-white/20 rounded-full blur-[2px] animate-pulse"></div>
              </div>
              
              {/* Porcentaje en el centro */}
              <div className="relative z-20 flex flex-col items-center">
                <span className="text-6xl font-black text-white drop-shadow-lg">65<span className="text-3xl text-cyan-200">%</span></span>
              </div>
            </div>
            
            <p className="text-sm text-slate-400 mt-4 text-center">Nivel ideal de vapor de agua en el ambiente. El sistema está operando de manera eficiente.</p>
          </div>

          {/* Columna Derecha: Gráfica y Sensores */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Gráfica de Humedad */}
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">Tendencia Ambiental (24h)</h3>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30">Interior</span>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosHumedad}>
                    <defs>
                      <linearGradient id="colorHumedad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hora" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px' }} itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="humedad" stroke="#06b6d4" strokeWidth={3} fill="url(#colorHumedad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensores Específicos por Planta */}
            <h3 className="text-xl font-bold text-white mb-2">Humedad en Sustrato por Cultivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sensoresHumedad.map(function(sensor) {
                const isWarning = sensor.estado !== "Óptimo";
                
                return (
                  <div key={sensor.id} className="bg-black/30 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800/60 transition-colors relative overflow-hidden group">
                    {/* Efecto de alerta si no está óptimo */}
                    {isWarning && (
                      <div className={`absolute top-0 left-0 w-1 h-full ${sensor.estado === 'Alto' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                    )}
                    
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-2xl bg-slate-800 p-2.5 rounded-xl border border-slate-700">{sensor.icono}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                        isWarning 
                        ? (sensor.estado === 'Alto' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400') 
                        : 'bg-cyan-500/10 text-cyan-400'
                      }`}>
                        {sensor.estado.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-300 font-medium mb-2">{sensor.nombre}</p>
                    
                    <div className="flex items-end justify-between">
                      <p className={`text-4xl font-black ${isWarning ? (sensor.estado === 'Alto' ? 'text-amber-400' : 'text-red-400') : 'text-cyan-400'}`}>
                        {sensor.valor}%
                      </p>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Rango Ideal</p>
                        <p className="text-xs text-slate-400 font-mono">{sensor.min}% - {sensor.max}%</p>
                      </div>
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