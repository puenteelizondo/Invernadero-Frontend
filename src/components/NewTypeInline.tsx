import { useState } from "react";
import { Plus } from "lucide-react";
import { useCreateActuatorType, useCreateSensorType } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import { Button, ErrorText, Hint, Input, Label } from "./ui";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

/**
 * Crea un tipo nuevo PROPIO del invernadero actual (solo lo verán sus
 * miembros) sin salir de la ventana de "Agregar sensor/actuador". Lo
 * pueden crear el Owner del invernadero y el staff; si no, el backend
 * responde 403 y se muestra aquí el motivo.
 */
export function NewTypeInline({
  kind,
  greenhouseId,
  canCreate,
  onCreated,
}: {
  kind: "sensor" | "actuator";
  greenhouseId: number;
  canCreate: boolean;
  onCreated: (created: { id: number; name: string }) => void;
}) {
  const createSensorType = useCreateSensorType();
  const createActuatorType = useCreateActuatorType();
  const mutation = kind === "sensor" ? createSensorType : createActuatorType;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [unit, setUnit] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  if (!canCreate) {
    return (
      <p className="mb-4 text-sm text-neutral-500">
        Si necesitas un tipo que no aparece en la lista, pide al propietario del invernadero (o a un administrador) que lo
        cree.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        <Plus className="h-4 w-4" /> ¿No está en la lista? Crear un tipo nuevo
      </button>
    );
  }

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  async function create() {
    const base = { code: code.trim(), name: name.trim(), description: "", greenhouse: greenhouseId };
    const created =
      kind === "sensor"
        ? await createSensorType.mutateAsync({ ...base, default_unit: unit.trim(), valid_min: num(min), valid_max: num(max) })
        : await createActuatorType.mutateAsync(base);
    onCreated({ id: created.id, name: created.name });
    setOpen(false);
    setName("");
    setCode("");
    setCodeTouched(false);
    setUnit("");
    setMin("");
    setMax("");
  }

  const ready = name.trim() && code.trim() && (kind === "actuator" || unit.trim());

  return (
    <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
      <p className="mb-3 text-sm font-semibold text-neutral-800">
        Nuevo tipo de {kind === "sensor" ? "sensor" : "actuador"} <span className="font-normal text-neutral-500">(solo para este invernadero)</span>
      </p>
      <div className="mb-3">
        <Label>Nombre</Label>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!codeTouched) setCode(slugify(e.target.value));
          }}
          placeholder={kind === "sensor" ? "Luminosidad" : "Ventilador"}
        />
      </div>
      <div className="mb-3">
        <Label>Código</Label>
        <Input
          value={code}
          onChange={(e) => {
            setCode(slugify(e.target.value));
            setCodeTouched(true);
          }}
          placeholder={kind === "sensor" ? "luminosidad" : "ventilador"}
        />
        <Hint>Se genera solo a partir del nombre. Sin espacios ni acentos.</Hint>
      </div>
      {kind === "sensor" && (
        <>
          <div className="mb-3">
            <Label>Unidad</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} placeholder="°C, %, ppm, lux" />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <Label>Mínimo válido</Label>
              <Input type="number" step="any" value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div>
              <Label>Máximo válido</Label>
              <Input type="number" step="any" value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
          </div>
          <Hint>Las lecturas fuera de ese rango se rechazan. Déjalo vacío si no aplica.</Hint>
        </>
      )}
      <div className="mt-3">
        <ErrorText>{mutation.isError ? formatApiError(mutation.error) : null}</ErrorText>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="button" loading={mutation.isPending} disabled={!ready} onClick={create}>
          Crear tipo
        </Button>
      </div>
    </div>
  );
}
