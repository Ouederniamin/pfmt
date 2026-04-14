import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const test = await db.test.findUnique({
    where: { id },
    include: { questions: { orderBy: { ordre: "asc" } } },
  });

  if (!test) {
    return NextResponse.json({ error: "Test introuvable" }, { status: 404 });
  }

  return NextResponse.json(test);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();

  const test = await db.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { testId: id } });

    return tx.test.update({
      where: { id },
      data: {
        titre: body.titre,
        type: body.type,
        dansLeCours: !!body.dansLeCours,
        questions: {
          create: (body.questions ?? []).map((q: any, qIndex: number) => ({
            ordre: q.ordre ?? qIndex + 1,
            enonce: q.enonce,
            contexte: q.contexte,
            options: q.options,
            justification: q.justification,
            explication: q.explication,
          })),
        },
      },
      include: { questions: { orderBy: { ordre: "asc" } } },
    });
  });

  return NextResponse.json(test);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  await db.test.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
