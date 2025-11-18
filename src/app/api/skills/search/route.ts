import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET /api/skills/search?q=python&limit=10
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) || 10 : 10;

  if (!q.trim()) {
    return NextResponse.json({ skills: [] });
  }

  const { data, error } = await supabase
    .from("skills")
    .select("id, name, category")
    .ilike("name", `%${q.trim()}%`)
    .order("name")
    .limit(limit);

  if (error) {
    console.error("Erro em /api/skills/search:", error);
    return NextResponse.json(
      { error: "Erro ao buscar skills" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    skills: data ?? [],
  });
}
