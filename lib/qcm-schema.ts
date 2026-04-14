import { z } from "zod";

export const QuestionSchema = z.object({
  tests: z.array(
    z.object({
      type: z.enum(["QCM", "VRAI_FAUX", "CAS_CLINIQUE"]),
      titre: z.string(),
      questions: z.array(
        z.object({
          ordre: z.number(),
          enonce: z.string(),
          contexte: z.string().nullable(),
          options: z
            .array(
              z.object({
                id: z.string(),
                texte: z.string(),
                correct: z.boolean(),
                justification: z.string(),
              })
            )
            .min(2)
            .max(6),
        })
      ),
    })
  ),
});

export type ExtractedTests = z.infer<typeof QuestionSchema>;
