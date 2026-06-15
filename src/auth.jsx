import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Senha determinística derivada do e-mail: a mesma em qualquer aparelho, e o
// usuário nunca a vê nem digita. É o que permite "entrar só com o e-mail".
// DECISÃO DE FASE DE TESTE — ver docs/adr/0002-login-email-sem-verificacao.md.
async function derivePassword(email) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tranca:v1:${email}`));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `Tr$${hex}`; // 67 chars — atende a qualquer política de senha
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // E-mail vira a identidade: entra direto, sem senha visível e sem link de
  // confirmação. 1º acesso de um e-mail novo cria a conta; acessos seguintes
  // com o mesmo e-mail reconhecem e entram. (Exige "Confirm email" desligado.)
  const entrarComEmail = async (emailRaw) => {
    const email = (emailRaw || "").trim().toLowerCase();
    const password = await derivePassword(email);
    // 1) tenta entrar (e-mail já cadastrado)
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { error: null };
    // 2) não existe ainda → cria a conta
    const { data, error: signErr } = await supabase.auth.signUp({ email, password });
    if (signErr) return { error: signErr };
    // se a sessão não vier no signUp, tenta logar
    if (!data.session) {
      const r = await supabase.auth.signInWithPassword({ email, password });
      return { error: r.error };
    }
    return { error: null };
  };

  const signOut = () => supabase.auth.signOut();

  const value = { session, user: session?.user || null, loading, entrarComEmail, signOut };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
