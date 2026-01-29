"use client";

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { SwitchRow, SwitchRecipientRow } from "@/lib/types";
import { getBrowserTimeZone } from "@/lib/utils";

export function useSwitches() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const [activeSwitches, setActiveSwitches] = useState<SwitchRow[]>([]);
  const [inactiveSwitches, setInactiveSwitches] = useState<SwitchRow[]>([]);
  const [completedSwitches, setCompletedSwitches] = useState<SwitchRow[]>([]);

  const [switchRecipients, setSwitchRecipients] = useState<SwitchRecipientRow[]>([]);

  const [lastCheckInAt, setLastCheckInAt] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const browserTZ = getBrowserTimeZone("UTC");
  const didCheckInRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const markCheckInNow = useCallback(async () => {
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("switches")
      .update({ last_checkin_at: nowIso })
      .eq("status", "active");

    if (error) {
      setError(error.message);
      return;
    }

    setLastCheckInAt(nowIso);
  }, []);

  const refreshOverview = useCallback(async () => {
    setError(null);

    const [
      { count: active, error: activeErr },
      { count: inactive, error: inErr },
      { count: completed, error: compErr },
    ] = await Promise.all([
      supabase
        .from("switches")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("switches")
        .select("*", { count: "exact", head: true })
        .eq("status", "paused"),
      supabase
        .from("switches")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
    ]);

    if (activeErr) return setError(activeErr.message);
    if (inErr) return setError(inErr.message);
    if (compErr) return setError(compErr.message);

    setActiveCount(active ?? 0);
    setInactiveCount(inactive ?? 0);
    setCompletedCount(completed ?? 0);

    const [
      { data: actData, error: actListErr },
      { data: inData, error: inListErr },
      { data: compData, error: compListErr },
    ] = await Promise.all([
      supabase
        .from("switches")
        .select("id,name,status,interval_days,grace_days,created_at,last_checkin_at,timezone")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("switches")
        .select("id,name,status,interval_days,grace_days,created_at,last_checkin_at,timezone")
        .eq("status", "paused")
        .order("created_at", { ascending: false }),
      supabase
        .from("switches")
        .select("id,name,status,interval_days,grace_days,created_at,last_checkin_at,timezone")
        .eq("status", "completed")
        .order("created_at", { ascending: false }),
    ]);

    if (actListErr) return setError(actListErr.message);
    if (inListErr) return setError(inListErr.message);
    if (compListErr) return setError(compListErr.message);

    setActiveSwitches((actData ?? []) as SwitchRow[]);
    setInactiveSwitches((inData ?? []) as SwitchRow[]);
    setCompletedSwitches((compData ?? []) as SwitchRow[]);

    // Compute latest check-in across ACTIVE switches only
    const all = (actData ?? []) as SwitchRow[];
    let maxIso: string | null = null;

    for (const s of all) {
      const iso = s.last_checkin_at;
      if (!iso) continue;
      const t = new Date(iso).getTime();
      if (Number.isNaN(t)) continue;

      if (!maxIso) maxIso = iso;
      else {
        const cur = new Date(maxIso).getTime();
        if (t > cur) maxIso = iso;
      }
    }

    setLastCheckInAt((prev) => prev ?? maxIso);
  }, []);

  const loadSwitchRecipients = useCallback(async () => {
    const { data, error } = await supabase
      .from("switch_recipients")
      .select("*");
    if (error) return setError(error.message);
    setSwitchRecipients((data ?? []) as SwitchRecipientRow[]);
  }, []);

  const toggleSwitchStatus = useCallback(async (switchId: string, makeActive: boolean) => {
    setError(null);
    setTogglingId(switchId);

    if (makeActive) {
      const nowIso = new Date().toISOString();
      const checkInIso = lastCheckInAt ?? nowIso;

      const { error } = await supabase
        .from("switches")
        .update({
          status: "active",
          last_checkin_at: checkInIso,
          timezone: browserTZ,
        })
        .eq("id", switchId);

      if (error) {
        setTogglingId(null);
        setError(error.message);
        return false;
      }
    } else {
      const { error } = await supabase
        .from("switches")
        .update({ status: "paused" })
        .eq("id", switchId);

      if (error) {
        setTogglingId(null);
        setError(error.message);
        return false;
      }
    }

    await refreshOverview();
    setTogglingId(null);
    return true;
  }, [browserTZ, lastCheckInAt, refreshOverview]);

  const initialize = useCallback(async () => {
    if (!didCheckInRef.current) {
      didCheckInRef.current = true;
      await markCheckInNow();
    }

    await Promise.all([refreshOverview(), loadSwitchRecipients()]);
    setLoading(false);
  }, [markCheckInNow, refreshOverview, loadSwitchRecipients]);

  const getNextDefaultSwitchName = useCallback(() => {
    const base = "Default Switch Name";
    const all = [...activeSwitches, ...inactiveSwitches, ...completedSwitches];

    let maxN = 0;
    for (const s of all) {
      const name = (s.name ?? "").trim();
      if (!name) continue;

      if (name === base) {
        maxN = Math.max(maxN, 1);
        continue;
      }

      const m = name.match(new RegExp(`^${base}\\s+(\\d+)$`));
      if (m) {
        const n = Number(m[1]);
        if (!Number.isNaN(n)) maxN = Math.max(maxN, n);
      }
    }

    if (maxN === 0) return base;
    return `${base} ${maxN + 1}`;
  }, [activeSwitches, inactiveSwitches, completedSwitches]);

  return {
    // State
    loading,
    error,
    setError,
    clearError,
    activeCount,
    inactiveCount,
    completedCount,
    activeSwitches,
    inactiveSwitches,
    completedSwitches,
    switchRecipients,
    lastCheckInAt,
    togglingId,
    browserTZ,

    // Actions
    initialize,
    refreshOverview,
    loadSwitchRecipients,
    toggleSwitchStatus,
    getNextDefaultSwitchName,
  };
}
