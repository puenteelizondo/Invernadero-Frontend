import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validación básica
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Correo electrónico inválido');
      return;
    }

    if (!password) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Simular carga y login
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin({ email, password });
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 relative overflow-hidden font-sans">
      
      {/* Efectos de luz decorativos */}
      <div className="absolute w-[600px] h-[600px] bg-emerald-600/15 blur-[100px] rounded-full top-[-150px] left-[-100px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute w-[500px] h-[500px] bg-teal-500/10 blur-[80px] rounded-full bottom-[-100px] right-[-100px] pointer-events-none mix-blend-screen"></div>

      {/* Tarjeta principal con glassmorphism */}
<div className="relative backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl shadow-black/40 rounded-3xl p-8 md:p-10 lg:p-12 w-full max-w-[400px] md:max-w-[500px] lg:max-w-[550px] mx-4 text-white transition-all duration-300 hover:border-white/30 animate-fadeIn">
        {/* Icono SVG del árbol */}
        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-4 rounded-2xl shadow-lg shadow-emerald-500/40 transform transition-transform duration-300 hover:scale-110">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="40" 
              height="40" 
              viewBox="0 0 56 56"
              className="text-emerald-950"
            >
              {/* Tronco */}
              <rect x="24" y="32" width="8" height="16" fill="currentColor" opacity="0.8"/>
              {/* Follaje en capas */}
              <circle cx="28" cy="18" r="10" fill="currentColor"/>
              <circle cx="20" cy="26" r="8" fill="currentColor" opacity="0.9"/>
              <circle cx="36" cy="26" r="8" fill="currentColor" opacity="0.9"/>
              <circle cx="16" cy="34" r="6" fill="currentColor" opacity="0.7"/>
              <circle cx="40" cy="34" r="6" fill="currentColor" opacity="0.7"/>
            </svg>
          </div>
        </div>

        {/* Encabezado */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
            Sistema de Invernadero
          </h1>
          <p className="text-emerald-200/80 text-sm font-medium">
            Cultiva y crece con tecnología
          </p>
        </div>

        {/* Mensajes de error */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm animate-pulse">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Email */}
          <div className="group">
            <label className="text-sm font-medium text-emerald-100 ml-1 block mb-2">
              Correo electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@correo.com"
                className="w-full p-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:bg-white/20 transition-all duration-200 group-hover:bg-white/15 group-hover:border-white/20"
              />
              <span className="absolute right-3 top-3 text-emerald-300/50">✉️</span>
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="group">
            <label className="text-sm font-medium text-emerald-100 ml-1 block mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:bg-white/20 transition-all duration-200 group-hover:bg-white/15 group-hover:border-white/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-emerald-300/70 hover:text-emerald-200 transition-colors"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Botón Principal */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:from-gray-500 disabled:to-gray-600 text-white py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] disabled:shadow-none transform hover:-translate-y-0.5 disabled:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⟳</span>
                Accediendo...
              </>
            ) : (
              'Acceder'
            )}
          </button>
        </form>

        {/* Divisor */}
        <div className="flex items-center gap-3 my-6 opacity-50">
          <div className="flex-1 h-px bg-white/20"></div>
          <span className="text-xs text-emerald-200/60">O</span>
          <div className="flex-1 h-px bg-white/20"></div>
        </div>

        {/* Link de registro */}
        <p className="text-center text-sm text-emerald-200/70">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            className="text-emerald-300 hover:text-emerald-200 font-semibold transition-colors"
          >
            Regístrate aquí
          </button>
        </p>

        {/* Pie de página */}
        <p className="text-center text-xs text-emerald-200/50 mt-6 font-medium">
          🌱 Monitoreo inteligente de ambiente
        </p>
      </div>

      {/* Burbujas decorativas flotantes */}
      <div className="absolute bottom-10 left-10 w-3 h-3 bg-emerald-400/20 rounded-full animate-float"></div>
      <div className="absolute top-1/4 right-20 w-2 h-2 bg-teal-400/20 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
      <div className="absolute bottom-1/3 right-10 w-4 h-4 bg-emerald-300/10 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
    </div>
  );
}