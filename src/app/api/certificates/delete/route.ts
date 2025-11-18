// src/app/api/certificates/delete/route.ts
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  try {
    // aqui você lê o corpo da requisição, por exemplo um id:
    const { id } = await request.json();

    // TODO: implementar a lógica para deletar o certificado no Supabase
    // ex:
    // await supabaseClient
    //   .from("certificates")
    //   .delete()
    //   .eq("id", id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro ao deletar certificado:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao deletar certificado" },
      { status: 500 }
    );
  }
}
