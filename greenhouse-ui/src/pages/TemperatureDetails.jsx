import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const datosTemperatura = [
  { hora: '00:00', temp: 18 }, { hora: '04:00', temp: 17 },
  { hora: '08:00', temp: 20 }, { hora: '12:00', temp: 25 },
  { hora: '16:00', temp: 24 }, { hora: '20:00', temp: 21 },
];

const sensoresPlantas = [
  { id: 1, nombre: "Tomates Cherry", temp: 25.1, estado: "Ideal", icono: "🍅", color: "text-rose-400" },
  { id: 2, nombre: "Lechuga Hidropónica", temp: 22.8, estado: "Fresco", icono: "🥬", color: "text-emerald-400" },
  { id: 3, nombre: "Fresas", temp: 24.5, estado: "Estable", icono: "🍓", color: "text-red-400" },
];

export default function TemperatureDetails(props) {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 md:p-10 relative overflow-hidden">
      
      {/* Luz de fondo térmica */}
      <div className="absolute top-[-20%] left-[30%] w-[800px] h-[800px] bg-rose-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen fixed"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        <header className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <button onClick={props.onBack} className="text-emerald-500 hover:text-emerald-400 font-semibold mb-2 flex items-center gap-2">
              ← Regresar al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <span className="text-rose-500">🌡️</span> Análisis Térmico por Sectores
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Termómetro Principal */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
            <h2 className="text-xl font-bold text-slate-200 mb-8 w-full text-center">Promedio del Invernadero</h2>
            
            {/* Diseño del Termómetro "Glassmorphism" */}
            <div className="relative w-16 h-64 bg-black/40 rounded-full border border-white/5 p-2 flex flex-col justify-end shadow-inner mb-8">
              {/* Marcas del termómetro */}
              <div className="absolute left-[-20px] h-full flex flex-col justify-between py-4 text-xs text-slate-500 font-mono">
                <span>40°</span><span>30°</span><span>20°</span><span>10°</span>
              </div>
              
              {/* Líquido (Relleno) */}
              <div className="w-full bg-gradient-to-t from-orange-500 to-rose-500 rounded-full relative z-10 shadow-[0_0_15px_rgba(244,63,94,0.5)] transition-all duration-1000" style={{ height: '65%' }}>
                {/* Brillo del cristal */}
                <div className="absolute top-0 right-1 w-2 h-full bg-white/20 rounded-full"></div>
              </div>
              
              {/* Base del termómetro (Bulbo) */}
              <div className="absolute -bottom-8 -left-4 w-24 h-24 bg-gradient-to-tr from-orange-600 to-rose-500 rounded-full border-8 border-slate-800 flex items-center justify-center z-20 shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                <span className="text-white font-bold text-xl drop-shadow-md">24.2°</span>
              </div>
            </div>
            
            <div className="mt-10 text-center">
              <p className="text-sm text-slate-400">Estado de climatización</p>
              <p className="text-emerald-400 font-bold bg-emerald-400/10 px-4 py-1 rounded-full inline-block mt-2">En Rango Óptimo</p>
            </div>
          </div>

          {/* Columna Derecha: Sensores de Plantas y Gráfica */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Gráfica Mini */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-slate-200 mb-4">Fluctuación Térmica (24h)</h3>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosTemperatura}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hora" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} itemStyle={{ color: '#f43f5e' }} />
                    <Area type="monotone" dataKey="temp" stroke="#f43f5e" strokeWidth={3} fill="url(#colorTemp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensores por Planta */}
            <h3 className="text-xl font-bold text-white mb-2">Micro-Climas por Cultivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sensoresPlantas.map(function(sensor) {
                return (
                  <div key={sensor.id} className="bg-black/30 border border-slate-700 rounded-2xl p-5 hover:bg-black/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-3xl bg-slate-800 p-2 rounded-xl">{sensor.icono}</span>
                      <span className="text-[10px] text-slate-400 font-mono tracking-wider">SENSOR-0{sensor.id}</span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium mb-1">{sensor.nombre}</p>
                    <div className="flex items-end gap-2">
                      <p className={`text-3xl font-bold ${sensor.color}`}>{sensor.temp}°</p>
                      <p className="text-xs text-slate-400 mb-1">{sensor.estado}</p>
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