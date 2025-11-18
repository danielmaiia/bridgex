"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type Props = {
  children: ReactNode;
};

export function AuthGuard({ children }: Props) {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || (!user && typeof window !== "undefined")) {
    return (
      <div className="card flex justify-center items-center p-4">
        {/* Este é o ícone de spinner */}
        <svg
          className="animate-spin h-5 w-5 text-slate-300"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  // se não tiver user, mas ainda está no lado servidor, não renderiza nada
  if (!user) return null;

  return <>{children}</>;
}
