import { useState } from "react";
import { useParams } from "react-router-dom";
import { Sheet } from "lucide-react";
import { useSensors, downloadReadingsExport } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import { Layout } from "../components/Layout";
import { Button, Card, ErrorText, Input, Label, PageHeader, Select } from "../components/ui";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 16);
}

/**
 * Exportar lecturas a Excel. El endpoint del backend
 * (GET /api/v1/readings/export/) no es "por invernadero": pide un
 * rango de fechas obligatorio y limita el resultado a los invernaderos
 * de los que eres miembro; "sensor" es solo un filtro extra opcional.
 * Por eso esta página deja elegir, además del rango, un sensor de ESTE
 * invernadero (o "todos", que exporta todo lo visible en ese rango).
 */
export function ExportPage() {
  const { id } = useParams();
  const greenhouseId = Number(id);
  const { data: sensors } = useSensors(greenhouseId);

  const [dateFrom, setDateFrom] = useState(isoDaysAgo(7));
  const [dateTo, setDateTo] = useState(isoDaysAgo(0));
  const [sensorId, setSensorId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onExport() {
    setLoading(true);
    setError(null);
    try {
      await downloadReadingsExport({
        dateFrom: new Date(dateFrom).toISOString(),
        dateTo: new Date(dateTo).toISOString(),
        sensorId: sensorId || undefined,
      });
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <PageHeader icon={Sheet} title="Exportar lecturas" subtitle="Genera un Excel con las lecturas de un rango de fechas." />

      <Card className="max-w-lg">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <Label>Desde</Label>
            <Input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="mb-4">
          <Label>Sensor (opcional)</Label>
          <Select
            value={sensorId}
            onChange={(e) => setSensorId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Todos los sensores de mis invernaderos</option>
            {sensors?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <ErrorText>{error}</ErrorText>
        <Button onClick={onExport} loading={loading} className="mt-2">
          <Sheet className="h-4 w-4" /> Descargar Excel
        </Button>
      </Card>
    </Layout>
  );
}
