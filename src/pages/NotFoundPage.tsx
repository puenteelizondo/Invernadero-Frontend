import { Link } from "react-router-dom";
import { SproutIllustration } from "../components/Illustrations";

export function NotFoundPage() {
  return (
    <div className="greenhouse-grid flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
      <SproutIllustration className="h-28 w-28" />
      <h1 className="text-4xl font-semibold text-neutral-900">Aquí no ha crecido nada</h1>
      <p className="max-w-sm text-neutral-600">Esta página no existe o cambió de lugar. Revisa la dirección o vuelve a tus invernaderos.</p>
      <Link
        to="/greenhouses"
        className="mt-2 inline-flex min-h-[44px] items-center rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800 dark:bg-brand-500 dark:text-neutral-50"
      >
        Ir a mis invernaderos
      </Link>
    </div>
  );
}
