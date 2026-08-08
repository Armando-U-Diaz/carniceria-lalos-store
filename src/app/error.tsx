"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="not-found"><span><AlertTriangle size={40} /></span><h1>Algo no salió como esperábamos.</h1><p>No pudimos cargar esta sección. Inténtalo de nuevo en un momento.</p><button className="button primary" onClick={reset}>Volver a intentar</button></section>;
}
