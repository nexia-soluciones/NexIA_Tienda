"use server";

// Server Action: genera un brand kit usando la API de Claude (Anthropic).
// Requiere ANTHROPIC_API_KEY en el entorno del servidor.
// Traefik en EasyPanel bloquea POST a /api/ con 405, por eso vive aquí.

export interface BrandKit {
  nombre: string;
  slogan: string;
  descripcion: string;
  tono: string;
  valores: string[];
  colores: { nombre: string; hex: string; uso: string }[];
  tipografias: { nombre: string; uso: string }[];
}

export interface GenerateBrandingResult {
  ok: boolean;
  error?: string;
  brandKit?: BrandKit;
}

export async function generateBranding(input: {
  tenantName: string;
  giro: string;
  publico?: string;
}): Promise<GenerateBrandingResult> {
  const { tenantName, giro, publico } = input;

  if (!tenantName || !giro) {
    return { ok: false, error: "tenantName y giro son requeridos" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY no configurada. Agrega la clave en .env.local" };
  }

  const systemPrompt = `Eres un experto en branding y diseño de identidad visual para marcas de negocios mexicanos.
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown.`;

  const userPrompt = `Crea un brand kit completo para el siguiente negocio:
- Nombre: ${tenantName}
- Giro: ${giro}
${publico ? `- Público objetivo: ${publico}` : ""}

Responde con este JSON exacto (todos los campos son obligatorios):
{
  "nombre": "nombre comercial sugerido",
  "slogan": "slogan memorable",
  "descripcion": "descripción de la marca en 2-3 oraciones",
  "tono": "descripción del tono de voz (formal/informal, cálido/técnico, etc.)",
  "valores": ["valor1", "valor2", "valor3", "valor4"],
  "colores": [
    { "nombre": "Color primario", "hex": "#XXXXXX", "uso": "para qué usarlo" },
    { "nombre": "Color secundario", "hex": "#XXXXXX", "uso": "para qué usarlo" },
    { "nombre": "Color acento", "hex": "#XXXXXX", "uso": "para qué usarlo" },
    { "nombre": "Fondo", "hex": "#XXXXXX", "uso": "para qué usarlo" }
  ],
  "tipografias": [
    { "nombre": "nombre de fuente Google Fonts", "uso": "títulos y encabezados" },
    { "nombre": "nombre de fuente Google Fonts", "uso": "cuerpo de texto" }
  ]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message ?? "Error de la API de Claude");
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Parsear el JSON de la respuesta
    const brandKit = JSON.parse(text) as BrandKit;

    return { ok: true, brandKit };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al generar branding" };
  }
}
