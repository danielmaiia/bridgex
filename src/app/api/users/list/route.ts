// src/app/api/users/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Client com service role (apenas no backend!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // mesma URL usada no resto do projeto
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/users/list?limit=20&offset=0
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 50); // 1–50
    const offset = Math.max(Number(offsetParam) || 0, 0);

    // 1) Busca perfis básicos
    const {
      data: profiles,
      error: profilesError,
      count,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, area, seniority, career_goals, avatar_url, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (profilesError) {
      console.error("Erro ao buscar perfis:", profilesError.message);
      return NextResponse.json(
        { error: "Erro ao buscar perfis" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        users: [],
        pagination: {
          limit,
          offset,
          total: count ?? 0,
        },
      });
    }

    const userIds = profiles.map((p) => p.id as string);

    // 2) Busca skills desses usuários (join com tabela skills)
    const { data: skillsData, error: skillsError } = await supabaseAdmin
      .from("user_skills")
      .select("user_id, kind, level, skills(name, category)")
      .in("user_id", userIds);

    if (skillsError) {
      console.error("Erro ao buscar user_skills:", skillsError.message);
      // Não quebra a resposta; só devolve perfis sem skills
    }

    // Organiza skills por usuário
    const skillsByUser: Record<
      string,
      {
        have: { name: string; category: string | null; level: string | null }[];
        learning: {
          name: string;
          category: string | null;
          level: string | null;
        }[];
      }
    > = {};

    (skillsData || []).forEach((row: any) => {
      const userId = row.user_id as string;
      const kind = row.kind as "have" | "learning";
      const level = (row.level ?? null) as string | null;
      const skillName = row.skills?.name as string | undefined;
      const skillCategory = (row.skills?.category ?? null) as string | null;

      if (!skillName) return;

      if (!skillsByUser[userId]) {
        skillsByUser[userId] = { have: [], learning: [] };
      }

      skillsByUser[userId][kind].push({
        name: skillName,
        category: skillCategory,
        level,
      });
    });

    const users = profiles.map((p: any) => {
      const skills = skillsByUser[p.id] || { have: [], learning: [] };

      return {
        id: p.id as string,
        full_name: (p.full_name ?? p.id) as string,
        area: (p.area ?? null) as string | null,
        seniority: (p.seniority ?? null) as string | null,
        career_goals: (p.career_goals ?? null) as string | null,
        avatar_url: (p.avatar_url ?? null) as string | null,
        have_skills: skills.have, // [{ name, category, level }]
        learning_skills: skills.learning, // idem
        created_at: p.created_at as string,
      };
    });

    return NextResponse.json({
      users,
      pagination: {
        limit,
        offset,
        total: count ?? users.length,
      },
    });
  } catch (err) {
    console.error("Erro em /api/users/list:", err);
    return NextResponse.json(
      { error: "Erro interno ao listar usuários" },
      { status: 500 }
    );
  }
}
