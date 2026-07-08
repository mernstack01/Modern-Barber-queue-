"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getToken, onAuthExpired } from "@/lib/api";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
    return onAuthExpired(() => {
      setReady(false);
      router.replace("/login");
    });
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div>
          <p className="text-lg font-semibold">Sessiya tekshirilmoqda</p>
          <p className="mt-1 text-sm text-muted-foreground">Agar kirish muddati tugagan bo'lsa, login sahifasiga qaytasiz.</p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
