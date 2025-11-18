
import Link from "next/link";
import { AuthGuard } from "@/components/authGuard";

export default function HomePage() {
  return (
    <AuthGuard>
    <main className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-semibold mb-2">
          BridgeX – Networking sem politicagem
        </h2>
        <p className="text-sm text-slate-300 mb-4">
          Protótipo da plataforma de colaboração e desenvolvimento de carreira
          para ambientes remotos e híbridos.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400"
          >
            Ir para o dashboard
          </Link>
          <Link
            href="/tasks"
            className="px-4 py-2 rounded-xl border border-slate-700 text-sm hover:border-emerald-400"
          >
            Ver microtarefas
          </Link>
          <Link
            href="/profile"
            className="px-4 py-2 rounded-xl border border-slate-700 text-sm hover:border-emerald-400"
          >
            Completar meu perfil
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h3 className="font-semibold mb-1 text-sm">Colaborador</h3>
          <p className="text-xs text-slate-300">
            Cria e participa de microtarefas, registra entregas e alimenta seu
            currículo vivo com evidências reais de competência.
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-1 text-sm">Gestor</h3>
          <p className="text-xs text-slate-300">
            Acompanha a evolução do time com base em colaborações reais, não só
            em percepção subjetiva.
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-1 text-sm">RH</h3>
          <p className="text-xs text-slate-300">
            Visualiza um mapa vivo de competências, colaboração e potencial
            de desenvolvimento de carreira.
          </p>
        </div>
      </section>
    </main>
    </AuthGuard>
  );
}
