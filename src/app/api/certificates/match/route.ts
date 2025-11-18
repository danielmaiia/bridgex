// src/app/api/certificates/match/route.ts
import { NextResponse } from "next/server";
import { matchTFIDF } from "@/lib/tfidf";

type MatchRequest = {
  certificateText: string;
  targetText: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<MatchRequest>;
    const { certificateText, targetText } = body;

    // --- Validação ---
    if (!certificateText || !targetText) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Parâmetros inválidos. Envie certificateText e targetText no corpo da requisição.",
        },
        { status: 400 }
      );
    }

    // --- Cálculo do match (TF-IDF + Cosine Similarity) ---
    const score = matchTFIDF(certificateText, targetText);

    // --- Resposta final ---
    return NextResponse.json(
      {
        success: true,
        score,
        matchQuality:
          score >= 0.85
            ? "excelente"
            : score >= 0.70
            ? "forte"
            : score >= 0.55
            ? "bom"
            : score >= 0.35
            ? "fraco"
            : "irrelevante",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Erro interno em /api/certificates/match:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao processar o match.",
      },
      { status: 500 }
    );
  }
}
