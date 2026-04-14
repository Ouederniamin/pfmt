import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const MAX_ATTEMPTS = 3;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { testId, chapitreId, score, totalQuestions, percentage, answers } = body as {
      testId?: string;
      chapitreId?: string;
      score?: number;
      totalQuestions?: number;
      percentage?: number;
      answers?: Record<string, string[]>;
    };

    if (!testId || !chapitreId || score == null || !totalQuestions || percentage == null) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    // Input validation
    if (percentage < 0 || percentage > 100) {
      return NextResponse.json({ error: "Pourcentage invalide." }, { status: 400 });
    }
    if (score < 0 || score > totalQuestions) {
      return NextResponse.json({ error: "Score invalide." }, { status: 400 });
    }

    // Use transaction to prevent race condition on attempt count
    const result = await db.$transaction(async (tx) => {
      const existingAttempts = await tx.testResult.count({
        where: { clerkUserId: userId, testId },
      });

      if (existingAttempts >= MAX_ATTEMPTS) {
        return null; // Signal max reached
      }

      return tx.testResult.create({
        data: {
          clerkUserId: userId,
          testId,
          chapitreId,
          score,
          totalQuestions,
          percentage,
          answers: answers ?? {},
          attemptNumber: existingAttempts + 1,
        },
      });
    });

    if (!result) {
      return NextResponse.json(
        { error: `Nombre maximum de tentatives atteint (${MAX_ATTEMPTS}).`, maxReached: true },
        { status: 409 }
      );
    }

    return NextResponse.json({ result, attemptsLeft: MAX_ATTEMPTS - result.attemptNumber });
  } catch (err) {
    console.error("[test-results] POST error:", err);
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
    const testId = searchParams.get("testId");

    const where: Record<string, string> = { clerkUserId: userId };
    if (chapitreId) where.chapitreId = chapitreId;
    if (testId) where.testId = testId;

    const results = await db.testResult.findMany({
      where,
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[test-results] GET error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
