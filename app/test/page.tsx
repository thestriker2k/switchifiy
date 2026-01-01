"use client";

import { supabase } from "@/lib/supabase/client";

export default async function TestPage() {
  const { data, error } = await supabase.auth.getUser();

  return (
    <div style={{ padding: 40 }}>
      <h1>Supabase Connection Test</h1>
      <pre>{JSON.stringify({ data, error }, null, 2)}</pre>
    </div>
  );
}