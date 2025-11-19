"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";
import { AuthGuard } from "@/components/authGuard";

type Skill = {
  name: string;
  category: string | null;
  level: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  area: string | null;
  seniority: string | null;
  career_goals: string | null;
  avatar_url: string | null;
  created_at: string;
};

type EndorsementRow = {
  id: string;
  task_id: string | null;
  from_user: string;
  to_user: string;
  message: string | null;
  skill: string | null;
  created_at: string;
};

type TaskRow = {
  id: string;
  title: string;
};

type PublicProfilePageProps = {
  params: { id: string };
};

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
  const profileId = params.id;
  const { user, loading: loadingUser } = useSupabaseUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [haveSkills, setHaveSkills] = useState<Skill[]>([]);
  const [learningSkills, setLearningSkills] = useState<Skill[]>([]);
  const [endorsements, setEndorsements] = useState<EndorsementRow[]>([]);
  const [tasksByCurrentUser, setTasksByCurrentUser] = useState<TaskRow[]>([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingEndorsements, setLoadingEndorsements] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [endorseMsg, setEndorseMsg] = useState("");
  const [endorseSkill, setEndorseSkill] = useState("");
  const [endorseTaskId, setEndorseTaskId] = useState<string>("");
  const [savingEndorsement, setSavingEndorsement] = useState(false);

  const isOwnProfile = user?.id === profileId;

  // Mapa de tasks por ID (para mostrar título na lista de endorsements)
  const tasksMap = useMemo(() => {
    const map: Record<string, string> = {};
    tasksByCurrentUser.forEach((t) => {
      map[t.id] = t.title;
    });
    return map;
  }, [tasksByCurrentUser]);

  // Carrega dados básicos do perfil + skills
  useEffect(() => {
    async function loadProfile() {
      setLoadingProfile(true);
      setErrorMsg(null);
      try {
        // Perfil
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, area, seniority, career_goals, avatar_url, created_at"
          )
          .eq("id", profileId)
          .single();

        if (profileError) {
          console.error("Erro ao carregar perfil público:", profileError);
          setErrorMsg("Não foi possível carregar este perfil.");
          setLoadingProfile(false);
          return;
        }

        setProfile(profileData);

        // Skills que possui
        const { data: haveData, error: haveError } = await supabase
          .from("user_skills")
          .select(
            `
            level,
            kind,
            skills:skills ( name, category )
          `
          )
          .eq("user_id", profileId);

        if (haveError) {
          console.error("Erro ao carregar skills do usuário:", haveError);
          setLoadingProfile(false);
          return;
        }

        const have: Skill[] = [];
        const learning: Skill[] = [];

        (haveData || []).forEach((row: any) => {
          const skill: Skill = {
            name: row.skills?.name ?? "",
            category: row.skills?.category ?? null,
            level: row.level ?? null,
          };
          if (row.kind === "have") {
            have.push(skill);
          } else if (row.kind === "learning") {
            learning.push(skill);
          }
        });

        setHaveSkills(have);
        setLearningSkills(learning);
      } catch (e) {
        console.error("Erro inesperado em loadProfile:", e);
        setErrorMsg("Erro inesperado ao carregar este perfil.");
      } finally {
        setLoadingProfile(false);
      }
    }

    if (profileId) {
      void loadProfile();
    }
  }, [profileId]);

  // Carrega endorsements que este usuário recebeu
  useEffect(() => {
    async function loadEndorsements() {
      setLoadingEndorsements(true);
      try {
        const { data, error } = await supabase
          .from("endorsements")
          .select(
            "id, task_id, from_user, to_user, message, skill, created_at"
          )
          .eq("to_user", profileId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Erro ao carregar endorsements:", error);
          setLoadingEndorsements(false);
          return;
        }

        setEndorsements(data || []);
      } catch (e) {
        console.error("Erro inesperado em loadEndorsements:", e);
      } finally {
        setLoadingEndorsements(false);
      }
    }

    if (profileId) {
      void loadEndorsements();
    }
  }, [profileId]);

  // Carrega tasks criadas pelo usuário logado (para escolher no endorsement)
  useEffect(() => {
    async function loadMyTasks() {
      if (!user) {
        setTasksByCurrentUser([]);
        setLoadingTasks(false);
        return;
      }

      setLoadingTasks(true);
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Erro ao carregar tasks do usuário atual:", error);
          setLoadingTasks(false);
          return;
        }

        setTasksByCurrentUser(data || []);
      } catch (e) {
        console.error("Erro inesperado em loadMyTasks:", e);
      } finally {
        setLoadingTasks(false);
      }
    }

    void loadMyTasks();
  }, [user]);

  async function handleCreateEndorsement() {
    if (!user || isOwnProfile) return;

    if (!endorseTaskId || !endorseSkill.trim() || !endorseMsg.trim()) {
      return;
    }

    setSavingEndorsement(true);

    try {
      const { data, error } = await supabase
        .from("endorsements")
        .insert({
          task_id: endorseTaskId,
          from_user: user.id,
          to_user: profileId,
          message: endorseMsg.trim(),
          skill: endorseSkill.trim(),
        })
        .select(
          "id, task_id, from_user, to_user, message, skill, created_at"
        )
        .single();

      if (error) {
        console.error("Erro ao criar endorsement:", error);
        setSavingEndorsement(false);
        return;
      }

      if (data) {
        setEndorsements((prev) => [data, ...prev]);
        setEndorseMsg("");
        setEndorseSkill("");
        setEndorseTaskId("");
      }
    } catch (e) {
      console.error("Erro inesperado ao criar endorsement:", e);
    } finally {
      setSavingEndorsement(false);
    }
  }

  if (loadingUser || loadingProfile) {
    return (
      <AuthGuard>
        <main className="card max-w-3xl mx-auto">
          <p className="text-sm text-slate-300">Carregando perfil...</p>
        </main>
      </AuthGuard>
    );
  }

  if (!profile) {
    return (
      <AuthGuard>
        <main className="card max-w-3xl mx-auto">
          <p className="text-sm text-slate-300">
            Perfil não encontrado ou indisponível.
          </p>
        </main>
      </AuthGuard>
    );
  }

  const initials =
    profile.full_name?.[0]?.toUpperCase() ||
    profile.area?.[0]?.toUpperCase() ||
    "U";

  return (
    <AuthGuard>
      <main className="space-y-4 max-w-4xl mx-auto">
        {/* Cabeçalho do perfil */}
        <section className="card flex flex-col md:flex-row gap-4">
          <div className="flex items-start gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "Avatar"}
                className="h-16 w-16 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center text-lg font-bold text-slate-950">
                {initials}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {profile.full_name || "Perfil sem nome"}
              </h1>
              <p className="text-sm text-slate-300">
                {profile.area || "Área não informada"}{" "}
                <span className="text-slate-500">•</span>{" "}
                {profile.seniority || "Senioridade não informada"}
              </p>
              {profile.career_goals && (
                <p className="mt-2 text-xs text-slate-400">
                  Metas de carreira: {profile.career_goals}
                </p>
              )}
              <p className="mt-2 text-[11px] text-slate-500">
                Entrou em{" "}
                {new Date(profile.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-2">
            <h2 className="text-sm font-semibold text-slate-100">
              Skills que possui
            </h2>
            {haveSkills.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Nenhuma skill cadastrada ainda.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {haveSkills.map((s, idx) => (
                  <span
                    key={`have-${idx}-${s.name}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px]"
                  >
                    {s.name}
                    {s.level && (
                      <span className="text-[9px] text-emerald-300/80">
                        ({s.level})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card space-y-2">
            <h2 className="text-sm font-semibold text-slate-100">
              Skills que está aprendendo
            </h2>
            {learningSkills.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Ainda não cadastrou skills em aprendizado.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {learningSkills.map((s, idx) => (
                  <span
                    key={`learning-${idx}-${s.name}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-emerald-500/60 text-[11px] text-emerald-200"
                  >
                    {s.name}
                    {s.level && (
                      <span className="text-[9px] text-emerald-200/80">
                        ({s.level})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Endorsements recebidos */}
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              Endorsements recebidos
            </h2>
            <span className="text-[11px] text-slate-400">
              {loadingEndorsements
                ? "Carregando..."
                : `${endorsements.length} registro${
                    endorsements.length === 1 ? "" : "s"
                  }`}
            </span>
          </div>

          {endorsements.length === 0 && !loadingEndorsements && (
            <p className="text-[11px] text-slate-500">
              Ainda não há endorsements para este perfil.
            </p>
          )}

          <div className="space-y-2">
            {endorsements.map((e) => (
              <div
                key={e.id}
                className="border border-slate-800 rounded-xl p-3 bg-slate-950/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-emerald-300 font-semibold">
                    Skill: {e.skill || "não informado"}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {new Date(e.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {e.task_id && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Task relacionada:{" "}
                    <span className="text-slate-200 font-medium">
                      {tasksMap[e.task_id] || e.task_id}
                    </span>
                  </p>
                )}
                {e.message && (
                  <p className="mt-2 text-xs text-slate-300">{e.message}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Criar endorsement (somente se não for o próprio perfil) */}
        {!isOwnProfile && user && (
          <section className="card space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Endossar este perfil
            </h2>
            {loadingTasks ? (
              <p className="text-[11px] text-slate-400">
                Carregando suas microtarefas...
              </p>
            ) : tasksByCurrentUser.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Você ainda não criou nenhuma microtarefa. Crie uma microtarefa
                primeiro para poder endossar alguém com base nela.
              </p>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  <div>
                    <label 
                    className="block text-xs mb-1 text-slate-300"
                    htmlFor="endorse-task-select" // <-- htmlFor adicionado aqui
                    >
                        Task relacionada
                    </label>
                    <select
                        id="endorse-task-select"
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                        value={endorseTaskId}
                        onChange={(e) => setEndorseTaskId(e.target.value)}
                    >
                      <option value="">Selecione uma microtarefa...</option>
                      {tasksByCurrentUser.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Escolha a microtarefa em que essa pessoa colaborou com
                      você.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs mb-1 text-slate-300">
                      Skill endossada
                    </label>
                    <input
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                      value={endorseSkill}
                      onChange={(e) => setEndorseSkill(e.target.value)}
                      placeholder="Ex: SQL, UX, comunicação..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1 text-slate-300">
                      Mensagem
                    </label>
                    <textarea
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm min-h-[80px]"
                      value={endorseMsg}
                      onChange={(e) => setEndorseMsg(e.target.value)}
                      placeholder="Descreva brevemente como a pessoa contribuiu nessa microtarefa."
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateEndorsement}
                  disabled={
                    savingEndorsement ||
                    !endorseTaskId ||
                    !endorseSkill.trim() ||
                    !endorseMsg.trim()
                  }
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 disabled:bg-emerald-900 disabled:text-slate-500 text-slate-950 text-sm font-medium hover:bg-emerald-400"
                >
                  {savingEndorsement
                    ? "Registrando endorsement..."
                    : "Registrar endorsement"}
                </button>

                <p className="text-[11px] text-slate-500">
                  O endorsement será registrado na tabela{" "}
                  <code>endorsements</code>, vinculado à microtarefa escolhida e
                  ao perfil desta pessoa.
                </p>
              </>
            )}
          </section>
        )}

        {errorMsg && (
          <section className="card">
            <p className="text-xs text-red-400">{errorMsg}</p>
          </section>
        )}
      </main>
    </AuthGuard>
  );
}
