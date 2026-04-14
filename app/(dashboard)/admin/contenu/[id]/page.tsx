import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { AdminChapitreForm } from "@/components/admin-chapitre-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditChapitrePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if ((user?.publicMetadata as { role?: string })?.role !== "admin") {
    redirect("/cours");
  }
  const { id } = await params;
  const chapitre = await db.chapitre.findUnique({
    where: { id },
    include: {
      tests: { include: { questions: { orderBy: { ordre: "asc" } } } },
    },
  });

  if (!chapitre) notFound();

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-accent-gold mb-2">
          Modification
        </div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Modifier le chapitre
        </h1>
      </div>
      <AdminChapitreForm initial={chapitre as any} />
    </>
  );
}
