import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,          // ou SUPABASE_URL
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const userId = formData.get("user_id") as string | null;

    const titulo = formData.get("titulo") as string | null;
    const emissor = formData.get("emissor") as string | null;
    const dataEmissao = formData.get("data_emissao") as string | null;
    const cargaHorariaStr = formData.get("carga_horaria") as string | null;
    const chaveValidacao = formData.get("chave_validacao") as string | null;
    const rawText = formData.get("raw_text") as string | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "user_id não enviado" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = (file as any).type || "application/pdf";
    const originalName = (file as any).name || "certificado";
    const ext =
      (originalName.split(".").pop() as string | undefined) ||
      mimeType.split("/")[1] ||
      "pdf";

    const filePath = `user-${userId}/${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("certificates")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError || !uploadData) {
      console.error("Erro ao fazer upload do certificado:", uploadError);
      return NextResponse.json(
        { error: "Falha ao salvar arquivo do certificado" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("certificates").getPublicUrl(uploadData.path);

    const cargaHoraria = cargaHorariaStr
      ? Number.isNaN(Number(cargaHorariaStr))
        ? null
        : Number(cargaHorariaStr)
      : null;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("certificates")
      .insert({
        user_id: userId,
        file_path: uploadData.path,
        file_url: publicUrl,
        raw_text: rawText,
        titulo: titulo || null,
        emissor: emissor || null,
        data_emissao: dataEmissao || null, // espera YYYY-MM-DD
        carga_horaria: cargaHoraria,
        chave_validacao: chaveValidacao || null,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Erro ao inserir certificado na tabela:", insertError);
      return NextResponse.json(
        { error: "Falha ao salvar certificado no banco" },
        { status: 500 }
      );
    }

    return NextResponse.json({ certificate: inserted });
  } catch (err) {
    console.error("Erro em /api/certificates/save:", err);
    return NextResponse.json(
      { error: "Falha ao salvar certificado" },
      { status: 500 }
    );
  }
}
