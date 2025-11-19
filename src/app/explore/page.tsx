"use client";

import React, { useEffect, useState } from "react";
import { AuthGuard } from "@/components/authGuard";
import { useRouter } from "next/navigation";

type ListedSkill = {
  name: string;
  category: string | null;
  level: string | null;
};

type ListedUser = {
  id: string;
  full_name: string;
  area: string | null;
  seniority: string | null;
  career_goals: string | null;
  avatar_url: string | null;
  have_skills: ListedSkill[];
  learning_skills: ListedSkill[];
  created_at: string;
};

type ApiResponse = {
  users: ListedUser[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export default function ExplorePage() {
  const router = useRouter();

  const [users, setUsers] = useState<ListedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Carrega a lista de perfis
  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch("/api/users/list?limit=50&offset=0");
        if (!res.ok) {
          console.error("Falha ao buscar usuários:", res.statusText);
          setErrorMsg("Não foi possível carregar a lista de pessoas.");
          setLoading(false);
          return;
        }

        const json: ApiResponse = await res.json();
        setUsers(json.users || []);
        setInitialLoaded(true);
      } catch (err) {
        console.error("Erro em /explore:", err);
        setErrorMsg("Erro inesperado ao carregar pessoas.");
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, []);

  // Filtro simples em memória
  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers =
    normalizedSearch.length === 0
      ? users
      : users.filter((u) => {
          const base =
            `${u.full_name ?? ""} ${u.area ?? ""} ${u.seniority ?? ""} ${
              u.career_goals ?? ""
            }`.toLowerCase();

          const haveSkillsText = u.have_skills
            .map((s) => s.name)
            .join(" ")
            .toLowerCase();
          const learningSkillsText = u.learning_skills
            .map((s) => s.name)
            .join(" ")
            .toLowerCase();

          const haystack =
            base + " " + haveSkillsText + " " + learningSkillsText;

          return haystack.includes(normalizedSearch);
        });

  return (
    <AuthGuard>
      <main className="space-y-4 max-w-5xl mx-auto">
        {/* Cabeçalho da página */}
        <section className="card space-y-2">
          <h1 className="text-lg font-semibold">Explorar pessoas</h1>
          <p className="text-sm text-slate-300">
            Navegue pelos perfis da plataforma, descubra talentos, encontre
            pessoas com as skills que você precisa e veja quem está aprendendo
            o mesmo que você.
          </p>

          <div className="mt-3">
            <label
              htmlFor="explore-search"
              className="block text-xs mb-1 text-slate-300"
            >
              Buscar por nome, área, skill ou meta
            </label>
            <input
              id="explore-search"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Ex: dados, Kubernetes, liderança, produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 mt-2">{errorMsg}</p>
          )}
        </section>

        {/* Lista de cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {loading && "Carregando pessoas..."}
              {!loading && initialLoaded && filteredUsers.length === 0 && (
                <>Nenhuma pessoa encontrada com esse filtro.</>
              )}
              {!loading &&
                filteredUsers.length > 0 &&
                `Exibindo ${filteredUsers.length} perfil${
                  filteredUsers.length > 1 ? "s" : ""
                }`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const initials =
                u.full_name?.[0]?.toUpperCase() ||
                u.area?.[0]?.toUpperCase() ||
                "U";

              const topHave = u.have_skills.slice(0, 4);
              const topLearning = u.learning_skills.slice(0, 3);

              return (
                <article
                  key={u.id}
                  className="card flex flex-col gap-3 border border-slate-800 bg-slate-950/60 hover:border-emerald-500/70 transition-colors"
                >
                  {/* Cabeçalho do card */}
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.full_name}
                          className="h-12 w-12 rounded-full object-cover border border-slate-700"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://via.placeholder.com/48x48.png?text=?"; // fallback simples
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-slate-950">
                          {initials}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold truncate">
                        {u.full_name}
                      </h2>
                      <p className="text-xs text-slate-300 truncate">
                        {u.area || "Área não informada"}{" "}
                        <span className="text-slate-500">•</span>{" "}
                        {u.seniority || "Senioridade não informada"}
                      </p>

                      {u.career_goals && (
                        <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                          Metas: {u.career_goals}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Skills que a pessoa tem */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-slate-300">
                      Skills que possui
                    </p>
                    {topHave.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        Nenhuma skill cadastrada ainda.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {topHave.map((s, idx) => (
                          <span
                            key={`${u.id}-have-${idx}-${s.name}`}
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

                  {/* Skills que está aprendendo */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-slate-300">
                      Skills que está aprendendo
                    </p>
                    {topLearning.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        Ainda não cadastrou skills em aprendizado.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {topLearning.map((s, idx) => (
                          <span
                            key={`${u.id}-learning-${idx}-${s.name}`}
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

                  {/* Rodapé do card */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 mt-1">
                    <p className="text-[10px] text-slate-500">
                      Entrou em{" "}
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <button
                      type="button"
                      className="px-2 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
                      onClick={() => router.push(`/profile/${u.id}`)}
                      title="Ver perfil público"
                    >
                      Ver perfil
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
