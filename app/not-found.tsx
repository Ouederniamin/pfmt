import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-warm-cream px-4 text-center">
      <p className="font-serif text-7xl font-bold text-primary/15">404</p>
      <h1 className="mt-4 font-serif text-2xl font-bold text-foreground">
        Page introuvable
      </h1>
      <p className="mt-2 max-w-md text-sm text-text-muted">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button asChild variant="outline" className="gap-1.5">
          <Link href="/cours">
            <Search className="h-4 w-4" />
            Cours
          </Link>
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
