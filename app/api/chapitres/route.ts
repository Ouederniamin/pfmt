import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const chapitres = await db.chapitre.findMany({
    orderBy: { numero: "asc" },
    include: {
      tests: { include: { questions: { orderBy: { ordre: "asc" } } } },
    },
  });

  return NextResponse.json(chapitres);
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json();

  // Auto-assign next numero if not provided or conflicts
  const last = await db.chapitre.findFirst({ orderBy: { numero: "desc" }, select: { numero: true } });
  const nextNumero = (last?.numero ?? 0) + 1;
  const numero = body.numero ?? nextNumero;

  try {
    const chapitre = await db.chapitre.create({
      data: {
        numero,
      titre: body.titre,
      description: body.description,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      sommaire: body.sommaire ?? null,
      videoUrl: body.videoUrl,
      conclusion: body.conclusion,
      conclusionFileUrl: body.conclusionFileUrl,
      conclusionFileName: body.conclusionFileName,
      ficheResume: body.ficheResume,
      ficheResumeFileUrl: body.ficheResumeFileUrl,
      ficheResumeFileName: body.ficheResumeFileName,
      rappelCours: null,
      rappelCoursFileUrl: body.rappelCoursFileUrl,
      rappelCoursFileName: body.rappelCoursFileName,
      tests: {
        create: (body.tests ?? []).map((test: any) => ({
          titre: test.titre,
          type: test.type,
          dansLeCours: !!test.dansLeCours,
          questions: {
            create: (test.questions ?? []).map((q: any, qIndex: number) => ({
              ordre: q.ordre ?? qIndex + 1,
              enonce: q.enonce,
              contexte: q.contexte,
              options: q.options,
            })),
          },
        })),
      },
    },
    include: {
      tests: { include: { questions: true } },
    },
  });

    return NextResponse.json(chapitre, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: `Le numéro de chapitre ${numero} existe déjà. Veuillez en choisir un autre.` },
        { status: 409 }
      );
    }
    throw error;
  }
}
