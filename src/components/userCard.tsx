// src/components/userCard.tsx
"use client";

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

type UserCardProps = {
  user: ListedUser;
};

export function UserCard({ user }: UserCardProps) {
  const initials =
    user.full_name?.[0]?.toUpperCase() ||
    user.area?.[0]?.toUpperCase() ||
    "U";

  const topHave = user.have_skills.slice(0, 4);
  const topLearning = user.learning_skills.slice(0, 3);

  return (
    <article className="card flex flex-col gap-3 border border-slate-800 bg-slate-950/60 hover:border-emerald-500/70 transition-colors">
      {/* Cabeçalho do card */}
      <div className="flex items-start gap-3">
        <div className="relative">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="h-12 w-12 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-slate-950">
              {initials}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">
            {user.full_name}
          </h2>
          <p className="text-xs text-slate-300 truncate">
            {user.area || "Área não informada"}{" "}
            <span className="text-slate-500">•</span>{" "}
            {user.seniority || "Senioridade não informada"}
          </p>

          {user.career_goals && (
            <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
              Metas: {user.career_goals}
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
                key={`${user.id}-have-${idx}-${s.name}`}
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
        {user.learning_skills.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            Ainda não cadastrou skills em aprendizado.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {topLearning.map((s, idx) => (
              <span
                key={`${user.id}-learning-${idx}-${s.name}`}
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
          Entrou em {new Date(user.created_at).toLocaleDateString("pt-BR")}
        </p>
        <button
          type="button"
          className="px-2 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
          disabled
          title="Em breve: ver perfil público / convidar para microtarefas"
        >
          Ver perfil
        </button>
      </div>
    </article>
  );
}
