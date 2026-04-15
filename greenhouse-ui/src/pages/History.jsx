import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';

// --- DATOS SIMULADOS ---
const dataCrecimiento = [
  { dia: 'Lun', valor: 60, temp: 22 },
  { dia: 'Mar', valor: 62, temp: 23 },
  { dia: 'Mié', valor: 65, temp: 24 },
  { dia: 'Jue', valor: 68, temp: 25 },
  { dia: 'Vie', valor: 71, temp: 24 },
  { dia: 'Sáb', valor: 74, temp: 22 },
  { dia: 'Dom', valor: 75, temp: 23 },
];

const historialEventos = [
  { id: 1, fecha: "15 Abr, 08:30 AM", evento: "Riego Automático", cultivo: "Tomates Cherry", estado: "OK" },
  { id: 2, fecha: "15 Abr, 07:00 AM", evento: "Luz UV (ON)", cultivo: "General", estado: "OK" },
  { id: 3, fecha: "14 Abr, 11:20 PM", evento: "Alerta Temp. Alta", cultivo: "Fresas", estado: "Atención" },
  { id: 4, fecha: "14 Abr, 06:00 PM", evento: "Nutrientes (N-P-K)", cultivo: "Lechuga Hidropónica", estado: "OK" },
  { id: 5, fecha: "13 Abr, 09:15 AM", evento: "Cosecha Parcial", cultivo: "Tomates Cherry", estado: "OK" },
];

// Opciones de cultivos para el menú
const cultivos = ["General", "Tomates Cherry", "Lechuga Hidropónica", "Fresas"];

// --- COMPONENTE PRINCIPAL ---
export default function History(props) {
  const [rango, setRango] = useState('Semana');
  const [cultivoActivo, setCultivoActivo] = useState('General');

  // Funciones para filtros de tiempo
  function seleccionarHoy() { setRango('Hoy'); }
  function seleccionarSemana() { setRango('Semana'); }
  function seleccionarMes() { setRango('Mes'); }

  // Estilos condicionales
  function obtenerClaseFiltro(nombreFiltro) {
    if (rango === nombreFiltro) return "px-3 py-1 rounded-md text-sm transition-colors bg-emerald-500/20 text-emerald-400 font-medium";
    return "px-3 py-1 rounded-md text-sm transition-colors text-slate-400 hover:bg-slate-700";
  }

  function obtenerClaseCultivo(nombreCultivo) {
    if (cultivoActivo === nombreCultivo) return "px-4 py-2 rounded-xl text-sm font-bold transition-all bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
    return "px-4 py-2 rounded-xl text-sm font-medium transition-all bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700";
  }

  function obtenerClaseEstado(estado) {
    if (estado === 'OK') return "px-2 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    return "px-2 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20";
  }

  // Filtrar los logs dependiendo del cultivo seleccionado
  const logsFiltrados = cultivoActivo === 'General' 
    ? historialEventos 
    : historialEventos.filter(log => log.cultivo === cultivoActivo || log.cultivo === 'General');

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* --- CABECERA --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <button onClick={props.onBack} className="text-emerald-500 hover:text-emerald-400 font-semibold mb-2 flex items-center gap-2 transition-colors">
              ← Regresar al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <span>📊</span> Panel de Analíticas
            </h1>
            <p className="text-slate-400 mt-1">Revisión de rendimiento y sensores del sistema</p>
          </div>
          
          <button className="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-6 py-2.5 rounded-xl font-semibold border border-slate-700 transition-all hover:border-emerald-500/30 flex items-center gap-2">
            <span>⬇️</span> Descargar CSV
          </button>
        </header>

        {/* --- SELECTOR DE CULTIVOS / CONTEXTO --- */}
        <div className="flex flex-wrap gap-3">
          {cultivos.map(function(cultivo) {
            return (
              <button 
                key={cultivo} 
                onClick={() => setCultivoActivo(cultivo)}
                className={obtenerClaseCultivo(cultivo)}
              >
                {cultivo === 'General' ? '🌐 Visión General' : `🌱 ${cultivo}`}
              </button>
            );
          })}
        </div>

        {/* --- SECCIÓN: GRÁFICA --- */}
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Evolución vs Temperatura Ambiente
              </h2>
              <p className="text-sm text-emerald-400 font-medium mt-1">
                Mostrando datos de: {cultivoActivo}
              </p>
            </div>
            
            <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700/50">
              <button onClick={seleccionarHoy} className={obtenerClaseFiltro('Hoy')}>24h</button>
              <button onClick={seleccionarSemana} className={obtenerClaseFiltro('Semana')}>7 Días</button>
              <button onClick={seleccionarMes} className={obtenerClaseFiltro('Mes')}>30 Días</button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataCrecimiento} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
                <XAxis dataKey="dia" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }} itemStyle={{ color: '#10b981', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="valor" name={cultivoActivo === 'General' ? "Salud Promedio (%)" : "Crecimiento (%)"} stroke="#10b981" strokeWidth={3} fill="url(#colorValor)" />
                <Line type="monotone" dataKey="temp" name="Temperatura (°C)" stroke="#f59e0b" strokeWidth={2} dot={{r: 4, fill: '#0f172a', stroke: '#f59e0b', strokeWidth: 2}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* --- SECCIÓN: TABLA DE EVENTOS --- */}
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 md:p-8 backdrop-blur-sm overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-100">Registro de Eventos y Sensores</h2>
            <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
              {logsFiltrados.length} registros encontrados
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="pb-4 font-medium px-2">Fecha y Hora</th>
                  <th className="pb-4 font-medium px-2">Afecta a</th>
                  <th className="pb-4 font-medium px-2">Evento del Sensor</th>
                  <th className="pb-4 font-medium px-2 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {logsFiltrados.map(function(item) {
                  return (
                    <tr key={item.id} className="hover:bg-slate-700/20 transition-colors group">
                      <td className="py-4 px-2 text-slate-300 text-sm whitespace-nowrap">{item.fecha}</td>
                      <td className="py-4 px-2 text-white font-medium text-sm">{item.cultivo}</td>
                      <td className="py-4 px-2 text-slate-300 text-sm">{item.evento}</td>
                      <td className="py-4 px-2 text-right">
                        <span className={obtenerClaseEstado(item.estado)}>
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {logsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 text-sm">
                      No hay registros recientes para este cultivo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}