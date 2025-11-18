// src/app/cv/page.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { CertificateUpload } from "@/components/certificateUpload";
import { AuthGuard } from "@/components/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type CertificateSkill = {
  skill_id: string;
  skill_name: string;
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
  skills: CertificateSkill[];
};

type SkillOption = {
  id: string;
  name: string;
  category: string | null;
};

export default function CvPage() {
  const { user, loading: loadingUser } = useSupabaseUser();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [savingCertId, setSavingCertId] = useState<string | null>(null);
  const [deletingCertId, setDeletingCertId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // busca de skills por certificado
  const [skillSearch, setSkillSearch] = useState<string>("");
  const [skillResults, setSkillResults] = useState<SkillOption[]>([]);
  const [skillLoading, setSkillLoading] = useState(false);
  const [skillSearchTouched, setSkillSearchTouched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [certIdForSkill, setCertIdForSkill] = useState<string | null>(null);

  // ---------------------------------------------------
  // Carregar certificados do usuário
  // ---------------------------------------------------
  const fetchCertificates = useCallback(async () => {
    if (!user || loadingUser) return;

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
          skills ( name )
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar certificados:", error);
      setErrorMsg("Não foi possível carregar seus certificados.");
    } else if (data) {
      const rows = data as any[];

      const mapped: Certificate[] = rows.map((row) => ({
        id: row.id,
        titulo: row.titulo,
        emissor: row.emissor,
        data_emissao: row.data_emissao,
        carga_horaria: row.carga_horaria,
        chave_validacao: row.chave_validacao,
        file_url: row.file_url,
        raw_text: row.raw_text,
        skills:
          row.certificate_skills?.map((cs: any) => ({
            skill_id: cs.skill_id,
            skill_name: cs.skills?.name ?? "",
          })) ?? [],
      }));
      setCertificates(mapped);
    }

    setLoadingCerts(false);
  }, [user, loadingUser]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // callback chamado depois que o CertificateUpload terminar de salvar
  function handleCertificatesSaved() {
    // sem argumentos, casa com o tipo onSaved?: () => void;
    fetchCertificates();
  }

  // ---------------------------------------------------
  // Atualizar certificado
  // ---------------------------------------------------
  async function handleUpdateCertificate(cert: Certificate) {
    if (!user) return;

    setSavingCertId(cert.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase
      .from("certificates")
      .update({
        titulo: cert.titulo,
        emissor: cert.emissor,
        data_emissao: cert.data_emissao,
        carga_horaria: cert.carga_horaria,
        chave_validacao: cert.chave_validacao,
        raw_text: cert.raw_text,
      })
      .eq("id", cert.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao atualizar certificado:", error);
      setErrorMsg("Erro ao atualizar certificado.");
    } else {
      setSuccessMsg("Certificado atualizado.");
    }

    setSavingCertId(null);
  }

  // ---------------------------------------------------
  // Remover certificado
  // ---------------------------------------------------
  async function handleDeleteCertificate(certId: string) {
    if (!user) return;

    setDeletingCertId(certId);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase
      .from("certificates")
      .delete()
      .eq("id", certId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao remover certificado:", error);
      setErrorMsg("Erro ao remover certificado.");
    } else {
      setCertificates((prev) => prev.filter((c) => c.id !== certId));
      setSuccessMsg("Certificado removido.");
    }

    setDeletingCertId(null);
  }

  // ---------------------------------------------------
  // Busca de skills por certificado
  // ---------------------------------------------------
  async function handleSearchSkills(term: string, certId: string) {
    setSkillSearch(term);
    setSkillResults([]);
    setSkillSearchTouched(true);
    setCertIdForSkill(certId);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSkillLoading(false);
      return;
    }

    setSkillLoading(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/skills/search?q=${encodeURIComponent(trimmed)}&limit=10`
        );
        if (!res.ok) {
          console.error("Falha ao buscar skills");
          setSkillLoading(false);
          return;
        }
        const json = (await res.json()) as {
          skills?: { id: string; name: string; category?: string | null }[];
        };
        setSkillResults(
          (json.skills || []).map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category ?? null,
          }))
        );
      } catch (err) {
        console.error("Erro ao chamar /api/skills/search:", err);
      } finally {
        setSkillLoading(false);
      }
    }, 300);
  }

  // ---------------------------------------------------
  // Vincular skill ao certificado
  // ---------------------------------------------------
  async function handleAddSkillToCertificate(certId: string, skill: SkillOption) {
    if (!user) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // evita duplicar
    const cert = certificates.find((c) => c.id === certId);
    if (cert && cert.skills.some((s) => s.skill_id === skill.id)) {
      setErrorMsg("Essa skill já está vinculada a este certificado.");
      return;
    }

    const { error } = await supabase.from("certificate_skills").insert({
      certificate_id: certId,
      skill_id: skill.id,
    });

    if (error) {
      console.error("Erro ao vincular skill ao certificado:", error);
      setErrorMsg("Erro ao vincular skill ao certificado.");
    } else {
      setCertificates((prev) =>
        prev.map((c) =>
          c.id === certId
            ? {
                ...c,
                skills: [
                  ...c.skills,
                  { skill_id: skill.id, skill_name: skill.name },
                ],
              }
            : c
        )
      );
      setSkillSearch("");
      setSkillResults([]);
      setCertIdForSkill(null);
      setSuccessMsg("Skill vinculada ao certificado.");
    }
  }

  // ---------------------------------------------------
  // Remover skill do certificado
  // ---------------------------------------------------
  async function handleRemoveSkillFromCertificate(
    certId: string,
    skillId: string
  ) {
    if (!user) return;

    const { error } = await supabase
      .from("certificate_skills")
      .delete()
      .eq("certificate_id", certId)
      .eq("skill_id", skillId);

    if (error) {
      console.error("Erro ao remover skill do certificado:", error);
      setErrorMsg("Erro ao remover skill do certificado.");
    } else {
      setCertificates((prev) =>
        prev.map((c) =>
          c.id === certId
            ? {
                ...c,
                skills: c.skills.filter((s) => s.skill_id !== skillId),
              }
            : c
        )
      );
    }
  }

  // ---------------------------------------------------
  // Atualizar certificado localmente (inputs controlados)
  // ---------------------------------------------------
  function updateCertificateLocal(
    certId: string,
    patch: Partial<Certificate>
  ) {
    setCertificates((prev) =>
      prev.map((c) => (c.id === certId ? { ...c, ...patch } : c))
    );
  }

  // ---------------------------------------------------
  // Render
  // ---------------------------------------------------
  if (loadingUser) {
    return (
      <AuthGuard>
        <main className="space-y-4">
          <p className="text-xs text-slate-400">Carregando usuário...</p>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="space-y-4">
        <div className="card">
          <h2 className="text-lg font-semibold">Currículo vivo</h2>
          <p className="text-sm text-slate-300">
            Aqui você junta experiências de microtarefas e certificados lidos por
            OCR para compor seu currículo vivo.
          </p>
        </div>

        {/* Upload + OCR etc (o próprio componente salva no backend e chama onSaved) */}
        <CertificateUpload onSaved={handleCertificatesSaved} />

        {/* Lista de certificados */}
        <section className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Certificados cadastrados
          </h3>

          {loadingCerts ? (
            <p className="text-xs text-slate-400">Carregando certificados...</p>
          ) : certificates.length === 0 ? (
            <p className="text-xs text-slate-500">
              Você ainda não cadastrou nenhum certificado.
            </p>
          ) : (
            <div className="space-y-3">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="border border-slate-800 rounded-xl p-3 text-xs space-y-2"
                >
                  <div className="flex justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold"
                        value={cert.titulo || ""}
                        onChange={(e) =>
                          updateCertificateLocal(cert.id, {
                            titulo: e.target.value,
                          })
                        }
                        placeholder="Título do curso"
                      />
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                        value={cert.emissor || ""}
                        onChange={(e) =>
                          updateCertificateLocal(cert.id, {
                            emissor: e.target.value,
                          })
                        }
                        placeholder="Emissor"
                      />
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                          value={cert.data_emissao || ""}
                          onChange={(e) =>
                            updateCertificateLocal(cert.id, {
                              data_emissao: e.target.value,
                            })
                          }
                          placeholder="Data emissão (YYYY-MM-DD)"
                        />
                        <input
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                          value={
                            cert.carga_horaria != null
                              ? String(cert.carga_horaria)
                              : ""
                          }
                          onChange={(e) =>
                            updateCertificateLocal(cert.id, {
                              carga_horaria: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          placeholder="Horas"
                        />
                      </div>
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                        value={cert.chave_validacao || ""}
                        onChange={(e) =>
                          updateCertificateLocal(cert.id, {
                            chave_validacao: e.target.value,
                          })
                        }
                        placeholder="Chave de validação (opcional)"
                      />
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {cert.file_url && (
                        <a
                          href={cert.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-400 hover:underline"
                        >
                          Ver arquivo
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUpdateCertificate(cert)}
                        disabled={savingCertId === cert.id}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-[11px] font-medium hover:bg-emerald-400 disabled:opacity-60"
                      >
                        {savingCertId === cert.id
                          ? "Salvando..."
                          : "Salvar alterações"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCertificate(cert.id)}
                        disabled={deletingCertId === cert.id}
                        className="px-3 py-1 rounded-lg border border-red-500 text-red-400 text-[11px] hover:bg-red-500/10 disabled:opacity-60"
                      >
                        {deletingCertId === cert.id ? "Removendo..." : "Remover"}
                      </button>
                    </div>
                  </div>

                  {/* Skills desse certificado */}
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400">
                      Skills relacionadas a este certificado:
                    </p>

                    {cert.skills.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        Nenhuma skill vinculada ainda.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {cert.skills.map((s) => (
                          <span
                            key={s.skill_id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 border border-slate-600 text-[11px]"
                          >
                            {s.skill_name}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveSkillFromCertificate(
                                  cert.id,
                                  s.skill_id
                                )
                              }
                              className="text-[10px] text-slate-400 hover:text-red-400 ml-1"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Campo de busca de skill ligado a este certificado */}
                    <div className="relative mt-1">
                      <input
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs"
                        value={certIdForSkill === cert.id ? skillSearch : ""}
                        onChange={(e) =>
                          handleSearchSkills(e.target.value, cert.id)
                        }
                        placeholder="Buscar skill para vincular (ex: Python, Kubernetes...)"
                        autoComplete="off"
                      />
                      {certIdForSkill === cert.id &&
                        (skillLoading ||
                          skillResults.length > 0 ||
                          (skillSearchTouched &&
                            skillSearch &&
                            !skillLoading)) && (
                          <div className="absolute left-0 right-0 mt-1 border border-slate-700 rounded-xl bg-slate-900 max-h-48 overflow-y-auto text-xs z-20 shadow-lg">
                            {skillLoading && (
                              <div className="px-3 py-2 text-slate-400">
                                Buscando skills...
                              </div>
                            )}

                            {!skillLoading &&
                              skillResults.length === 0 &&
                              skillSearch && (
                                <div className="px-3 py-2 text-slate-500">
                                  Nenhuma skill encontrada. Fale com o RH para
                                  incluir no catálogo.
                                </div>
                              )}

                            {!skillLoading &&
                              skillResults.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-slate-800 flex justify-between items-center"
                                  onClick={() =>
                                    handleAddSkillToCertificate(cert.id, s)
                                  }
                                >
                                  <span>{s.name}</span>
                                  {s.category && (
                                    <span className="text-[10px] text-slate-400">
                                      {s.category}
                                    </span>
                                  )}
                                </button>
                              ))}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
        {successMsg && (
          <p className="text-xs text-emerald-400">{successMsg}</p>
        )}
      </main>
    </AuthGuard>
  );
}
