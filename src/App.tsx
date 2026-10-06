import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/Layout";
import { PageErrorBoundary } from "./components/PageErrorBoundary";
import { Toaster } from "./components/Toaster";
import { usePauseWhenHidden } from "./lib/theme";

// Cada página se descarga solo cuando se visita (code-splitting).
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const LoginPage = page(() => import("./pages/LoginPage"), "LoginPage");
const ForgotPasswordPage = page(() => import("./pages/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = page(() => import("./pages/ResetPasswordPage"), "ResetPasswordPage");
const GreenhousesPage = page(() => import("./pages/GreenhousesPage"), "GreenhousesPage");
const GreenhouseDashboardPage = page(() => import("./pages/GreenhouseDashboardPage"), "GreenhouseDashboardPage");
const SensorsPage = page(() => import("./pages/SensorsPage"), "SensorsPage");
const SensorDetailPage = page(() => import("./pages/SensorDetailPage"), "SensorDetailPage");
const ActuatorsPage = page(() => import("./pages/ActuatorsPage"), "ActuatorsPage");
const ActuatorDetailPage = page(() => import("./pages/ActuatorDetailPage"), "ActuatorDetailPage");
const ZonesPage = page(() => import("./pages/ZonesPage"), "ZonesPage");
const DeviceDetailPage = page(() => import("./pages/DeviceDetailPage"), "DeviceDetailPage");
const DevicesPage = page(() => import("./pages/DevicesPage"), "DevicesPage");
const MembershipsPage = page(() => import("./pages/MembershipsPage"), "MembershipsPage");
const ExportPage = page(() => import("./pages/ExportPage"), "ExportPage");
const AlertsPage = page(() => import("./pages/AlertsPage"), "AlertsPage");
const CatalogPage = page(() => import("./pages/CatalogPage"), "CatalogPage");
const UsersPage = page(() => import("./pages/UsersPage"), "UsersPage");
const ControlPage = page(() => import("./pages/ControlPage"), "ControlPage");
const NotFoundPage = page(() => import("./pages/NotFoundPage"), "NotFoundPage");

export function App() {
  usePauseWhenHidden();
  return (
    <>
      <PageErrorBoundary>
        <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/greenhouses" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Todo lo que requiere sesión comparte el mismo marco (menú + barra). */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/greenhouses" element={<GreenhousesPage />} />
              <Route path="/greenhouses/:id" element={<GreenhouseDashboardPage />} />
              <Route path="/greenhouses/:id/sensors" element={<SensorsPage />} />
              <Route path="/greenhouses/:id/sensors/:sensorId" element={<SensorDetailPage />} />
              <Route path="/greenhouses/:id/actuators" element={<ActuatorsPage />} />
              <Route path="/greenhouses/:id/actuators/:actuatorId" element={<ActuatorDetailPage />} />
              <Route path="/greenhouses/:id/control" element={<ControlPage />} />
              <Route path="/greenhouses/:id/alerts" element={<AlertsPage />} />
              <Route path="/greenhouses/:id/zones" element={<ZonesPage />} />
              <Route path="/greenhouses/:id/devices" element={<DevicesPage />} />
              <Route path="/greenhouses/:id/devices/:deviceId" element={<DeviceDetailPage />} />
              <Route path="/greenhouses/:id/members" element={<MembershipsPage />} />
              <Route path="/greenhouses/:id/export" element={<ExportPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </PageErrorBoundary>
      <Toaster />
    </>
  );
}
