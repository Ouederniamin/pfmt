import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapitre = await db.chapitre.findUnique({
    where: { id },
    include: {
      tests: { include: { questions: { orderBy: { ordre: "asc" } } } },
    },
  });

  if (!chapitre) {
    return NextResponse.json({ error: "Chapitre introuvable" }, { status: 404 });
  }

  return NextResponse.json(chapitre);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();

  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.question.deleteMany({ where: { test: { chapitreId: id } } });
    await tx.test.deleteMany({ where: { chapitreId: id } });

    return tx.chapitre.update({
      where: { id },
      data: {
        numero: body.numero,
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
        tests: { include: { questions: { orderBy: { ordre: "asc" } } } },
      },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  await db.chapitre.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
