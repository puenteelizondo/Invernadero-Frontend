import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Plus, Sprout } from "lucide-react";
import { useCreateGreenhouse, useGreenhouses } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import { Button, EmptyState, ErrorText, Input, Label, Modal, PageHeader, Skeleton } from "../components/ui";
import { GreenhouseScene, formatHour, phaseLabel, useLocalHour } from "../components/GreenhouseScene";
import type { Greenhouse } from "../types";
import { Layout } from "../components/Layout";

export function GreenhousesPage() {
  const { data: greenhouses, isLoading } = useGreenhouses();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateGreenhouse();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { name, description },
      {
        onSuccess: (g) => {
          setOpen(false);
          setName("");
          setDescription("");
          navigate(`/greenhouses/${g.id}`);
        },
      }
    );
  }

  return (
    <Layout>
      <PageHeader
        icon={Sprout}
        title="Invernaderos"
        subtitle="Elige uno para ver sus sensores, actuadores y miembros."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nuevo invernadero
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-[1.25rem]" />
          ))}
        </div>
      ) : !greenhouses?.length ? (
        <EmptyState title="Todavía no tienes invernaderos" hint="Crea el primero para empezar." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {greenhouses.map((g) => (
            <GreenhouseCard key={g.id} greenhouse={g} />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo invernadero" icon={Sprout}>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </div>
          <div className="mb-4">
            <Label>Descripción (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <ErrorText>{create.isError ? formatApiError(create.error) : null}</ErrorText>
          <div className="mt-5 flex justify-end gap-2 border-t border-neutral-200/70 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={create.isPending}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}

/** Tarjeta de un invernadero con su cielo a la hora local de su zona horaria. */
function GreenhouseCard({ greenhouse: g }: { greenhouse: Greenhouse }) {
  const hour = useLocalHour(g.timezone);
  return (
    <Link
      to={`/greenhouses/${g.id}`}
      className="group block overflow-hidden rounded-[1.25rem] border border-neutral-200/80 bg-surface shadow-pane transition duration-200 ease-leaf hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift"
    >
      <GreenhouseScene hour={hour} humidity={40} className="h-32">
        <span className="num absolute left-3 top-3 rounded-full bg-surface/85 px-2.5 py-1 text-xs font-semibold text-neutral-800 backdrop-blur">
          {formatHour(hour)} <span className="font-normal text-neutral-600">{phaseLabel(hour).toLowerCase()}</span>
        </span>
      </GreenhouseScene>
      <div className="p-4">
        <h3 className="truncate text-lg font-semibold text-neutral-900 group-hover:text-brand-800">{g.name}</h3>
        <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm text-neutral-600">{g.description || "Sin descripción."}</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
            <MapPin className="h-3 w-3" /> {g.zones.length} zona{g.zones.length === 1 ? "" : "s"}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
              g.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${g.is_active ? "bg-emerald-500" : "bg-neutral-400"}`} />
            {g.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>
    </Link>
  );
}
