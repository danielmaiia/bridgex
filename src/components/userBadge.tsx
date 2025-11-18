"use client";

import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export function UserBadge() {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return <span className="text-xs text-slate-400">...</span>;
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="text-xs text-slate-300 hover:text-emerald-400"
      >
        Entrar
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-300">
      <span>{user.email}</span>
      <button
        onClick={handleLogout}
        className="px-2 py-1 rounded-lg border border-slate-600 hover:border-emerald-400"
      >
        Sair
      </button>
    </div>
  );
}
