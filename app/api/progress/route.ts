import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { chapitreId, completed } = body as {
      chapitreId?: string;
      completed?: unknown;
    };

    if (!chapitreId || typeof chapitreId !== "string") {
      return NextResponse.json({ error: "chapitreId requis." }, { status: 400 });
    }

    const isCompleted = completed === true;

    const progress = await db.courseProgress.upsert({
      where: {
        clerkUserId_chapitreId: { clerkUserId: userId, chapitreId },
      },
      create: {
        clerkUserId: userId,
        chapitreId,
        completed: isCompleted,
      },
      update: {
        lastAccessedAt: new Date(),
        ...(completed != null ? { completed: isCompleted } : {}),
      },
    });

    return NextResponse.json({ progress });
  } catch (err) {
    console.error("[progress] POST error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const chapitreId = searchParams.get("chapitreId");

    const where: Record<string, string> = { clerkUserId: userId };
    if (chapitreId) where.chapitreId = chapitreId;

    const progress = await db.courseProgress.findMany({ where });

    return NextResponse.json({ progress });
  } catch (err) {
    console.error("[progress] GET error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
