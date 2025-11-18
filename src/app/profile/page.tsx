"use client";

import { useEffect, useState, useRef } from "react";
import { AuthGuard } from "@/components/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type UserSkill = {
  skill_id: string;
  skill_name: string;
  kind: "have" | "learning";
  level: string | null;
};

type SkillOption = {
  id: string;
  name: string;
  category: string | null;
};

export default function ProfilePage() {
  const { user, loading: loadingUser } = useSupabaseUser();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [area, setArea] = useState("");
  const [senioridade, setSenioridade] = useState("");
  const [metas, setMetas] = useState("");

  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);

  // Estado da busca de skills
  const [skillSearch, setSkillSearch] = useState("");
  const [skillResults, setSkillResults] = useState<SkillOption[]>([]);
  const [skillKind, setSkillKind] = useState<"have" | "learning">("have");
  const [skillLevel, setSkillLevel] = useState("intermediário");
  const [skillLoading, setSkillLoading] = useState(false);
  const [skillSearchTouched, setSkillSearchTouched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user || loadingUser) return;

    async function fetchProfile() {
      setLoadingProfile(true);
      setErrorMsg(null);

      // Perfil
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("area, seniority, career_goals, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Erro ao carregar perfil:", profileError);
        setErrorMsg("Não foi possível carregar seu perfil.");
      } else if (profile) {
        setArea(profile.area || "");
        setSenioridade(profile.seniority || "");
        setMetas(profile.career_goals || "");
        setAvatarUrl(profile.avatar_url || null);
      }

      // Skills do usuário (join na tabela skills)
      const { data: skillsData, error: skillsError } = await supabase
        .from("user_skills")
        .select("skill_id, level, kind, skills(name)")
        .eq("user_id", user.id);

      if (skillsError) {
        console.error("Erro ao carregar skills:", skillsError);
      } else if (skillsData) {
        const mapped: UserSkill[] = skillsData.map((row: any) => ({
          skill_id: row.skill_id,
          skill_name: row.skills?.name ?? "",
          kind: row.kind as "have" | "learning",
          level: row.level,
        }));
        setUserSkills(mapped);
      }

      setLoadingProfile(false);
    }

    fetchProfile();
  }, [user, loadingUser]);

  async function handleSaveProfile() {
    if (!user) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          area,
          seniority: senioridade,
          career_goals: metas,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("Erro ao salvar perfil:", upsertError);
      setErrorMsg("Erro ao salvar perfil. Tente novamente.");
    } else {
      setSuccessMsg("Perfil atualizado com sucesso.");
      setIsEditing(false);
    }

    setSaving(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `user-${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      if (uploadError || !uploadData) {
        console.error("Erro no upload do avatar:", uploadError);
        throw uploadError || new Error("Falha ao enviar arquivo");
      }

      const { data: publicData } = supabase
        .storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      const publicUrl = publicData.publicUrl;

      console.log("URL pública do avatar gerada:", publicUrl);

      // Atualiza no profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (profileError) {
        console.error("Erro ao salvar avatar_url no profile:", profileError);
        throw profileError;
      }

      setAvatarUrl(publicUrl);
      setSuccessMsg("Foto de perfil atualizada.");

    } catch (err: any) {
      console.error("Erro ao atualizar avatar:", err);
      setErrorMsg("Erro ao enviar a foto de perfil.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
  if (!user || !avatarUrl) return;

  setUploadingAvatar(true);
  setErrorMsg(null);
  setSuccessMsg(null);

  try {
    // Descobre o path dentro do bucket a partir da URL pública
    const url = new URL(avatarUrl);
    // Ex: /storage/v1/object/public/avatars/user-<id>/arquivo.png
    const segments = url.pathname.split("/");
    const bucketIndex = segments.indexOf("avatars");
    let filePath: string | null = null;

    if (bucketIndex !== -1) {
      filePath = segments.slice(bucketIndex + 1).join("/");
    }

    // Se conseguiu extrair o path, tenta remover do storage
    if (filePath) {
      const { error: storageError } = await supabase
        .storage
        .from("avatars")
        .remove([filePath]);

      if (storageError) {
        console.error("Erro ao remover arquivo do storage:", storageError);
        // não dou throw aqui pra ainda assim limpar o perfil se quiser
      }
    }

    // Limpa o avatar_url no profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (profileError) {
      console.error("Erro ao limpar avatar_url no profile:", profileError);
      throw profileError;
    }

    setAvatarUrl(null);
    setSuccessMsg("Foto de perfil removida.");
  } catch (err: any) {
    console.error("Erro ao remover avatar:", err);
    setErrorMsg("Erro ao remover a foto de perfil.");
  } finally {
    setUploadingAvatar(false);
  }
  }

  // Busca skills no endpoint /api/skills/search com debounce
  async function handleSearchSkills(term: string) {
    setSkillSearch(term);
    setSkillResults([]);
    setSkillSearchTouched(true);

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
        const json = await res.json();
        setSkillResults(
          (json.skills || []).map((s: any) => ({
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

  async function handleAddSkill(skill: SkillOption) {
    if (!user) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // evita duplicar se já existir com mesmo kind
    const alreadyHas = userSkills.some(
      (s) => s.skill_id === skill.id && s.kind === skillKind
    );
    if (alreadyHas) {
      setErrorMsg("Você já tem essa skill cadastrada nesse grupo.");
      return;
    }

    const { error } = await supabase.from("user_skills").insert({
      user_id: user.id,
      skill_id: skill.id,
      kind: skillKind,
      level: skillLevel,
    });

    if (error) {
      console.error("Erro ao adicionar skill:", error);
      setErrorMsg("Erro ao adicionar skill ao seu perfil.");
    } else {
      setUserSkills((prev) => [
        ...prev,
        {
          skill_id: skill.id,
          skill_name: skill.name,
          kind: skillKind,
          level: skillLevel,
        },
      ]);
      setSkillSearch("");
      setSkillResults([]);
      setSuccessMsg("Skill adicionada ao perfil.");
    }
  }

  async function handleRemoveSkill(skillId: string, kind: "have" | "learning") {
    if (!user) return;

    const { error } = await supabase
      .from("user_skills")
      .delete()
      .eq("user_id", user.id)
      .eq("skill_id", skillId)
      .eq("kind", kind);

    if (error) {
      console.error("Erro ao remover skill:", error);
      setErrorMsg("Erro ao remover skill.");
    } else {
      setUserSkills((prev) =>
        prev.filter((s) => !(s.skill_id === skillId && s.kind === kind))
      );
    }
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? "U";

  const haveSkills = userSkills.filter((s) => s.kind === "have");
  const learningSkills = userSkills.filter((s) => s.kind === "learning");

  return (
    <AuthGuard>
      <main className="card space-y-4 max-w-2xl mx-auto">
        {loadingProfile ? (
          <p className="text-xs text-slate-400">Carregando seu perfil...</p>
        ) : (
          <>
            {/* Cabeçalho do perfil */}
            <div className="flex items-start gap-4">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="h-16 w-16 rounded-full object-cover border border-slate-700"
                    onError={() => setAvatarUrl(null)}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center text-lg font-bold text-slate-950">
                    {initials}
                  </div>
                )}

                {isEditing && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    <label
                      htmlFor="avatarUpload"
                      className="bg-slate-900 border border-slate-600 rounded-full px-2 py-1 text-[10px] cursor-pointer hover:border-emerald-400"
                    >
                      {uploadingAvatar ? "..." : "Trocar"}
                      <input
                        id="avatarUpload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="bg-slate-900 border border-slate-600 rounded-full px-2 py-1 text-[10px] hover:border-red-400"
                        disabled={uploadingAvatar}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-semibold">
                  {user?.email ?? "Colaborador"}
                </h2>
                <p className="text-sm text-slate-300">
                  {area || "Área não definida"} •{" "}
                  {senioridade || "Senioridade não definida"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Metas:{" "}
                  {metas ||
                    "Defina suas metas de carreira para alimentar o matching."}
                </p>
              </div>
              <button
                type="button"
                className="px-3 py-1 rounded-xl border border-slate-600 text-xs hover:border-emerald-400"
                onClick={() => {
                  setIsEditing((prev) => !prev);
                  setSuccessMsg(null);
                  setErrorMsg(null);
                }}
              >
                {isEditing ? "Cancelar" : "Editar perfil"}
              </button>
            </div>

            {/* Seção de skills (sempre ativa, independente do modo edição) */}
            <section className="space-y-3 text-sm">
              <h3 className="text-xs font-semibold text-slate-300">Skills</h3>

              {/* Área de adicionar skill */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <span className="text-slate-400">Modo:</span>
                  <button
                    type="button"
                    className={`px-2 py-1 rounded-full border ${
                      skillKind === "have"
                        ? "border-emerald-400 text-emerald-400"
                        : "border-slate-600 text-slate-300"
                    }`}
                    onClick={() => setSkillKind("have")}
                  >
                    Skills que tenho
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 rounded-full border ${
                      skillKind === "learning"
                        ? "border-emerald-400 text-emerald-400"
                        : "border-slate-600 text-slate-300"
                    }`}
                    onClick={() => setSkillKind("learning")}
                  >
                    Skills que quero aprender
                  </button>

                  <span className="ml-3 text-slate-400">Nível:</span>
                  <label htmlFor="skill-select">
                    Nível de habilidade:
                  </label>
                  <select
                    id="skill-select"
                    className="rounded-xl bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                  >
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediário">Intermediário</option>
                    <option value="avançado">Avançado</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="skillSearch"
                    className="block text-xs mb-1 text-slate-300"
                  >
                    Buscar skill no catálogo corporativo
                  </label>
                  <div className="relative">
                    <input
                      id="skillSearch"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                      value={skillSearch}
                      onChange={(e) => handleSearchSkills(e.target.value)}
                      placeholder="Ex: Python, Liderança, Kubernetes..."
                      autoComplete="off"
                    />

                    {(skillLoading ||
                      skillResults.length > 0 ||
                      (skillSearchTouched &&
                        skillSearch &&
                        !skillLoading)) && (
                      <div className="absolute left-0 right-0 mt-1 border border-slate-700 rounded-xl bg-slate-900 max-h-56 overflow-y-auto text-xs z-20 shadow-lg">
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
                              onClick={() => handleAddSkill(s)}
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

              {/* Skills que tenho */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-1">
                  Skills que tenho
                </h4>
                {haveSkills.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Você ainda não adicionou nenhuma skill que possui.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {haveSkills.map((s) => (
                      <span
                        key={`${s.skill_id}-${s.kind}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 border border-slate-600 text-[11px]"
                      >
                        {s.skill_name}
                        {s.level && (
                          <span className="text-[10px] text-slate-400">
                            ({s.level})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s.skill_id, s.kind)}
                          className="text-[10px] text-slate-400 hover:text-red-400 ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Skills que quero aprender */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-1">
                  Skills que quero aprender
                </h4>
                {learningSkills.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Você ainda não adicionou nenhuma skill que deseja aprender.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {learningSkills.map((s) => (
                      <span
                        key={`${s.skill_id}-${s.kind}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 border border-slate-600 text-[11px]"
                      >
                        {s.skill_name}
                        {s.level && (
                          <span className="text-[10px] text-slate-400">
                            ({s.level})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s.skill_id, s.kind)}
                          className="text-[10px] text-slate-400 hover:text-red-400 ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Formulário de edição de dados gerais */}
            {isEditing && (
              <div className="space-y-3 text-sm pt-2 border-t border-slate-800">
                <div>
                  <label
                    htmlFor="area"
                    className="block text-xs mb-1 text-slate-300"
                  >
                    Área de atuação
                  </label>
                  <input
                    id="area"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Infra, Dados, Produto..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="senioridade"
                    className="block text-xs mb-1 text-slate-300"
                  >
                    Senioridade
                  </label>
                  <input
                    id="senioridade"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                    value={senioridade}
                    onChange={(e) => setSenioridade(e.target.value)}
                    placeholder="Júnior, Pleno, Sênior..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="metas"
                    className="block text-xs mb-1 text-slate-300"
                  >
                    Metas de carreira
                  </label>
                  <textarea
                    id="metas"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm min-h-[100px]"
                    value={metas}
                    onChange={(e) => setMetas(e.target.value)}
                    placeholder="Quero migrar para dados, quero chegar a diretor, etc."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-400">{errorMsg}</p>
            )}
            {successMsg && (
              <p className="text-xs text-emerald-400">{successMsg}</p>
            )}

            <p className="text-[11px] text-slate-500">
              Este perfil alimenta o motor de matching de microtarefas e os
              dashboards de desenvolvimento de talentos para o RH.
            </p>
          </>
        )}
      </main>
    </AuthGuard>
  );
}
