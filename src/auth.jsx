import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Mensagens amigáveis (sem jargão técnico) para erros que voltam na URL do link.
function mensagemAmigavel(errorCode, errorDesc) {
  const d = (errorDesc || "").toLowerCase();
  if (d.includes("expired") || errorCode === "otp_expired")
    return "Esse link de entrada expirou. Peça um novo link aqui embaixo — é rapidinho.";
  if (d.includes("invalid") || d.includes("already"))
    return "Esse link não funcionou aqui. Isso costuma acontecer quando ele é aberto em um aparelho diferente do que pediu. Peça um novo link e abra no mesmo celular.";
  return "Não conseguimos entrar com esse link. Peça um novo aqui embaixo e abra no mesmo celular.";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    // 1) Erro vindo no hash da URL (link expirado / aberto em outro aparelho)
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const err = hash.get("error") || hash.get("error_code");
      if (err) {
        setAuthMessage(mensagemAmigavel(hash.get("error_code"), hash.get("error_description")));
        // limpa o hash para não repetir a mensagem ao recarregar
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } catch {}

    // 2) Sessão atual + assinatura de mudanças
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setAuthMessage(""); // entrou: some qualquer aviso de erro
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email) => {
    setAuthMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = () => supabase.auth.signOut();

  const value = {
    session,
    user: session?.user || null,
    loading,
    authMessage,
    clearAuthMessage: () => setAuthMessage(""),
    signInWithEmail,
    signOut,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
