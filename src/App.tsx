import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { GreenhousesPage } from "./pages/GreenhousesPage";
import { GreenhouseDashboardPage } from "./pages/GreenhouseDashboardPage";
import { SensorsPage } from "./pages/SensorsPage";
import { SensorDetailPage } from "./pages/SensorDetailPage";
import { ActuatorsPage } from "./pages/ActuatorsPage";
import { ActuatorDetailPage } from "./pages/ActuatorDetailPage";
import { ZonesPage } from "./pages/ZonesPage";
import { DeviceDetailPage } from "./pages/DeviceDetailPage";
import { DevicesPage } from "./pages/DevicesPage";
import { MembershipsPage } from "./pages/MembershipsPage";
import { ExportPage } from "./pages/ExportPage";
import { AlertsPage } from "./pages/AlertsPage";
import { CatalogPage } from "./pages/CatalogPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/greenhouses" replace />} />
      <Route
        path="/catalog"
        element={
          <ProtectedRoute>
            <CatalogPage />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/greenhouses"
        element={
          <ProtectedRoute>
            <GreenhousesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id"
        element={
          <ProtectedRoute>
            <GreenhouseDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/sensors"
        element={
          <ProtectedRoute>
            <SensorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/sensors/:sensorId"
        element={
          <ProtectedRoute>
            <SensorDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/actuators"
        element={
          <ProtectedRoute>
            <ActuatorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/actuators/:actuatorId"
        element={
          <ProtectedRoute>
            <ActuatorDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/alerts"
        element={
          <ProtectedRoute>
            <AlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/zones"
        element={
          <ProtectedRoute>
            <ZonesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/devices"
        element={
          <ProtectedRoute>
            <DevicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/devices/:deviceId"
        element={
          <ProtectedRoute>
            <DeviceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/members"
        element={
          <ProtectedRoute>
            <MembershipsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/greenhouses/:id/export"
        element={
          <ProtectedRoute>
            <ExportPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
