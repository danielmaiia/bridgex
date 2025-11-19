"use client";

import React, { useEffect, useState } from "react";
import { AuthGuard } from "@/components/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  skills: string | null;
  status: string | null;
  created_at: string;
  endorsements?: { id: string }[];
};

type NewTaskForm = {
  title: string;
  description: string;
  skills: string; // string final (para salvar), gerada a partir das skills selecionadas
};

type SkillOption = {
  id: string;
  name: string;
  category: string | null;
};

export default function TasksPage() {
  const { user, loading: loadingUser } = useSupabaseUser();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [nova, setNova] = useState<NewTaskForm>({
    title: "",
    description: "",
    skills: "",
  });

  const [loadingTasks, setLoadingTasks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- skills (autocomplete) ---
  const [skillSearch, setSkillSearch] = useState("");
  const [skillResults, setSkillResults] = useState<SkillOption[]>([]);
  const [skillLoading, setSkillLoading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<SkillOption[]>([]);
  const [skillTouched, setSkillTouched] = useState(false);

  async function fetchTasks() {
    setLoadingTasks(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, title, description, area, skills, status, created_at, endorsements ( id )"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar tasks:", error);
      setErrorMsg("Não foi possível carregar as microtarefas no momento.");
      setLoadingTasks(false);
      return;
    }

    setTasks(data || []);
    setLoadingTasks(false);
  }

  useEffect(() => {
    if (!user) return;
    void fetchTasks();
  }, [user]);

  // Mantém nova.skills sempre alinhado com as skills selecionadas
  useEffect(() => {
    const skillsString = selectedSkills.map((s) => s.name).join(", ");
    setNova((prev) => ({ ...prev, skills: skillsString }));
  }, [selectedSkills]);

  async function handleCreate() {
    if (!user) return;
    if (!nova.title.trim() || !nova.description.trim()) return;

    setSaving(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        creator_id: user.id,
        title: nova.title.trim(),
        description: nova.description.trim(),
        skills: nova.skills.trim() || null,
        status: "aberta",
      })
      .select(
        "id, title, description, area, skills, status, created_at, endorsements ( id )"
      )
      .single();

    if (error) {
      console.error("Erro ao criar task:", error);
      setErrorMsg("Não foi possível publicar a microtarefa. Tente novamente.");
      setSaving(false);
      return;
    }

    if (data) {
      setTasks((prev) => [data, ...prev]);
      setNova({ title: "", description: "", skills: "" });
      setSelectedSkills([]);
      setSkillSearch("");
      setSkillResults([]);
    }

    setSaving(false);
  }

  const isFormValid = nova.title.trim() && nova.description.trim();

  async function searchSkills(query: string) {
    setSkillSearch(query);
    setSkillTouched(true);

    if (!query || query.trim().length < 2) {
      setSkillResults([]);
      return;
    }

    setSkillLoading(true);
    const { data, error } = await supabase
      .from("skills")
      .select("id, name, category")
      .ilike("name", `%${query.trim()}%`)
      .order("name", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Erro ao buscar skills:", error);
      setSkillResults([]);
      setSkillLoading(false);
      return;
    }

    setSkillResults(data || []);
    setSkillLoading(false);
  }

  function handleAddSkill(skill: SkillOption) {
    const alreadySelected = selectedSkills.some((s) => s.id === skill.id);
    if (alreadySelected) {
      setSkillSearch("");
      setSkillResults([]);
      return;
    }

    setSelectedSkills((prev) => [...prev, skill]);
    setSkillSearch("");
    setSkillResults([]);
  }

  function handleRemoveSkill(id: string) {
    setSelectedSkills((prev) => prev.filter((s) => s.id !== id));
  }

  if (loadingUser) {
    return (
      <AuthGuard>
        <main className="card">
          <p className="text-sm text-slate-300">Carregando usuário...</p>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="grid md:grid-cols-[1.2fr,0.8fr] gap-6">
        <section className="card">
          <h2 className="text-lg font-semibold mb-2">Microtarefas abertas</h2>
          <p className="text-xs text-slate-400 mb-4">
            Lista de oportunidades de colaboração criadas pela comunidade. Já
            conectado na tabela <code>tasks</code> do Supabase.
          </p>

          {errorMsg && (
            <p className="text-xs text-red-400 mb-3">{errorMsg}</p>
          )}

          {loadingTasks ? (
            <div className="space-y-3">
              <div className="h-20 rounded-xl bg-slate-900/60 animate-pulse" />
              <div className="h-20 rounded-xl bg-slate-900/60 animate-pulse" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-slate-400">
              Ainda não há microtarefas abertas. Que tal criar a primeira?
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => {
                const endorsementsCount = t.endorsements?.length ?? 0;

                return (
                  <div
                    key={t.id}
                    className="border border-slate-800 rounded-xl p-3 bg-slate-900/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{t.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Status:{" "}
                          <span className="uppercase tracking-wide">
                            {t.status || "aberta"}
                          </span>
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2">
                      {t.description}
                    </p>

                    <p className="text-[11px] text-emerald-400 mt-2">
                      Skills desejadas: {t.skills || "não informado"}
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      <button className="px-3 py-1 rounded-lg bg-slate-800 text-xs hover:bg-slate-700">
                        Candidatar-se (protótipo)
                      </button>
                      <span className="text-[10px] text-slate-400">
                        Endorsements nesta task:{" "}
                        <span className="text-emerald-300 font-semibold">
                          {endorsementsCount}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold mb-2">Nova microtarefa</h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs mb-1 text-slate-300">
                Título
              </label>
              <input
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                value={nova.title}
                onChange={(e) =>
                  setNova((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Ex: Revisão de query SQL, feedback em apresentação..."
              />
            </div>

            <div>
              <label
                htmlFor="descricao"
                className="block text-xs mb-1 text-slate-300"
              >
                Descrição
              </label>
              <textarea
                id="descricao"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm min-h-[90px]"
                value={nova.description}
                onChange={(e) =>
                  setNova((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Explique o contexto, o objetivo da microtarefa e o tipo de ajuda que você espera."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-slate-300">
                Skills desejadas
              </label>

              {/* Skills selecionadas */}
              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {selectedSkills.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleRemoveSkill(s.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-[11px] text-emerald-300 hover:bg-emerald-500/20"
                    >
                      <span>{s.name}</span>
                      <span className="text-[10px] text-emerald-200">×</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Campo de busca de skills */}
              <div className="relative">
                <input
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  value={skillSearch}
                  onChange={(e) => void searchSkills(e.target.value)}
                  placeholder="Digite para buscar no catálogo de skills..."
                />

                {/* Dropdown de resultados */}
                {skillSearch && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 max-h-48 overflow-y-auto shadow-lg">
                    {skillLoading && (
                      <div className="px-3 py-2 text-[11px] text-slate-400">
                        Buscando skills...
                      </div>
                    )}

                    {!skillLoading && skillResults.length === 0 && skillTouched && (
                      <div className="px-3 py-2 text-[11px] text-slate-400">
                        Nenhuma skill encontrada. Fale com o RH para incluir no
                        catálogo.
                      </div>
                    )}

                    {!skillLoading &&
                      skillResults.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handleAddSkill(skill)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 flex flex-col"
                        >
                          <span className="text-slate-100">{skill.name}</span>
                          {skill.category && (
                            <span className="text-[10px] text-slate-400">
                              {skill.category}
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                As skills usadas aqui vêm do mesmo catálogo da página de perfil
                e CV. Elas são salvas como texto na coluna{" "}
                <code>tasks.skills</code>.
              </p>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!isFormValid || saving}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 disabled:bg-emerald-900 disabled:text-slate-500 text-slate-950 text-sm font-medium hover:bg-emerald-400"
          >
            {saving ? "Publicando..." : "Publicar microtarefa"}
          </button>

          <p className="text-[11px] text-slate-400 mt-2">
            As microtarefas são salvas na tabela <code>tasks</code> e ligadas ao
            usuário autenticado via <code>creator_id</code>. Os endorsements
            ficam relacionados pela coluna <code>task_id</code>.
          </p>
        </section>
      </main>
    </AuthGuard>
  );
}
