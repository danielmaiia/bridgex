import { AuthGuard } from "@/components/authGuard";
export default function RhPage() {
  return (
    <AuthGuard>
    <main className="card space-y-4">
      <h2 className="text-lg font-semibold">Painel do RH</h2>
      <p className="text-sm text-slate-300">
        Este módulo mostra a visão de RH sobre a colaboração e o desenvolvimento
        de carreira. Aqui você vai plugar os gráficos de análise de dados:
        perfis mais colaborativos, evolução de skills, conexões entre áreas e
        aderência a critérios arbitrários de desenvolvimento.
      </p>
      <p className="text-xs text-slate-400">
        Para o vídeo, você pode simular alguns cards e gráficos com dados
        fictícios, explicando que vêm do banco (Supabase) e são calculados
        a partir das microtarefas, certificados e endossos.
      </p>
    </main>
    </AuthGuard>
  );
}
