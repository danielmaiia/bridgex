// src/app/api/certificates/list/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    // --- Recupera o usuário autenticado ---
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // --- Busca certificados do usuário ---
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar certificados", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { certificates: data || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro inesperado:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
