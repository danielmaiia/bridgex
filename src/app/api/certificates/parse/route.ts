import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

type ParsedCertificate = {
  nome: string | null;
  titulo_curso: string | null;
  emissor: string | null;
  carga_horaria: number | null;
  data_emissao: string | null; // YYYY-MM-DD
  chave_validacao: string | null;
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = (file as any).type || "application/pdf";

    const multimodalPrompt = [
      {
        text: `Você receberá um arquivo de certificado (PDF ou imagem). Faça o OCR e depois siga as instruções abaixo para extrair os campos estruturados.`,
      },
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
      {
        text: `
Extraia os seguintes campos e devolva APENAS um JSON válido (sem comentários, sem markdown, sem texto extra):

{
  "nome": string | null,
  "titulo_curso": string | null,
  "emissor": string | null,
  "carga_horaria": number | null,
  "data_emissao": string | null,
  "chave_validacao": string | null
}

Regras:
- Se não tiver certeza sobre um campo, use null.
- Não invente valores.
- Para data, tente converter para o formato YYYY-MM-DD.
- A chave de validação costuma ser uma sequência longa de caracteres no final do certificado.
      `,
      },
    ];

    const result = await model.generateContent(multimodalPrompt);
    const fullText = result.response.text().trim();
    const jsonText = extractJson(fullText);

    let parsed: ParsedCertificate;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      console.error(
        "Falha ao fazer parse do JSON da Gemini (multimodal):",
        err,
        jsonText
      );
      parsed = {
        nome: null,
        titulo_curso: null,
        emissor: null,
        carga_horaria: null,
        data_emissao: null,
        chave_validacao: null,
      };
    }

    return NextResponse.json({
      rawText: fullText,
      parsed,
    });
  } catch (err) {
    console.error("Erro em /api/certificates/parse:", err);
    return NextResponse.json(
      { error: "Falha ao processar certificado" },
      { status: 500 }
    );
  }
}
