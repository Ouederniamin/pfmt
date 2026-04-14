import { notFound } from "next/navigation";
import { CoursReader } from "@/components/cours-reader";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ChapitrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapitre = await db.chapitre.findUnique({
    where: { id },
    include: {
      tests: { include: { questions: { orderBy: { ordre: "asc" } } } },
    },
  });

  if (!chapitre) {
    notFound();
  }

  // Find next & previous chapters for navigation
  const [nextChapitre, prevChapitre] = await Promise.all([
    db.chapitre.findFirst({
      where: { numero: { gt: chapitre.numero } },
      orderBy: { numero: "asc" },
      select: { id: true, titre: true, numero: true },
    }),
    db.chapitre.findFirst({
      where: { numero: { lt: chapitre.numero } },
      orderBy: { numero: "desc" },
      select: { id: true, titre: true, numero: true },
    }),
  ]);

  return (
    <CoursReader
      chapitreId={chapitre.id}
      titre={chapitre.titre}
      sommaire={(chapitre.sommaire as { titre: string; page: number }[]) ?? []}
      conclusion={chapitre.conclusion}
      conclusionFileUrl={chapitre.conclusionFileUrl}
      conclusionFileName={chapitre.conclusionFileName}
      ficheResume={chapitre.ficheResume}
      ficheResumeFileUrl={chapitre.ficheResumeFileUrl}
      ficheResumeFileName={chapitre.ficheResumeFileName}
      rappelCoursFileUrl={chapitre.rappelCoursFileUrl}
      rappelCoursFileName={chapitre.rappelCoursFileName}
      videoUrl={chapitre.videoUrl}
      fileUrl={chapitre.fileUrl}
      fileName={chapitre.fileName}
      tests={chapitre.tests as any}
      nextChapter={nextChapitre ? { id: nextChapitre.id, titre: nextChapitre.titre, numero: nextChapitre.numero } : undefined}
      prevChapter={prevChapitre ? { id: prevChapitre.id, titre: prevChapitre.titre, numero: prevChapitre.numero } : undefined}
    />
  );
}
