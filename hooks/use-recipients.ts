"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RecipientRow } from "@/lib/types";

export function useRecipients() {
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadRecipients = useCallback(async () => {
    const { data, error } = await supabase
      .from("recipients")
      .select("id,name,email,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }
    setRecipients((data ?? []) as RecipientRow[]);
  }, []);

  const createRecipient = useCallback(async (name: string, email: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if already exists
    const existing = recipients.find(
      (r) => r.email.trim().toLowerCase() === cleanEmail,
    );
    if (existing) {
      return { data: existing, error: null, isExisting: true };
    }

    const { data, error } = await supabase
      .from("recipients")
      .insert({ name: cleanName, email: cleanEmail })
      .select("id,name,email,created_at")
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? "Failed to create recipient.", isExisting: false };
    }

    await loadRecipients();
    return { data: data as RecipientRow, error: null, isExisting: false };
  }, [recipients, loadRecipients]);

  const validateNewRecipient = useCallback((name: string, emailRaw: string) => {
    if (!name.trim()) return "Recipient name is required.";
    if (!emailRaw.trim()) return "Recipient email is required.";
    const email = emailRaw.trim().toLowerCase();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) return "Please enter a valid email address.";
    return null;
  }, []);

  return {
    recipients,
    error,
    setError,
    loadRecipients,
    createRecipient,
    validateNewRecipient,
  };
}
