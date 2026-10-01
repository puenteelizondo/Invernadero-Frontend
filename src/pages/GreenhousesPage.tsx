import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, Sprout } from "lucide-react";
import { useCreateGreenhouse, useGreenhouses } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import { Button, Card, EmptyState, ErrorText, Input, Label, Modal, PageHeader, Spinner } from "../components/ui";
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
        <Spinner />
      ) : !greenhouses?.length ? (
        <EmptyState title="Todavía no tienes invernaderos" hint="Crea el primero para empezar." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {greenhouses.map((g) => (
            <button key={g.id} onClick={() => navigate(`/greenhouses/${g.id}`)} className="group text-left">
              <div className="h-full overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm shadow-brand-900/5 transition duration-200 group-hover:-translate-y-1 group-hover:border-brand-300 group-hover:shadow-lg group-hover:shadow-brand-600/15">
                <div className="relative flex h-20 items-end bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-400 px-4 pb-3">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.12]"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%), linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(315deg, #fff 25%, transparent 25%)",
                      backgroundPosition: "20px 0, 20px 0, 0 0, 0 0",
                      backgroundSize: "40px 40px",
                    }}
                  />
                  <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/25 backdrop-blur">
                    <Sprout className="h-5 w-5 animate-sway text-white" />
                  </span>
                  <h3 className="relative truncate text-lg font-semibold text-white drop-shadow">{g.name}</h3>
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm text-neutral-500">{g.description || "Sin descripción."}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
                      <MapPin className="h-3 w-3" /> {g.zones.length} zona{g.zones.length === 1 ? "" : "s"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
                        g.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${g.is_active ? "bg-emerald-500" : "bg-neutral-400"}`} />
                      {g.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
            </button>
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
          <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
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
