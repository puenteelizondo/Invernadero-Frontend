import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useCalm } from "../lib/motion";

/**
 * Número que "rueda" suavemente del valor anterior al nuevo cuando
 * llega una lectura. Conserva los decimales del dato (máx. `maxDecimals`)
 * y usa cifras tabulares para que no baile el ancho.
 */
export function AnimatedNumber({
  value,
  maxDecimals = 2,
  className = "",
}: {
  value: number | null | undefined;
  maxDecimals?: number;
  className?: string;
}) {
  const calm = useCalm();
  const decimals = value == null ? 0 : Math.min(maxDecimals, (String(value).split(".")[1] ?? "").length);
  const [shown, setShown] = useState(value ?? 0);
  const prev = useRef(value ?? 0);

  useEffect(() => {
    if (value == null) return;
    if (calm || prev.current === value) {
      setShown(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    prev.current = value;
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
  }, [value, calm]);

  if (value == null) return <span className={className}>—</span>;
  return (
    <span className={`num ${className}`}>
      {shown.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}
