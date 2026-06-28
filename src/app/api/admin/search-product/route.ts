import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/search-product
// Dado el nombre de un producto, regresa info pre-llenada para el formulario:
// { name, description, benefits, category, suggestedPrice, searchTags, imageUrl }
// Usa Claude (Anthropic) con tool use de web search para investigar.
// Requiere: ANTHROPIC_API_KEY en .env.local

const SYSTEM_PROMPT = `Eres un asistente para una tienda de suplementos en México llamada Naturaleza Mística.
Cuando recibas un nombre de producto, investigas en internet y respondes EXCLUSIVAMENTE con un JSON con esta estructura:

{
  "name": "Nombre oficial del producto",
  "description": "Descripción técnica breve (1-2 oraciones)",
  "benefits": "Beneficios para el cliente en lenguaje natural (1-2 oraciones)",
  "category": "Categoría sugerida en minúscula y singular (ej: suplementos, tes, gomitas, vitaminas)",
  "suggestedPrice": 500,
  "searchTags": ["frase natural 1", "frase natural 2", "frase natural 3"]
}

Las searchTags deben ser frases naturales que un cliente diría para describir su necesidad,
NO palabras clave. Ejemplos: "me duele la espalda", "quiero rendir más en el gym",
"mi hijo no come bien". Genera 3-5 tags.

suggestedPrice es en pesos mexicanos (MXN), entero, basado en precio promedio del mercado.

NO incluyas texto fuera del JSON. NO uses bloques de código markdown.`;

export async function POST(req: NextRequest) {
  const { productName } = await req.json();

  if (!productName || typeof productName !== "string") {
    return NextResponse.json(
      { error: "productName (string) es requerido" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY no configurada. Agrega la clave en .env.local para habilitar la búsqueda de productos por IA.",
      },
      { status: 503 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 3,
          },
        ],
        messages: [
          {
            role: "user",
            content: `Investiga este producto y devuelve el JSON: "${productName}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      return NextResponse.json(
        { error: errData.error?.message ?? "Error de Anthropic API" },
        { status: 500 }
      );
    }

    const data = await response.json();
    // Last assistant text block should contain the JSON
    const textBlocks = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text);
    const fullText = textBlocks.join("\n").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(fullText);
    } catch {
      // Try extracting JSON from inside the response if it leaked markdown
      const match = fullText.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json(
          { error: "Claude no devolvió JSON válido", raw: fullText },
          { status: 500 }
        );
      }
      parsed = JSON.parse(match[0]);
    }

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error en búsqueda" },
      { status: 500 }
    );
  }
}
