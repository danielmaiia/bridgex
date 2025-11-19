// src/app/rh/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/authGuard";

type AreaDist = { area: string; count: number };
type SeniorityDist = { seniority: string; count: number };
type NamedCount = { name: string; count: number };
type SkillCount = NamedCount;
type TasksByArea = AreaDist;
type TopHelper = {
  user_id: string;
  full_name: string;
  area: string | null;
  endorsements: number;
};
type TopEndorsedSkill = { skill: string; count: number };
type TopCertificateRanked = {
  titulo: string;
  tfidf: number;
  occurrences: number;
};

type DashboardData = {
  people: {
    totalProfiles: number;
    areaDistribution: AreaDist[];
    seniorityDistribution: SeniorityDist[];
  };
  skills: {
    topSkillsHave: SkillCount[];
    topSkillsLearning: SkillCount[];
  };
  tasks: {
    totalTasks: number;
    openTasks: number;
    closedTasks: number;
    tasksByArea: TasksByArea[];
  };
  collaboration: {
    totalEndorsements: number;
    sameArea: number;
    crossArea: number;
    crossAreaPercentage: number;
    topHelpers: TopHelper[];
    topEndorsedSkills: TopEndorsedSkill[];
  };
  certificates: {
    totalCertificates: number;
    usersWithCertificates: number;
    avgCertificatesPerUser: number;
    topCertifiedSkills: SkillCount[];
    topCertificatesRanked: TopCertificateRanked[];
  };
};

function StatCard(props: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  const { title, value, subtitle } = props;
  return (
    <div className="card border border-slate-800 bg-slate-950/60">
      <p className="text-xs text-slate-400 mb-1">{title}</p>
      <p className="text-xl font-semibold text-emerald-400">{value}</p>
      {subtitle && (
        <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function BarList(props: {
  title: string;
  items: { label: string; value: number }[];
  maxItems?: number;
}) {
  const { title, items, maxItems = 6 } = props;
  const subset = items.slice(0, maxItems);
  const maxValue = subset.reduce(
    (acc, item) => (item.value > acc ? item.value : acc),
    0
  );

  return (
    <div className="card border border-slate-800 bg-slate-950/60 space-y-2">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      {subset.length === 0 ? (
        <p className="text-xs text-slate-500">Sem dados suficientes.</p>
      ) : (
        <div className="space-y-1.5">
          {subset.map((item) => {
            const pct =
              maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0;
            return (
              <div key={item.label} className="space-y-0.5">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span className="truncate">{item.label}</span>
                  <span className="text-slate-400">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-emerald-500/80"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RhPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch("/api/rh/dashboard");
        if (!res.ok) {
          const txt = await res.text();
          console.error("Erro ao carregar /api/rh/dashboard:", txt);
          setErrorMsg("Não foi possível carregar o painel do RH.");
          setLoading(false);
          return;
        }
        const json = (await res.json()) as DashboardData;
        setData(json);
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        setErrorMsg("Erro inesperado ao carregar o painel do RH.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <AuthGuard>
      <main className="space-y-4 max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <section className="card space-y-2">
          <h2 className="text-lg font-semibold">Painel do RH</h2>
          <p className="text-sm text-slate-300">
            Visão consolidada de pessoas, skills, microtarefas e certificados.
            Os dados abaixo são calculados a partir dos perfis, microtarefas
            (tasks), endossos (endorsements) e certificados vinculados à
            plataforma.
          </p>
          {loading && (
            <p className="text-xs text-slate-400">
              Carregando dados do painel...
            </p>
          )}
          {errorMsg && (
            <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
          )}
        </section>

        {data && !loading && (
          <>
            {/* Linha de números principais */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                title="Colaboradores com perfil"
                value={data.people.totalProfiles}
                subtitle="Perfis ativos na plataforma"
              />
              <StatCard
                title="Microtarefas registradas"
                value={data.tasks.totalTasks}
                subtitle={`${data.tasks.openTasks} abertas • ${data.tasks.closedTasks} fechadas`}
              />
              <StatCard
                title="Endossos registrados"
                value={data.collaboration.totalEndorsements}
                subtitle={`Colaborações reconhecidas entre colegas`}
              />
              <StatCard
                title="Colaboração entre áreas"
                value={`${data.collaboration.crossAreaPercentage.toFixed(0)}%`}
                subtitle="Endossos entre áreas diferentes"
              />
            </section>

            {/* Distribuição de Pessoas */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BarList
                title="Distribuição por área"
                items={data.people.areaDistribution.map((a) => ({
                  label: a.area,
                  value: a.count,
                }))}
              />
              <BarList
                title="Distribuição por senioridade"
                items={data.people.seniorityDistribution.map((s) => ({
                  label: s.seniority,
                  value: s.count,
                }))}
              />
            </section>

            {/* Skills */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BarList
                title="Top skills declaradas (tenho)"
                items={data.skills.topSkillsHave.map((s) => ({
                  label: s.name,
                  value: s.count,
                }))}
              />
              <BarList
                title="Top skills em desenvolvimento (aprendendo)"
                items={data.skills.topSkillsLearning.map((s) => ({
                  label: s.name,
                  value: s.count,
                }))}
              />
            </section>

            {/* Microtarefas e colaboração */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <BarList
                title="Microtarefas por área de origem"
                items={data.tasks.tasksByArea.map((t) => ({
                  label: t.area,
                  value: t.count,
                }))}
              />

              <div className="card border border-slate-800 bg-slate-950/60 space-y-3">
                <p className="text-sm font-semibold text-slate-100">
                  Colaboração entre áreas
                </p>
                <p className="text-xs text-slate-400">
                  Endossos onde a área de quem pediu a microtarefa e a área de
                  quem entregou são iguais ou diferentes.
                </p>

                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Mesma área</span>
                    <span>{data.collaboration.sameArea}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-slate-500/80"
                      style={{
                        width:
                          data.collaboration.totalEndorsements > 0
                            ? `${
                                (data.collaboration.sameArea /
                                  data.collaboration.totalEndorsements) *
                                100
                              }%`
                            : "0%",
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-slate-300 mt-3">
                    <span>Entre áreas diferentes</span>
                    <span>{data.collaboration.crossArea}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-emerald-500/90"
                      style={{
                        width:
                          data.collaboration.totalEndorsements > 0
                            ? `${
                                (data.collaboration.crossArea /
                                  data.collaboration.totalEndorsements) *
                                100
                              }%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-200">
                    Top colaboradores mais endossados
                  </p>
                  {data.collaboration.topHelpers.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      Ainda não há endossos suficientes para montar o ranking.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {data.collaboration.topHelpers.map((h) => (
                        <li
                          key={h.user_id}
                          className="flex items-center justify-between text-[11px] text-slate-300"
                        >
                          <span className="truncate">
                            {h.full_name || h.user_id}
                            {h.area && (
                              <span className="text-slate-500">
                                {" "}
                                • {h.area}
                              </span>
                            )}
                          </span>
                          <span className="text-emerald-300">
                            {h.endorsements} endosso
                            {h.endorsements > 1 ? "s" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-200">
                    Skills mais endossadas em microtarefas
                  </p>
                  {data.collaboration.topEndorsedSkills.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      Ainda não há skills endossadas suficientes.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {data.collaboration.topEndorsedSkills.map((s) => (
                        <li
                          key={s.skill}
                          className="flex justify-between text-[11px] text-slate-300"
                        >
                          <span>{s.skill}</span>
                          <span className="text-slate-400">
                            {s.count}x endossada
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* Certificados */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="card border border-slate-800 bg-slate-950/60 space-y-2">
                <p className="text-sm font-semibold text-slate-100">
                  Certificados
                </p>
                <p className="text-xs text-slate-400">
                  Contagem de certificados vinculados à plataforma e média por
                  colaborador com pelo menos um certificado.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <StatCard
                    title="Total de certificados"
                    value={data.certificates.totalCertificates}
                  />
                  <StatCard
                    title="Colaboradores com certificado"
                    value={data.certificates.usersWithCertificates}
                    subtitle="Possuem ao menos um certificado cadastrado"
                  />
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  Média de certificados por colaborador certificado:{" "}
                  <span className="text-emerald-400 font-semibold">
                    {data.certificates.avgCertificatesPerUser.toFixed(1)}
                  </span>
                </p>
              </div>

              <BarList
                title="Skills mais presentes em certificados"
                items={data.certificates.topCertifiedSkills.map((s) => ({
                  label: s.name,
                  value: s.count,
                }))}
              />

              <BarList
                title="Certificados mais relevantes (TF-IDF)"
                items={data.certificates.topCertificatesRanked.map((c) => ({
                  label: `${c.titulo} (${c.occurrences}x)`,
                  value: Number(c.tfidf.toFixed(2)),
                }))}
              />
            </section>

            <p className="text-[11px] text-slate-500">
              Estes indicadores podem ser refinados para recortes por período,
              área ou trilhas específicas de desenvolvimento, e exportados para
              relatórios executivos ou integrações com outras ferramentas de
              People Analytics.
            </p>
          </>
        )}
      </main>
    </AuthGuard>
  );
}
