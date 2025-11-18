
"use client";
import { AuthGuard } from "@/components/authGuard";
import { useState } from "react";

type Task = {
  id: string;
  titulo: string;
  descricao: string;
  skills: string;
};

const MOCK_TASKS: Task[] = [
  {
    id: "1",
    titulo: "Revisão de query SQL para dashboard financeiro",
    descricao: "Preciso de ajuda para revisar uma query e otimizar performance.",
    skills: "sql, bi, performance"
  },
  {
    id: "2",
    titulo: "Feedback de UX em tela de cadastro",
    descricao: "Preciso de um olhar de UX/UI para melhorar essa tela.",
    skills: "ux, ui, produto"
  }
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [nova, setNova] = useState({
    titulo: "",
    descricao: "",
    skills: ""
  });

  const handleCreate = () => {
    if (!nova.titulo || !nova.descricao) return;
    setTasks((prev) => [
      ...prev,
      { id: String(prev.length + 1), ...nova }
    ]);
    setNova({ titulo: "", descricao: "", skills: "" });
  };

  return (
    <AuthGuard>
    <main className="grid md:grid-cols-[1.2fr,0.8fr] gap-6">
      <section className="card">
        <h2 className="text-lg font-semibold mb-2">Microtarefas abertas</h2>
        <p className="text-xs text-slate-400 mb-4">
          Lista de oportunidades de colaboração. Nesta versão, está mockado em
          memória para facilitar a demo.
        </p>
        <div className="space-y-3">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="border border-slate-800 rounded-xl p-3 bg-slate-900/60"
            >
              <h3 className="text-sm font-semibold">{t.titulo}</h3>
              <p className="text-xs text-slate-300 mt-1">{t.descricao}</p>
              <p className="text-[11px] text-emerald-400 mt-2">
                Skills: {t.skills || "não informado"}
              </p>
              <button className="mt-2 px-3 py-1 rounded-lg bg-slate-800 text-xs hover:bg-slate-700">
                Candidatar-se (protótipo)
              </button>
            </div>
          ))}
        </div>
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
              value={nova.titulo}
              onChange={(e) =>
                setNova((p) => ({ ...p, titulo: e.target.value }))
              }
              placeholder="Ex: Revisão de código, feedback em apresentação..."
            />
          </div>
          <div>
            <label 
              htmlFor="descricao"
              className="block text-xs mb-1 text-slate-300">
              Descrição
            </label>
            <textarea
              id="descricao"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm min-h-[90px]"
              value={nova.descricao}
              onChange={(e) =>
                setNova((p) => ({ ...p, descricao: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-slate-300">
              Skills desejadas
            </label>
            <input
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              value={nova.skills}
              onChange={(e) =>
                setNova((p) => ({ ...p, skills: e.target.value }))
              }
              placeholder="SQL, UX, comunicação..."
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400"
        >
          Publicar microtarefa (mock)
        </button>
        <p className="text-[11px] text-slate-400 mt-2">
          No MVP real, este formulário grava na tabela <code>tasks</code> do
          Supabase.
        </p>
      </section>
    </main>
    </AuthGuard>
  );
}
