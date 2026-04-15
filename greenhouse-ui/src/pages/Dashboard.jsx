import React, { useState } from 'react';

// Sub-componente para las tarjetas de sensores
function MetricCard({ title, value, icon, status, color, animate, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 transition-all duration-300 group shadow-lg ${
        onClick ? 'cursor-pointer hover:bg-white/20 hover:shadow-2xl hover:-translate-y-2 hover:border-emerald-500/50' : 'hover:bg-white/15'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-white/5 rounded-2xl border border-white/10 ${animate ? 'group-hover:animate-pulse' : ''}`}>
           <span className="text-3xl">{icon}</span>
        </div>
        <span className={`text-xs px-3 py-1.5 font-semibold rounded-full border ${
          status === 'Óptima' || status === 'Normal' || status === 'Equilibrio' || status === 'Activa'
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          : status === 'Alerta' ? 'bg-red-500/20 text-red-300 border-red-500/30' 
          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        }`}>
          {status}
        </span>
      </div>
      <h3 className="text-emerald-100/70 text-sm font-medium mb-1">{title}</h3>
      <div className="flex items-end gap-2">
         <p className="text-4xl font-bold text-white tracking-tight">{value}</p>
      </div>
      <div className={`mt-5 h-1.5 bg-gradient-to-r ${color} rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-300`}></div>
    </div>
  );
}

// Sub-componente para las tarjetas de cultivos
function PlantCard({ name, status, progress, lastWatered, imageIcon }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 text-8xl opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">{imageIcon}</div>
      <div className="text-4xl mb-4 relative z-10">{imageIcon}</div>
      <h3 className="text-white font-bold text-lg mb-1 relative z-10">{name}</h3>
      <p className="text-emerald-200/80 text-sm font-medium mb-5 relative z-10">{status}</p>
      <div className="mb-5 relative z-10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-emerald-100/60 font-medium">Desarrollo</span>
          <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md">{progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-4 border-t border-white/10 relative z-10">
        <span className="text-blue-300">💧</span>
        <p className="text-xs text-emerald-100/60 font-medium">Regado: <span className="text-white/90">{lastWatered}</span></p>
      </div>
    </div>
  );
}

// Sub-componente de Control
function ControlPanel({ onGoToAdvanced }) {
  const [pumpState, setPumpState] = useState(false);
  const [lightState, setLightState] = useState(true);

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 lg:col-span-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-6">
           <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#34d399]"></div>
           <h2 className="text-lg font-bold text-white">Controles Activos</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
             <div className="flex items-center gap-3">
               <span className="text-2xl text-blue-400">🌊</span>
               <div>
                 <p className="text-sm font-bold text-white">Bomba de Agua</p>
                 <p className="text-xs text-emerald-200/50">{pumpState ? 'Encendida' : 'Apagada'}</p>
               </div>
             </div>
             <button onClick={() => setPumpState(!pumpState)} className={`w-12 h-6 rounded-full relative transition-colors ${pumpState ? 'bg-emerald-500' : 'bg-slate-600'}`}>
               <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${pumpState ? 'left-7' : 'left-1'}`}></div>
             </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
             <div className="flex items-center gap-3">
               <span className="text-2xl text-yellow-400">💡</span>
               <div>
                 <p className="text-sm font-bold text-white">Luces UV</p>
                 <p className="text-xs text-emerald-200/50">{lightState ? 'Ciclo 18/6' : 'Apagadas'}</p>
               </div>
             </div>
             <button onClick={() => setLightState(!lightState)} className={`w-12 h-6 rounded-full relative transition-colors ${lightState ? 'bg-emerald-500' : 'bg-slate-600'}`}>
               <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${lightState ? 'left-7' : 'left-1'}`}></div>
             </button>
          </div>
        </div>
      </div>
      <button onClick={onGoToAdvanced} className="w-full mt-6 py-3 border border-emerald-500/30 text-emerald-300 font-semibold rounded-xl hover:bg-emerald-500/10 transition-colors text-sm">
        Ver Panel Avanzado →
      </button>
    </div>
  );
}

// COMPONENTE DASHBOARD COMPLETO
export default function Dashboard({ user, onLogout, onGoToHistory, onGoToAdvanced, onGoToTemperature, onGoToHumidity, onGoToLight, onGoToCo2 }) {  
  return (
    <div className="min-h-screen bg-[#0f172a] relative overflow-hidden font-sans">
      
      {/* Luces de fondo decorativas */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none fixed"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none fixed"></div>

      <div className="max-w-[1400px] mx-auto p-6 md:p-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl text-slate-900">🌿</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Panel de Control</h1>
              <p className="text-emerald-200/70 text-sm">Usuario: <span className="text-emerald-100">{user?.email}</span></p>
            </div>
          </div>
          <button onClick={onLogout} className="px-5 py-2.5 bg-white/5 hover:bg-red-500/20 text-emerald-100 hover:text-red-300 rounded-xl border border-white/10 transition-all text-sm font-semibold">
            Cerrar sesión →
          </button>
        </div>

        {/* Grid de Sensores */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard
              title="Temperatura Interna"
              value="24.2°C"
              icon="🌡️"
              status="Óptima"
              color="from-rose-500 to-orange-500"
              animate={true}
              onClick={onGoToTemperature}
            />
            <MetricCard
              title="Humedad Relativa"
              value="65%"
              icon="💧"
              status="Normal"
              color="from-blue-500 to-cyan-400"
              onClick={onGoToHumidity}
            />
            <MetricCard
              title="Intensidad Lumínica"
              value="850 lux"
              icon="☀️"
              status="Activa"
              color="from-amber-400 to-orange-400"
              onClick={onGoToLight}
            />
            <MetricCard
              title="Niveles de CO₂ (Agua)"
              value="30 ppm"
              icon="🌬️"
              status="Equilibrio"
              color="from-emerald-400 to-teal-400"
              onClick={onGoToCo2}
            />
          </div>

          {/* Panel de Control Lateral */}
          <ControlPanel onGoToAdvanced={onGoToAdvanced} />
        </div>

        {/* Sección de Cultivos */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-4">
             <div>
               <h2 className="text-2xl font-bold text-white mb-1">Estado de Cultivos</h2>
               <p className="text-sm text-emerald-100/50">Monitoreo por sector</p>
             </div>
             <button onClick={onGoToHistory} className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">Historial completo →</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PlantCard name="Tomates Cherry" status="Fructificación" progress={85} lastWatered="Hace 2h" imageIcon="🍅" />
            <PlantCard name="Lechuga Hidro" status="Crecimiento" progress={60} lastWatered="Hace 4h" imageIcon="🥬" />
            <PlantCard name="Fresas" status="Floración" progress={75} lastWatered="Hace 1h" imageIcon="🍓" />
          </div>
        </div>
        
      </div>
    </div>
  );
}