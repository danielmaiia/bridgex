// src/app/api/rh/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_req: NextRequest) {
  try {
    // 1) Perfis
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, area, seniority");

    if (profilesError) {
      console.error("Erro ao buscar profiles:", profilesError.message);
      throw profilesError;
    }

    const totalProfiles = profiles?.length ?? 0;

    const profilesByArea: Record<string, number> = {};
    const profilesBySeniority: Record<string, number> = {};
    const profilesById: Record<string, { area: string | null }> = {};

    (profiles || []).forEach((p: any) => {
      const area = (p.area as string | null) || "Não informada";
      const seniority = (p.seniority as string | null) || "Não informada";

      profilesByArea[area] = (profilesByArea[area] || 0) + 1;
      profilesBySeniority[seniority] =
        (profilesBySeniority[seniority] || 0) + 1;

      profilesById[p.id as string] = {
        area: p.area ?? null,
      };
    });

    const areaDistribution = Object.entries(profilesByArea)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);

    const seniorityDistribution = Object.entries(profilesBySeniority)
      .map(([seniority, count]) => ({ seniority, count }))
      .sort((a, b) => b.count - a.count);

    // 2) Skills por usuário (have / learning)
    const { data: userSkills, error: userSkillsError } = await supabaseAdmin
      .from("user_skills")
      .select("kind, skills(name)");

    if (userSkillsError) {
      console.error("Erro ao buscar user_skills:", userSkillsError.message);
      throw userSkillsError;
    }

    const topHaveMap: Record<string, number> = {};
    const topLearningMap: Record<string, number> = {};

    (userSkills || []).forEach((row: any) => {
      const kind = row.kind as "have" | "learning" | null;
      const name = (row.skills?.name as string | undefined) || null;
      if (!kind || !name) return;

      if (kind === "have") {
        topHaveMap[name] = (topHaveMap[name] || 0) + 1;
      } else if (kind === "learning") {
        topLearningMap[name] = (topLearningMap[name] || 0) + 1;
      }
    });

    const topSkillsHave = Object.entries(topHaveMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSkillsLearning = Object.entries(topLearningMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3) Tasks (microtarefas)
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("id, creator_id, area, status");

    if (tasksError) {
      console.error("Erro ao buscar tasks:", tasksError.message);
      throw tasksError;
    }

    const totalTasks = tasks?.length ?? 0;

    let openTasks = 0;
    let closedTasks = 0;
    const tasksByAreaMap: Record<string, number> = {};
    const tasksById: Record<
      string,
      { creator_id: string; area: string | null; status: string | null }
    > = {};

    (tasks || []).forEach((t: any) => {
      const status = (t.status as string | null) || "aberta";
      if (status === "aberta") openTasks++;
      else closedTasks++;

      const area = (t.area as string | null) || "Não informada";
      tasksByAreaMap[area] = (tasksByAreaMap[area] || 0) + 1;

      tasksById[t.id as string] = {
        creator_id: t.creator_id as string,
        area: t.area ?? null,
        status: t.status ?? null,
      };
    });

    const tasksByArea = Object.entries(tasksByAreaMap)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);

    // 4) Endorsements (colaboração / portfólio)
    const { data: endorsements, error: endorsementsError } =
      await supabaseAdmin.from("endorsements").select(
        `
        id,
        task_id,
        from_user,
        to_user,
        skill
      `
      );

    if (endorsementsError) {
      console.error("Erro ao buscar endorsements:", endorsementsError.message);
      throw endorsementsError;
    }

    const totalEndorsements = endorsements?.length ?? 0;

    let sameArea = 0;
    let crossArea = 0;

    const helperCountMap: Record<string, number> = {};
    const endorsedSkillMap: Record<string, number> = {};

    (endorsements || []).forEach((e: any) => {
      const task = tasksById[e.task_id as string];
      if (!task) return;

      const requesterProfile = profilesById[task.creator_id];
      const helperProfile = profilesById[e.to_user as string];

      const requesterArea = requesterProfile?.area || null;
      const helperArea = helperProfile?.area || null;

      if (requesterArea && helperArea) {
        if (requesterArea === helperArea) sameArea++;
        else crossArea++;
      }

      const helperId = e.to_user as string;
      helperCountMap[helperId] = (helperCountMap[helperId] || 0) + 1;

      const skillName = (e.skill as string | null) || null;
      if (skillName) {
        endorsedSkillMap[skillName] = (endorsedSkillMap[skillName] || 0) + 1;
      }
    });

    const crossAreaPercentage =
      totalEndorsements > 0 ? (crossArea / totalEndorsements) * 100 : 0;

    const topHelpers = Object.entries(helperCountMap)
      .map(([user_id, endorsements]) => {
        const prof = profilesById[user_id];
        return {
          user_id,
          full_name: prof ? (user_id as string) : (user_id as string),
          // se quiser buscar nome mesmo, teria que repuxar full_name na query de profiles
          area: prof?.area ?? null,
          endorsements,
        };
      })
      .sort((a, b) => b.endorsements - a.endorsements)
      .slice(0, 5);

    const topEndorsedSkills = Object.entries(endorsedSkillMap)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5) Certificates (quantidade, skills ligadas + ranking por TF-IDF de títulos)
    const { data: certificates, error: certificatesError } =
      await supabaseAdmin
        .from("certificates")
        .select("id, user_id, titulo");

    if (certificatesError) {
      console.error("Erro ao buscar certificates:", certificatesError.message);
      throw certificatesError;
    }

    const totalCertificates = certificates?.length ?? 0;

    // usuários que possuem ao menos um certificado
    const certUsers = new Set<string>();
    (certificates || []).forEach((c: any) => {
      certUsers.add(c.user_id as string);
    });

    const usersWithCertificates = certUsers.size;
    const avgCertificatesPerUser =
      usersWithCertificates > 0
        ? totalCertificates / usersWithCertificates
        : 0;

    // skills ligadas a certificados (contagem simples)
    const { data: certSkills, error: certSkillsError } = await supabaseAdmin
      .from("certificate_skills")
      .select("skill_id, skills(name)");

    if (certSkillsError) {
      console.error(
        "Erro ao buscar certificate_skills:",
        certSkillsError.message
      );
      throw certSkillsError;
    }

    const topCertifiedSkillMap: Record<string, number> = {};
    (certSkills || []).forEach((row: any) => {
      const name = (row.skills?.name as string | undefined) || null;
      if (!name) return;
      topCertifiedSkillMap[name] = (topCertifiedSkillMap[name] || 0) + 1;
    });

    const topCertifiedSkills = Object.entries(topCertifiedSkillMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ===============================
    // 5.1) Ranking de certificados usando TF-IDF nos títulos
    // ===============================

    // helper para tokenizar títulos
    function tokenize(text: string): string[] {
      return text
        .toLowerCase()
        .split(/\W+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2); // ignora tokens muito curtos
    }

    type CertDoc = {
      id: string;
      user_id: string;
      titulo: string;
      tokens: string[];
    };

    const docs: CertDoc[] = (certificates || [])
      .filter((c: any) => !!c.titulo)
      .map((c: any) => {
        const titulo = (c.titulo as string).trim();
        return {
          id: c.id as string,
          user_id: c.user_id as string,
          titulo,
          tokens: tokenize(titulo),
        };
      });

    // mapa título normalizado -> contagem de ocorrências
    const titleCountMap: Record<string, { titulo: string; count: number }> = {};
    docs.forEach((d) => {
      const key = d.titulo.toLowerCase();
      if (!titleCountMap[key]) {
        titleCountMap[key] = { titulo: d.titulo, count: 0 };
      }
      titleCountMap[key].count += 1;
    });

    // construir IDF por termo
    const termDocFreq: Record<string, number> = {};
    docs.forEach((d) => {
      const uniqueTerms = new Set(d.tokens);
      uniqueTerms.forEach((term) => {
        termDocFreq[term] = (termDocFreq[term] || 0) + 1;
      });
    });

    const totalDocs = docs.length || 1;
    const idfMap: Record<string, number> = {};
    Object.entries(termDocFreq).forEach(([term, df]) => {
      idfMap[term] = Math.log(totalDocs / (1 + df));
    });

    // calcular TF-IDF por certificado (soma dos pesos dos termos)
    const certTFIDFMap: Record<
      string,
      { titulo: string; tfidf: number; occurrences: number }
    > = {};

    docs.forEach((d) => {
      if (d.tokens.length === 0) return;
      const tf: Record<string, number> = {};
      d.tokens.forEach((t) => {
        tf[t] = (tf[t] || 0) + 1;
      });
      Object.keys(tf).forEach((t) => {
        tf[t] = tf[t] / d.tokens.length;
      });

      let tfidfSum = 0;
      Object.keys(tf).forEach((term) => {
        const idf = idfMap[term] || 0;
        tfidfSum += tf[term] * idf;
      });

      const key = d.titulo.toLowerCase();
      const occurrences = titleCountMap[key]?.count ?? 1;

      // score final combina relevância semântica + recorrência
      const score = tfidfSum * 0.6 + Math.log(1 + occurrences) * 0.4;

      certTFIDFMap[key] = {
        titulo: titleCountMap[key]?.titulo || d.titulo,
        tfidf: score,
        occurrences,
      };
    });

    const topCertificatesRanked = Object.values(certTFIDFMap)
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, 10);

    // Monta payload final
    const payload = {
      people: {
        totalProfiles,
        areaDistribution,
        seniorityDistribution,
      },
      skills: {
        topSkillsHave,
        topSkillsLearning,
      },
      tasks: {
        totalTasks,
        openTasks,
        closedTasks,
        tasksByArea,
      },
      collaboration: {
        totalEndorsements,
        sameArea,
        crossArea,
        crossAreaPercentage,
        topHelpers,
        topEndorsedSkills,
      },
      certificates: {
        totalCertificates,
        usersWithCertificates,
        avgCertificatesPerUser,
        topCertifiedSkills,
        topCertificatesRanked, // <- NOVO bloco com TF-IDF + ocorrências
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Erro em /api/rh/dashboard:", err);
    return NextResponse.json(
      { error: "Erro interno ao montar dashboard de RH" },
      { status: 500 }
    );
  }
}
