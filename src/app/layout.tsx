
import type { Metadata } from "next";
import "./globals.css";
import { UserBadge } from "@/components/userBadge";

export const metadata: Metadata = {
  title: "BridgeX",
  description: "Networking sem politicagem"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
                BX
              </div>
              <div>
                <h1 className="font-semibold tracking-tight">BridgeX</h1>
                <p className="text-xs text-slate-400">Networking sem politicagem</p>
              </div>
            </div>
            <nav className="flex gap-3 text-sm text-slate-300">
              <a href="/" className="hover:text-emerald-400">Home</a> 
              <a href="/dashboard" className="hover:text-emerald-400">Dashboard</a>
              <a href="/tasks" className="hover:text-emerald-400">Microtarefas</a>
              <a href="/cv" className="hover:text-emerald-400">Currículo vivo</a>
              <a href="/rh" className="hover:text-emerald-400">RH</a>
              <a href="/profile" className="hover:text-emerald-400">Perfil</a>
              <a href="/explore" className="hover:text-emerald-400">Networking</a>
            </nav>
            <UserBadge />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
