import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Falha clara no dev se faltar configuração, em vez de erro obscuro depois.
  console.error("Supabase: faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env).");
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Magic link no fluxo "implicit": o link traz o token e funciona ao abrir
    // no mesmo navegador. detectSessionInUrl lê o token quando o link abre.
    detectSessionInUrl: true,
    flowType: "implicit",
  },
});
