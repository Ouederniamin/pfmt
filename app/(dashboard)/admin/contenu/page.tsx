import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { DeleteChapitreButton } from "@/components/delete-chapitre-button";
import { FolderOpen, Plus, Pencil, ClipboardCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContenuPage() {
  const user = await currentUser();
  if ((user?.publicMetadata as { role?: string })?.role !== "admin") {
    redirect("/cours");
  }

  const chapitres = await db.chapitre.findMany({
    orderBy: { numero: "asc" },
    include: { tests: true },
  });

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-accent-gold mb-2">
          <FolderOpen className="h-4 w-4" />
          Gestion du contenu
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            Chapitres
          </h1>
          <Button asChild className="gap-1.5">
            <Link href="/admin/contenu/nouveau">
              <Plus className="h-4 w-4" />
              Nouveau chapitre
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {chapitres.map((chapitre: any) => (
          <div
            key={chapitre.id}
            className="group flex items-center gap-4 rounded-2xl border border-primary/8 bg-surface p-5 transition-all hover:border-primary/15 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 font-serif text-lg font-bold text-primary">
              {String(chapitre.numero).padStart(2, "0")}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-base font-bold text-foreground truncate">
                {chapitre.titre}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                <ClipboardCheck className="h-3.5 w-3.5" />
                {chapitre.tests?.length ?? 0} test{(chapitre.tests?.length ?? 0) !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link href={`/admin/contenu/${chapitre.id}`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </Link>
              </Button>
              <DeleteChapitreButton id={chapitre.id} />
            </div>
          </div>
        ))}

        {chapitres.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/15 bg-muted-cream/50 py-16 text-center">
            <FolderOpen className="h-10 w-10 text-primary/20" />
            <p className="mt-3 font-serif text-base font-semibold text-foreground">
              Aucun chapitre
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Créez votre premier chapitre pour commencer.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
