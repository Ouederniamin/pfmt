"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-warm-cream px-4 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-rose/10">
        <AlertTriangle className="h-8 w-8 text-accent-rose" />
      </div>
      <h1 className="font-serif text-2xl font-bold text-foreground">
        Une erreur est survenue
      </h1>
      <p className="mt-2 max-w-md text-sm text-text-muted">
        Nous sommes désolés, quelque chose s&apos;est mal passé. Veuillez réessayer ou
        revenir à l&apos;accueil.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={reset} variant="outline" className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </Button>
        <Button asChild className="gap-1.5">
          <Link href="/">
            <Home className="h-4 w-4" />
            Accueil
          </Link>
        </Button>
      </div>
    </div>
  );
}
