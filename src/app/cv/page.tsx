// src/app/cv/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/authGuard";
import { CertificateUpload } from "@/components/certificateUpload";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";
import { matchTFIDF } from "@/lib/tfidf";

type SkillOption = {
  id: string;
  name: string;
  category: string | null;
};


type Certificate = {
  id: string;
  titulo: string | null;
  emissor: string | null;
  data_emissao: string | null;
  carga_horaria: number | null;
  chave_validacao: string | null;
  file_url: string | null;
  raw_text: string | null;
  // Supabase retorna uma estrutura aninhada; tipamos como any[] para simplificar
  certificate_skills?: any[];
};


type UserSkillRef = {
  skill_id: string;
  kind: "have" | "learning";
  level: string | null;
};

export default function CvPage() {
  const { user, loading: loadingUser } = useSupabaseUser();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [savingCertId, setSavingCertId] = useState<string | null>(null);
  const [deletingCertId, setDeletingCertId] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  const [allSkills, setAllSkills] = useState<SkillOption[]>([]);
  const [skillsLoaded, setSkillsLoaded] = useState(false);

  // skills do usuário para referência (pra saber se já existe em user_skills)
  const [userSkills, setUserSkills] = useState<UserSkillRef[]>([]);

  // busca por skill por certificado (campo de search)
  const [searchTermByCert, setSearchTermByCert] = useState<Record<string, string>>(
    {}
  );
  const [searchResultsByCert, setSearchResultsByCert] = useState<
    Record<string, SkillOption[]>
  >({});

  // configuração de como a skill do certificado entra no perfil
  const [certSkillKind, setCertSkillKind] = useState<"have" | "learning">("have");
  const [certSkillLevel, setCertSkillLevel] = useState("intermediário");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---------------------------
  // Carregar certificados
  // ---------------------------
  async function loadCertificates() {
    if (!user) return;
    setLoadingCerts(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("certificates")
      .select(
        `
        id,
        titulo,
        emissor,
        data_emissao,
        carga_horaria,
        chave_validacao,
        file_url,
        raw_text,
        certificate_skills (
          skill_id,
          skills (
            id,
            name,
            category
          )
        )
      `
      )
      .eq("user_id", user.id)
      .order("data_emissao", { ascending: false });

    if (error) {
      console.error("Erro ao carregar certificados:", error.message);
      setErrorMsg("Erro ao carregar seus certificados.");
    } else {
      setCertificates(data || []);
    }

    setLoadingCerts(false);
  }

  // ---------------------------
  // Carregar catálogo de skills
  // ---------------------------
  async function loadAllSkills() {
    const { data, error } = await supabase
      .from("skills")
      .select("id, name, category")
      .order("name");

    if (error) {
      console.error("Erro ao carregar skills:", error.message);
    } else {
      setAllSkills(data || []);
      setSkillsLoaded(true);
    }
  }

  // ---------------------------
  // Carregar user_skills (perfil)
  // ---------------------------
  async function loadUserSkills() {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_skills")
      .select("skill_id, kind, level")
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao carregar user_skills:", error.message);
      return;
    }

    setUserSkills(
      (data || []).map((row: any) => ({
        skill_id: row.skill_id,
        kind: row.kind as "have" | "learning",
        level: row.level,
      }))
    );
  }

  useEffect(() => {
    if (user) {
      loadCertificates();
      loadAllSkills();
      loadUserSkills();
    }
  }, [user]);

  // ---------------------------
  // Helpers de skills do certificado
  // ---------------------------
  function getCurrentSkillsForCert(cert: Certificate): SkillOption[] {
    return (
      cert.certificate_skills
        ?.map((cs) =>
          cs.skills
            ? {
                id: cs.skills.id,
                name: cs.skills.name,
                category: cs.skills.category,
              }
            : null
        )
        .filter((s): s is SkillOption => s !== null) || []
    );
  }

  function isSkillAlreadyLinked(cert: Certificate, skillId: string) {
    return getCurrentSkillsForCert(cert).some((s) => s.id === skillId);
  }

  // Sugestões automáticas usando TF-IDF
  const tfidfSuggestionsByCert: Record<string, SkillOption[]> = useMemo(() => {
    if (!skillsLoaded || allSkills.length === 0) return {};

    const result: Record<string, SkillOption[]> = {};
    certificates.forEach((cert) => {
      const text = cert.raw_text || cert.titulo || "";
      if (!text) {
        result[cert.id] = [];
        return;
      }

      const scored = allSkills.map((skill) => ({
        skill,
        score: matchTFIDF(text, skill.name),
      }));

      const selected = scored
        .filter((s) => s.score > 0) // threshold simples
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((s) => s.skill);

      result[cert.id] = selected;
    });

    return result;
  }, [certificates, allSkills, skillsLoaded]);

  // ---------------------------
  // Editar certificado
  // ---------------------------
  async function handleUpdateCertificate(cert: Certificate, patch: Partial<Certificate>) {
    if (!user) return;
    setSavingCertId(cert.id);
    setErrorMsg(null);

    const { error } = await supabase
      .from("certificates")
      .update({
        titulo: patch.titulo ?? cert.titulo,
        emissor: patch.emissor ?? cert.emissor,
        data_emissao: patch.data_emissao ?? cert.data_emissao,
        carga_horaria: patch.carga_horaria ?? cert.carga_horaria,
        chave_validacao: patch.chave_validacao ?? cert.chave_validacao,
      })
      .eq("id", cert.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao salvar certificado:", error.message);
      setErrorMsg("Erro ao salvar alterações do certificado.");
    } else {
      await loadCertificates();
    }

    setSavingCertId(null);
  }

  // ---------------------------
  // Remover certificado
  // ---------------------------
  async function handleDeleteCertificate(cert: Certificate) {
    if (!user) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja remover o certificado "${cert.titulo || "sem título"}"?`
    );
    if (!confirmed) return;

    setDeletingCertId(cert.id);
    setErrorMsg(null);

    try {
      // Remove links de skills primeiro (caso não tenha cascade)
      await supabase
        .from("certificate_skills")
        .delete()
        .eq("certificate_id", cert.id);

      const { error } = await supabase
        .from("certificates")
        .delete()
        .eq("id", cert.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao remover certificado:", error.message);
        setErrorMsg("Erro ao remover certificado.");
      } else {
        setCertificates((prev) => prev.filter((c) => c.id !== cert.id));
      }
    } finally {
      setDeletingCertId(null);
    }
  }

  // ---------------------------
  // Atribuir / remover skills do certificado
  // (aqui também alimenta user_skills)
  // ---------------------------
  async function handleAddSkillToCertificate(cert: Certificate, skill: SkillOption) {
    if (!user) return;

    setErrorMsg(null);

    try {
      // 1) Vincula a skill ao certificado (certificate_skills)
      if (!isSkillAlreadyLinked(cert, skill.id)) {
        const { error: certSkillError } = await supabase
          .from("certificate_skills")
          .upsert({
            certificate_id: cert.id,
            skill_id: skill.id,
          });

        if (certSkillError) {
          console.error(
            "Erro ao vincular skill ao certificado:",
            certSkillError.message
          );
          throw new Error("Erro ao vincular skill ao certificado.");
        }

        // Atualiza estado local dos certificados
        setCertificates((prev) =>
          prev.map((c) =>
            c.id === cert.id
              ? {
                  ...c,
                  certificate_skills: [
                    ...(c.certificate_skills || []),
                    {
                      skill_id: skill.id,
                      skills: {
                        id: skill.id,
                        name: skill.name,
                        category: skill.category,
                      },
                    },
                  ],
                }
              : c
          )
        );
      }

      // 2) Garante que essa skill também aparece no perfil (user_skills)
      //    se ainda não existir.
      const { data: existing, error: existingError } = await supabase
        .from("user_skills")
        .select("skill_id, kind, level")
        .eq("user_id", user.id)
        .eq("skill_id", skill.id)
        .maybeSingle();

      if (existingError) {
        console.error("Erro ao verificar user_skills:", existingError.message);
        // não dou throw aqui, pra não quebrar o fluxo do certificado
      }

      if (!existing) {
        const { error: insertError } = await supabase.from("user_skills").insert({
          user_id: user.id,
          skill_id: skill.id,
          kind: certSkillKind,
          level: certSkillLevel,
        });

        if (insertError) {
          console.error("Erro ao criar user_skill:", insertError.message);
          setErrorMsg(
            "Skill vinculada ao certificado, mas houve erro ao adicioná-la ao perfil."
          );
        } else {
          setUserSkills((prev) => [
            ...prev,
            {
              skill_id: skill.id,
              kind: certSkillKind,
              level: certSkillLevel,
            },
          ]);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao vincular skill.");
    }
  }

  async function handleRemoveSkillFromCertificate(
    cert: Certificate,
    skillId: string
  ) {
    const { error } = await supabase
      .from("certificate_skills")
      .delete()
      .eq("certificate_id", cert.id)
      .eq("skill_id", skillId);

    if (error) {
      console.error("Erro ao remover skill do certificado:", error.message);
      setErrorMsg("Erro ao remover skill do certificado.");
      return;
    }

    setCertificates((prev) =>
      prev.map((c) =>
        c.id === cert.id
          ? {
              ...c,
              certificate_skills: (c.certificate_skills || []).filter(
                (cs) => cs.skill_id !== skillId
              ),
            }
          : c
      )
    );
  }

  // ---------------------------
  // Busca de skills (input por certificado)
  // ---------------------------
  async function handleSearchSkills(certId: string, term: string) {
    setSearchTermByCert((prev) => ({ ...prev, [certId]: term }));

    if (!term.trim()) {
      setSearchResultsByCert((prev) => ({ ...prev, [certId]: [] }));
      return;
    }

    try {
      const res = await fetch(
        `/api/skills/search?q=${encodeURIComponent(term)}&limit=8`
      );
      if (!res.ok) throw new Error("Erro ao buscar skills");

      const json = (await res.json()) as { skills: SkillOption[] };
      setSearchResultsByCert((prev) => ({ ...prev, [certId]: json.skills }));
    } catch (err) {
      console.error(err);
    }
  }

  if (loadingUser) {
    return (
      <main className="max-w-3xl mx-auto card">
        <p className="text-sm text-slate-300">Carregando usuário...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-3xl mx-auto card">
        <p className="text-sm text-slate-300">
          Você precisa estar autenticado para acessar o currículo vivo.
        </p>
      </main>
    );
  }

  return (
    <AuthGuard>
      <main className="space-y-4">
        <div className="card">
          <h2 className="text-lg font-semibold">Currículo vivo</h2>
          <p className="text-sm text-slate-300 mt-1">
            Aqui você junta experiências de microtarefas e certificados lidos por
            OCR para compor seu currículo vivo.
          </p>
        </div>

        {/* Upload com OCR, igual antes */}
        <CertificateUpload
          onSaved={() => {
            loadCertificates();
          }}
        />

        {/* Lista de certificados */}
        <section className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Certificados salvos</h3>
            {loadingCerts && (
              <span className="text-xs text-slate-400">Carregando...</span>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 mb-2">{errorMsg}</p>
          )}

          {certificates.length === 0 && !loadingCerts && (
            <p className="text-xs text-slate-400">
              Nenhum certificado salvo ainda. Envie o primeiro usando o upload
              acima.
            </p>
          )}

          <div className="space-y-4">
            {certificates.map((cert) => {
              const currentSkills = getCurrentSkillsForCert(cert);
              const tfidfSuggestions = tfidfSuggestionsByCert[cert.id] || [];
              const searchTerm = searchTermByCert[cert.id] || "";
              const searchResults = searchResultsByCert[cert.id] || [];

              return (
                <div
                  key={cert.id}
                  className="border border-slate-800 rounded-xl p-3 space-y-3 bg-slate-950/40"
                >
                  <div className="flex justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        className="w-full bg-transparent text-sm font-semibold text-slate-50 outline-none border-b border-transparent focus:border-emerald-400"
                        value={cert.titulo || ""}
                        placeholder="Título do curso / certificação"
                        onChange={(e) =>
                          setCertificates((prev) =>
                            prev.map((c) =>
                              c.id === cert.id
                                ? { ...c, titulo: e.target.value }
                                : c
                            )
                          )
                        }
                      />
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        <span>
                          Emissor:{" "}
                          <input
                            className="bg-transparent border-b border-transparent focus:border-slate-600 outline-none"
                            value={cert.emissor || ""}
                            placeholder="Instituição emissora"
                            onChange={(e) =>
                              setCertificates((prev) =>
                                prev.map((c) =>
                                  c.id === cert.id
                                    ? { ...c, emissor: e.target.value }
                                    : c
                                )
                              )
                            }
                          />
                        </span>
                        <span>•</span>
                        <span>
                          <label htmlFor={`data-emissao-${cert.id}`}>
                          Data:{" "}
                          </label>
                          <input
                            id={`data-emissao-${cert.id}`} // O ID associa o input à label
                            type="date"
                            className="bg-transparent border-b border-transparent focus:border-slate-600 outline-none"
                            value={cert.data_emissao || ""}
                            onChange={(e) =>
                              setCertificates((prev) =>
                                prev.map((c) =>
                                  c.id === cert.id
                                    ? { ...c, data_emissao: e.target.value }
                                    : c
                                )
                              )
                            }
                          />
                        </span>
                        <span>•</span>
                        <span>
                          <label htmlFor={`carga-horaria-${cert.id}`}>
                          Carga horária:{" "}
                          </label>
                          <input
                            id={`carga-horaria-${cert.id}`}
                            type="number"
                            className="w-16 bg-transparent border-b border-transparent focus:border-slate-600 outline-none"
                            value={cert.carga_horaria ?? ""}
                            onChange={(e) =>
                              setCertificates((prev) =>
                                prev.map((c) =>
                                  c.id === cert.id
                                    ? {
                                        ...c,
                                        carga_horaria: e.target.value
                                          ? Number(e.target.value)
                                          : null,
                                      }
                                    : c
                                )
                              )
                            }
                          />{" "}
                          h
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Chave de validação:{" "}
                        <input
                          className="bg-transparent border-b border-transparent focus:border-slate-600 outline-none w-56"
                          value={cert.chave_validacao || ""}
                          placeholder="Opcional"
                          onChange={(e) =>
                            setCertificates((prev) =>
                              prev.map((c) =>
                                c.id === cert.id
                                  ? { ...c, chave_validacao: e.target.value }
                                  : c
                              )
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-xs">
                      {cert.file_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewCert(cert)}
                          className="px-2 py-1 rounded-lg border border-slate-700 hover:border-emerald-400"
                        >
                          Ver arquivo
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button
                          className="px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                          disabled={savingCertId === cert.id}
                          onClick={() =>
                            handleUpdateCertificate(cert, {
                              titulo: cert.titulo,
                              emissor: cert.emissor,
                              data_emissao: cert.data_emissao,
                              carga_horaria: cert.carga_horaria,
                              chave_validacao: cert.chave_validacao,
                            })
                          }
                        >
                          {savingCertId === cert.id ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          className="px-2 py-1 rounded-lg border border-red-500 text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                          disabled={deletingCertId === cert.id}
                          onClick={() => handleDeleteCertificate(cert)}
                        >
                          {deletingCertId === cert.id ? "Removendo..." : "Remover"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Config de como a skill entra no perfil */}
                  <div className="flex flex-wrap gap-2 items-center text-[11px] mb-2">
                    <span className="text-slate-400">
                      Quando eu adicionar uma skill:
                    </span>

                    <button
                      type="button"
                      className={`px-2 py-1 rounded-full border ${
                        certSkillKind === "have"
                          ? "border-emerald-400 text-emerald-400"
                          : "border-slate-600 text-slate-300"
                      }`}
                      onClick={() => setCertSkillKind("have")}
                    >
                      Conta como skill que tenho
                    </button>

                    <button
                      type="button"
                      className={`px-2 py-1 rounded-full border ${
                        certSkillKind === "learning"
                          ? "border-emerald-400 text-emerald-400"
                          : "border-slate-600 text-slate-300"
                      }`}
                      onClick={() => setCertSkillKind("learning")}
                    >
                      Conta como skill que estou aprendendo
                    </button>

                    <span className="ml-2 text-slate-400">Nível:</span>
                    <label 
                      htmlFor={`nivel-habilidade-${cert.id}`} 
                      className="ml-2 text-slate-400"
                    >
                      Nível:
                    </label>
                    <select
                      id={`nivel-habilidade-${cert.id}`} // ID único para acessibilidade
                      className="rounded-xl bg-slate-900 border border-slate-700 px-2 py-1 text-[11px]"
                      value={certSkillLevel}
                      onChange={(e) => setCertSkillLevel(e.target.value)}
                    >
                      <option value="iniciante">Iniciante</option>
                      <option value="intermediário">Intermediário</option>
                      <option value="avançado">Avançado</option>
                    </select>
                  </div>

                  {/* Skills vinculadas */}
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400">Skills vinculadas</p>
                    <div className="flex flex-wrap gap-2">
                      {currentSkills.length === 0 && (
                        <span className="text-[11px] text-slate-500">
                          Nenhuma skill vinculada ainda.
                        </span>
                      )}

                      {currentSkills.map((skill) => (
                        <span
                          key={skill.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px]"
                        >
                          {skill.name}
                          {skill.category && (
                            <span className="text-[10px] text-slate-500">
                              ({skill.category})
                            </span>
                          )}
                          <button
                            type="button"
                            className="text-[10px] text-red-400 hover:text-red-300"
                            onClick={() =>
                              handleRemoveSkillFromCertificate(cert, skill.id)
                            }
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Sugestões por TF-IDF */}
                    {tfidfSuggestions.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] text-slate-500">
                          Sugestões automáticas (TF-IDF)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {tfidfSuggestions.map((skill) => (
                            <button
                              key={skill.id}
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-500/60 text-[11px] text-emerald-300 hover:bg-emerald-500/10"
                              disabled={isSkillAlreadyLinked(cert, skill.id)}
                              onClick={() =>
                                handleAddSkillToCertificate(cert, skill)
                              }
                            >
                              {skill.name}
                              {skill.category && (
                                <span className="text-[10px] text-emerald-200/70">
                                  ({skill.category})
                                </span>
                              )}
                              {isSkillAlreadyLinked(cert, skill.id) && (
                                <span className="text-[9px] text-emerald-300/60">
                                  já vinculada
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Busca manual de skill */}
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-500">
                        Buscar e adicionar skill
                      </p>
                      <input
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs"
                        placeholder="Digite para buscar no catálogo de skills (ex: Python, CRM, Gestão)..."
                        value={searchTerm}
                        onChange={(e) =>
                          handleSearchSkills(cert.id, e.target.value)
                        }
                      />

                      {searchResults.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {searchResults.map((skill) => (
                            <button
                              key={skill.id}
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-700 text-[11px] text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
                              disabled={isSkillAlreadyLinked(cert, skill.id)}
                              onClick={() =>
                                handleAddSkillToCertificate(cert, skill)
                              }
                            >
                              {skill.name}
                              {skill.category && (
                                <span className="text-[10px] text-slate-500">
                                  ({skill.category})
                                </span>
                              )}
                              {isSkillAlreadyLinked(cert, skill.id) && (
                                <span className="text-[9px] text-emerald-300/60">
                                  já vinculada
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        {previewCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-slate-950 rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-800">
              {/* Cabeçalho do modal */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    {previewCert.titulo || "Certificado"}
                  </p>
                  {previewCert.emissor && (
                    <p className="text-xs text-slate-400">{previewCert.emissor}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {previewCert.file_url && (
                    <a
                      href={previewCert.file_url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="px-3 py-1 rounded-lg border border-slate-700 text-xs hover:border-emerald-400"
                    >
                      Baixar
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewCert(null)}
                    className="px-3 py-1 rounded-lg border border-slate-700 text-xs hover:border-red-500 hover:text-red-300"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              {/* Corpo com preview */}
              <div className="flex-1">
                {previewCert.file_url ? (
                  <iframe
                    src={previewCert.file_url}
                    className="w-full h-full min-h-[60vh] rounded-b-2xl"
                  />
                ) : (
                  <div className="p-4 text-xs text-slate-400">
                    Não foi possível carregar o arquivo.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
