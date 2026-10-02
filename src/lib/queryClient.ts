import { QueryClient } from "@tanstack/react-query";

// Config compartida de React Query. reintentos bajos porque casi todo
// error 4xx (permisos, validación) no se arregla reintentando, y los
// datos de un invernadero cambian seguido por WebSocket de todas formas.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Claves de query centralizadas para invalidar de forma consistente
// desde cualquier hook/página.
export const qk = {
  me: ["me"] as const,
  greenhouses: ["greenhouses"] as const,
  greenhouse: (id: number) => ["greenhouses", id] as const,
  sensorTypes: ["sensor-types"] as const,
  actuatorTypes: ["actuator-types"] as const,
  sensors: (greenhouseId: number) => ["sensors", greenhouseId] as const,
  sensor: (id: number) => ["sensors", "detail", id] as const,
  sensorReadings: (sensorId: number) => ["readings", sensorId] as const,
  actuators: (greenhouseId: number) => ["actuators", greenhouseId] as const,
  actuator: (id: number) => ["actuators", "detail", id] as const,
  actuatorHistory: (actuatorId: number) => ["actuators", "history", actuatorId] as const,
  devices: (greenhouseId: number) => ["devices", greenhouseId] as const,
  zones: (greenhouseId: number) => ["zones", greenhouseId] as const,
  memberships: (greenhouseId: number) => ["memberships", greenhouseId] as const,
  alertRules: (greenhouseId: number) => ["alert-rules", greenhouseId] as const,
  // Prefijo común de todas las listas de alertas de un invernadero (para invalidar de golpe).
  alertsAll: (greenhouseId: number) => ["alerts", greenhouseId] as const,
  alerts: (greenhouseId: number, status: string, page: number) => ["alerts", greenhouseId, status, page] as const,
};
