"use server";

// Server Action: genera una imagen de producto usando DALL-E 3 (OpenAI).
// Requiere OPENAI_API_KEY en el entorno del servidor.
// Traefik en EasyPanel bloquea POST a /api/ con 405, por eso vive aquí.

export interface GenerateImageResult {
  ok: boolean;
  error?: string;
  imageUrl?: string;
}

export async function generateImage(input: {
  prompt: string;
  productId: string;
}): Promise<GenerateImageResult> {
  const { prompt, productId } = input;

  if (!prompt) {
    return { ok: false, error: "prompt es requerido" };
  }

  if (!productId) {
    return { ok: false, error: "productId es requerido" };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "OPENAI_API_KEY no configurada. Agrega la clave en .env.local para habilitar la generación de imágenes.",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message ?? "Error de la API de OpenAI");
    }

    const data = await response.json();
    const imageUrl: string | undefined = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("No se recibió URL de imagen");
    }

    return { ok: true, imageUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al generar imagen" };
  }
}
