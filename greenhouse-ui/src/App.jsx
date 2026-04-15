import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import AdvancedPanel from './pages/AdvancedPanel';
import TemperatureDetails from './pages/TemperatureDetails';
import HumidityDetails from './pages/HumidityDetails';
import LightDetails from './pages/LightDetails';
import Co2Details from './pages/Co2Details';
import './index.css';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');

  const handleLogin = (credentials) => {
    setUser({ 
      email: credentials.email, 
      loginTime: new Date().toLocaleTimeString('es-MX') 
    });
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCurrentView('dashboard');
  };

  // Lógica de Refugio: Si no está logueado, mostrar Login
  if (!isLoggedIn) return <Login onLogin={handleLogin} />;
  
  // Enrutador manual basado en el estado currentView
  const renderView = () => {
    const backToDashboard = () => setCurrentView('dashboard');

    switch (currentView) {
      case 'history':
        return <History onBack={backToDashboard} />;
      case 'advanced':
        return <AdvancedPanel onBack={backToDashboard} />;
      case 'temperature':
        return <TemperatureDetails onBack={backToDashboard} />;
      case 'humidity':
        return <HumidityDetails onBack={backToDashboard} />;
      case 'light':
        return <LightDetails onBack={backToDashboard} />;
      case 'co2':
        return <Co2Details onBack={backToDashboard} />;
      default:
        return (
          <Dashboard 
            user={user} 
            onLogout={handleLogout} 
            onGoToHistory={() => setCurrentView('history')}
            onGoToAdvanced={() => setCurrentView('advanced')}
            onGoToTemperature={() => setCurrentView('temperature')}
            onGoToHumidity={() => setCurrentView('humidity')}
            onGoToLight={() => setCurrentView('light')}
            onGoToCo2={() => setCurrentView('co2')}
          />
        );
    }
  };

  return renderView();
}