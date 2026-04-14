import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { getAzureModel } from "@/lib/azure-ai";
import { QuestionSchema } from "@/lib/qcm-schema";
import { buildPrompt } from "@/lib/prompts";
import { requireAdmin } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { courseText } = body as { courseText: string };

    if (!courseText) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }

    const result = await generateObject({
      model: getAzureModel(),
      schema: QuestionSchema,
      prompt: buildPrompt(courseText),
    });

    return NextResponse.json(result.object);
  } catch (error: any) {
    console.error("[AI extract-qcm] Error:", error);
    return NextResponse.json({ error: error?.message ?? "Extraction IA echouee." }, { status: 500 });
  }
}
