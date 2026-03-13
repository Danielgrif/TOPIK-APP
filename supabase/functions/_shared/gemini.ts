import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Selects the best available model from a list of preferred models.
 * @param genAI The GoogleGenerativeAI client.
 * @param preferredModels An array of model names in order of preference.
 * @param fallbackModel A fallback model to use if no preferred models are available.
 * @returns The name of the best available model.
 */
export async function selectBestModel(
  genAI: GoogleGenerativeAI,
  preferredModels: string[],
  fallbackModel: string,
): Promise<string> {
  for (const modelName of preferredModels) {
    try {
      await genAI.getGenerativeModel({ model: modelName });
      return modelName;
    } catch (_e) {
      console.warn(`⚠️ Model ${modelName} is not available, trying next.`);
    }
  }
  console.warn(`No preferred models available. Falling back to ${fallbackModel}.`);
  return fallbackModel;
}