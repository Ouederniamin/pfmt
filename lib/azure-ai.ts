import { createOpenAI } from "@ai-sdk/openai";

export function getAzureModel() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-5.4-mini";
  const baseURL = process.env.AZURE_OPENAI_BASE_URL || "https://nextgen-east-us2.openai.azure.com/openai/v1/";

  if (!apiKey) {
    throw new Error("Variable manquante: AZURE_OPENAI_API_KEY");
  }

  const provider = createOpenAI({
    baseURL,
    apiKey,
  });
  return provider(deployment);
}
