/* app/hooks/useAgentBalances.ts */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Safe numeric parse for strings like "12,345.67" or numbers */
function toNum(v: any): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Pick credit & commission from flexible balances payloads */
function pickBalances(shape: any): { credit: number; commission: number } {
  const src = shape?.balances || shape?.data || shape || {};

  // common keys seen across your responses
  const credit = toNum(
    src.rechargeBalance ??
      src.creditBalance ??
      src.walletBalance ??
      src.balance ??
      src.ledgerBalance ??
      src.currentBalance
  );
  const commission = toNum(
    src.commissionBalance ?? src.commission ?? src.totalCommission
  );

  return { credit, commission };
}

export function useAgentBalances(pollMs = 0) {
  const [creditBalance, setCredit] = useState<number>(0);
  const [commissionBalance, setCommission] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setErr] = useState<string | null>(null);
  const polling = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setErr(null);
      setLoading(true);
      const res = await fetch("/api/v1/agent/balances", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }

      const { credit, commission } = pickBalances(json);
      setCredit(Math.max(credit, 0));
      setCommission(Math.max(commission, 0));
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  }, []);

  // initial + optional polling
  useEffect(() => {
    refresh();
    if (pollMs && pollMs > 0) {
      polling.current = setInterval(() => refresh(), pollMs);
      return () => {
        if (polling.current) clearInterval(polling.current);
      };
    }
  }, [pollMs, refresh]);

  // refetch on window focus / tab visible
  useEffect(() => {
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return useMemo(
    () => ({
      creditBalance,
      commissionBalance,
      loading,
      error,
      refresh,
    }),
    [creditBalance, commissionBalance, loading, error, refresh]
  );
}
