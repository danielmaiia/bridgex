"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        // Cria usuário
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });

        if (error) throw error;

        // Opcional: já cria o registro em profiles
        const user = data.user;
        if (user) {
          await supabase.from("profiles").insert({
            id: user.id,
            full_name: fullName || user.email,
          });
        }

        alert("Conta criada com sucesso. Agora faça login.");
        setMode("login");
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        const user = data.user;
        if (user) {
          // garante que existe um profile
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: user.id,
                full_name: user.user_metadata?.full_name || user.email,
              },
              { onConflict: "id" }
            );

          if (profileError) {
            console.warn("Erro ao criar/atualizar profile:", profileError.message);
          }
        }

        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto card space-y-4">
      <h2 className="text-lg font-semibold text-center">
        {mode === "login" ? "Entrar" : "Criar conta"}
      </h2>

      <div className="flex gap-2 text-xs justify-center mb-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`px-3 py-1 rounded-full border ${
            mode === "login"
              ? "border-emerald-400 text-emerald-400"
              : "border-slate-700 text-slate-400"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`px-3 py-1 rounded-full border ${
            mode === "signup"
              ? "border-emerald-400 text-emerald-400"
              : "border-slate-700 text-slate-400"
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        {mode === "signup" && (
          <div>
            <label
              htmlFor="fullName"
              className="block text-xs mb-1 text-slate-300"
            >
              Nome completo
            </label>
            <input
              id="fullName"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-xs mb-1 text-slate-300"
          >
            E-mail corporativo
          </label>
          <input
            id="email"
            type="email"
            required
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs mb-1 text-slate-300"
          >
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading
            ? mode === "login"
              ? "Entrando..."
              : "Criando conta..."
            : mode === "login"
            ? "Entrar"
            : "Criar conta"}
        </button>
      </form>
    </main>
  );
}
