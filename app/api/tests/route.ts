import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json();

  const test = await db.test.create({
    data: {
      chapitreId: body.chapitreId,
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

  return NextResponse.json(test, { status: 201 });
}
