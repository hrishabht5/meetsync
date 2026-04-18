"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { errMsg } from "@/lib/errors";

export function ImpersonationBanner({ email }: { email?: string | null }) {
  const [exiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    try {
      await api.admin.exitImpersonation();
      window.location.href = "/admin/users";
    } catch (e: unknown) {
      alert(errMsg(e));
      setExiting(false);
    }
  };

  return (
    <div className="w-full bg-yellow-500/15 border-b border-yellow-500/30 px-6 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-yellow-300">
        <span className="text-base">⚠</span>
        <span>
          <span className="font-semibold">Admin:</span> Impersonating
          {email ? <span className="font-mono ml-1">{email}</span> : " user"}
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="text-xs px-3 py-1.5 rounded-lg ring-1 ring-yellow-500/40 text-yellow-300 hover:ring-yellow-400 hover:bg-yellow-500/10 transition-all disabled:opacity-50 flex-shrink-0"
      >
        {exiting ? "Exiting…" : "Exit →"}
      </button>
    </div>
  );
}
