// src/app/api/rh/dashboard/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { matchTFIDF } from "@/lib/tfidf";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ------------ Tipos auxiliares ------------

type ProfileRow = {
  id: string;
  full_name: string | null;
  area: string | null;
  seniority: string | null;
  career_goals: string | null;
};

type UserSkillRow = {
  user_id: string;
  kind: "have" | "learning" | null;
  skills: { name: string | null }[]; // 👈 AGORA É ARRAY
};

type CertificateRow = {
  id: string;
  user_id: string;
  titulo: string | null;
  emissor: string | null;
};

type CertSkillRow = {
  certificate_id: string;
  skills: { name: string | null }[]; // idem: array
};

type Candidate = {
  user_id: string;
  full_name: string;
  area: string | null;
  seniority: string | null;
  career_goals: string | null;
  skillNames: string[];
  certTitles: string[];
  textBlob: string;
};

type SearchResult = {
  user_id: string;
  full_name: string;
  area: string | null;
  seniority: string | null;
  skills: string[];
  certificates: string[];
  score: number;
};

// ------------ Handler ------------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) || 10 : 10;

  if (!q) {
    return NextResponse.json({ query: q, results: [] as SearchResult[] });
  }

  try {
    // Busca tudo em paralelo
    const [profilesRes, userSkillsRes, certsRes, certSkillsRes] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, full_name, area, seniority, career_goals"),
        supabaseAdmin
          .from("user_skills")
          .select("user_id, kind, skills(name)"),
        supabaseAdmin
          .from("certificates")
          .select("id, user_id, titulo, emissor"),
        supabaseAdmin
          .from("certificate_skills")
          .select("certificate_id, skills(name)"),
      ]);

    // Tratamento de erros do Supabase
    if (profilesRes.error) {
      console.error("Erro ao buscar profiles:", profilesRes.error.message);
      throw profilesRes.error;
    }
    if (userSkillsRes.error) {
      console.error("Erro ao buscar user_skills:", userSkillsRes.error.message);
      throw userSkillsRes.error;
    }
    if (certsRes.error) {
      console.error("Erro ao buscar certificates:", certsRes.error.message);
      throw certsRes.error;
    }
    if (certSkillsRes.error) {
      console.error(
        "Erro ao buscar certificate_skills:",
        certSkillsRes.error.message
      );
      throw certSkillsRes.error;
    }

    const profiles = (profilesRes.data || []) as ProfileRow[];
    const userSkills = (userSkillsRes.data || []) as UserSkillRow[];
    const certificates = (certsRes.data || []) as CertificateRow[];
    const certSkills = (certSkillsRes.data || []) as CertSkillRow[];

    // Map de perfil por usuário
    const profileById: Record<string, ProfileRow> = {};
    profiles.forEach((p) => {
      profileById[p.id] = p;
    });

    // Map de skills de certificado por certificate_id
    const certSkillsByCertId: Record<string, string[]> = {};
    certSkills.forEach((row) => {
      const skillsArray = Array.isArray(row.skills) ? row.skills : [];
      skillsArray.forEach((s) => {
        const skillName = s?.name;
        if (!skillName) return;
        if (!certSkillsByCertId[row.certificate_id]) {
          certSkillsByCertId[row.certificate_id] = [];
        }
        if (!certSkillsByCertId[row.certificate_id].includes(skillName)) {
          certSkillsByCertId[row.certificate_id].push(skillName);
        }
      });
    });

    // Monta candidatos agregando tudo por user_id
    const candidatesMap: Record<string, Candidate> = {};

    function ensureCandidate(userId: string): Candidate {
      if (!candidatesMap[userId]) {
        const prof = profileById[userId];
        candidatesMap[userId] = {
          user_id: userId,
          full_name: (prof?.full_name || userId) as string,
          area: prof?.area ?? null,
          seniority: prof?.seniority ?? null,
          career_goals: prof?.career_goals ?? null,
          skillNames: [],
          certTitles: [],
          textBlob: "",
        };
      }
      return candidatesMap[userId];
    }

    // Adiciona skills declaradas (perfil)
    userSkills.forEach((row) => {
      const base = ensureCandidate(row.user_id);
      const skillsArray = Array.isArray(row.skills) ? row.skills : [];

      skillsArray.forEach((s) => {
        const skillName = s?.name;
        if (!skillName) return;
        if (!base.skillNames.includes(skillName)) {
          base.skillNames.push(skillName);
        }
      });
    });

    // Adiciona certificados + skills ligadas a certificados
    certificates.forEach((c) => {
      const base = ensureCandidate(c.user_id);
      const title = c.titulo || "";
      const emissor = c.emissor || "";

      const label =
        title && emissor ? `${title} • ${emissor}` : title || emissor;

      if (label && !base.certTitles.includes(label)) {
        base.certTitles.push(label);
      }

      const certSkillNames = certSkillsByCertId[c.id] || [];
      certSkillNames.forEach((name) => {
        if (!base.skillNames.includes(name)) {
          base.skillNames.push(name);
        }
      });
    });

    // Monta o texto completo de cada candidato para o TF-IDF
    Object.values(candidatesMap).forEach((c) => {
      const parts: string[] = [];

      if (c.full_name) parts.push(c.full_name);
      if (c.area) parts.push(c.area);
      if (c.seniority) parts.push(c.seniority);
      if (c.career_goals) parts.push(c.career_goals);
      if (c.skillNames.length > 0) parts.push(c.skillNames.join(" "));
      if (c.certTitles.length > 0) parts.push(c.certTitles.join(" "));

      c.textBlob = parts.join(" ");
    });

    // Calcula score TF-IDF para cada candidato em relação à query
    const results: SearchResult[] = Object.values(candidatesMap)
      .map((c) => {
        const score = matchTFIDF(c.textBlob, q) || 0;
        return {
          user_id: c.user_id,
          full_name: c.full_name,
          area: c.area,
          seniority: c.seniority,
          skills: c.skillNames,
          certificates: c.certTitles.slice(0, 5),
          score,
        };
      })
      // descarta quem não tem match nenhum
      .filter((r) => r.score > 0)
      // ordena por relevância
      .sort((a, b) => b.score - a.score)
      // limita
      .slice(0, limit);

    return NextResponse.json({
      query: q,
      results,
    });
  } catch (err) {
    console.error("Erro em /api/rh/dashboard/search:", err);
    return NextResponse.json(
      { error: "Erro interno ao buscar candidatos" },
      { status: 500 }
    );
  }
}
