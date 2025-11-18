import { AuthGuard } from "@/components/authGuard";
export default function DashboardPage() {
  return (
    <AuthGuard>
    <main className="space-y-4">
      <section className="card">
        <h2 className="text-lg font-semibold mb-2">Dashboard</h2>
        <p className="text-sm text-slate-300">
          Aqui você vai mostrar as principais métricas do BridgeX:
          microtarefas concluídas, conexões interárea, habilidades mais
          utilizadas e evolução de engajamento. Nesta versão, a tela está
          só com texto para você plugar os gráficos depois.
        </p>
      </section>
      <section className="grid md:grid-cols-3 gap-4 text-sm">
        <div className="card">
          <p className="text-xs text-slate-400 mb-1">
            Exemplo de KPI
          </p>
          <p className="text-2xl font-semibold text-emerald-400">18</p>
          <p className="text-xs text-slate-300">
            Microtarefas concluídas neste mês.
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 mb-1">
            Exemplo de KPI
          </p>
          <p className="text-2xl font-semibold text-emerald-400">7</p>
          <p className="text-xs text-slate-300">
            Conexões entre áreas diferentes.
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 mb-1">
            Exemplo de KPI
          </p>
          <p className="text-2xl font-semibold text-emerald-400">4</p>
          <p className="text-xs text-slate-300">
            Novas skills registradas pelos colaboradores.
          </p>
        </div>
      </section>
    </main>
    </AuthGuard>
  );
}
