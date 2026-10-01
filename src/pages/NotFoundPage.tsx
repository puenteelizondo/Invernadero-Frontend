import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 text-center">
      <h1 className="text-3xl font-semibold text-neutral-900">404</h1>
      <p className="text-neutral-500">No encontramos esa página.</p>
      <Link to="/greenhouses" className="text-brand-600 hover:underline">
        Volver a Invernaderos
      </Link>
    </div>
  );
}
