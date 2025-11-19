// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY) não configuradas.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET /api/tasks  -> lista tasks (simples, pra debug / protótipo)
export async function GET(_req: NextRequest) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, creator_id, title, description, skills, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/tasks] erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] }, { status: 200 });
}

// POST /api/tasks -> cria uma nova task (MVP)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creator_id, title, description, skills } = body;

    if (!creator_id || !title?.trim()) {
      return NextResponse.json(
        { error: "creator_id e title são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        creator_id,
        title: title.trim(),
        description: description?.trim() || null,
        skills: skills?.trim() || null,
        status: "aberta",
      })
      .select("id, creator_id, title, description, skills, status, created_at")
      .single();

    if (error) {
      console.error("[POST /api/tasks] erro:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/tasks] erro inesperado:", e);
    return NextResponse.json({ error: "Erro inesperado" }, { status: 500 });
  }
}
