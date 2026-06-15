import { useState, useMemo, useEffect, createContext, useContext } from "react";
import { useAuth } from "./src/auth.jsx";
import * as api from "./src/api.js";

/* ════════════════ Persistência (localStorage em produção, memória no preview) ════════════════ */
const memStore = {};
const persist = {
  get(k) { try { return window.localStorage.getItem(k); } catch { return memStore[k] ?? null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch { memStore[k] = v; } },
};

/* ════════════════ Feltros do grupo (identidade do grupo — vale em todos os temas) ════════════════ */
const FELTROS = {
  verde:    { nome: "Feltro verde",   cor: "#1E4D38", escuro: "#15382A" },
  vinho:    { nome: "Vinho clássico", cor: "#5B2230", escuro: "#421722" },
  petroleo: { nome: "Azul petróleo",  cor: "#1A4750", escuro: "#12333A" },
  grafite:  { nome: "Grafite",        cor: "#33322E", escuro: "#242320" },
};

/* ════════════════ Temas de layout ════════════════ */
const THEMES = {
  sobrio: {
    id: "sobrio", nome: "Sóbrio", descricao: "Limpo e elegante",
    frameBg: "#E9E7E0", pageBg: "#F7F6F2", pagePattern: "none",
    pageText: "#211F1A", pageSub: "#6E6A60",
    card: "#FFFFFF", chipBg: "#FDFBF5", inputBg: "#FFFFFF",
    tinta: "#211F1A", suave: "#6E6A60", linha: "#E6E2D8",
    accent: "#B08D3E", accentClaro: "#D9BC7A",
    ok: "#2E7D52", danger: "#A4382E",
    btnPrimaryBg: "#211F1A", btnPrimaryColor: "#FFFFFF",
    radius: 20, radiusBtn: 16,
    fontDisplay: "'Marcellus', serif", fontBody: "'Albert Sans', system-ui, sans-serif",
    displayWeight: 400,
    toastBg: "#211F1A", toastColor: "#FFFFFF",
    entry: "anim-fade", chip: false, paleta: ["#211F1A", "#B08D3E", "#F7F6F2"],
  },
  divertido: {
    id: "divertido", nome: "Divertido", descricao: "Vivo e colorido",
    frameBg: "#FBEED9", pageBg: "#FFF8EE",
    pagePattern:
      "radial-gradient(circle at 12% 8%, rgba(255,177,61,0.16) 0 110px, transparent 111px)," +
      "radial-gradient(circle at 88% 30%, rgba(62,123,250,0.10) 0 130px, transparent 131px)," +
      "radial-gradient(circle at 18% 86%, rgba(255,107,94,0.10) 0 120px, transparent 121px)," +
      "radial-gradient(rgba(62,123,250,0.07) 2px, transparent 2.5px)",
    pagePatternSize: "auto, auto, auto, 26px 26px",
    pageText: "#2B2440", pageSub: "#6B6480",
    card: "#FFFFFF", chipBg: "#FFF3E4", inputBg: "#FFFFFF",
    tinta: "#2B2440", suave: "#6B6480", linha: "#F0E0C8",
    accent: "#FF6B5E", accentClaro: "#FFB13D",
    ok: "#13A06B", danger: "#E5484D",
    btnPrimaryBg: "#3E7BFA", btnPrimaryColor: "#FFFFFF",
    radius: 26, radiusBtn: 999,
    fontDisplay: "'Baloo 2', system-ui, sans-serif", fontBody: "'Nunito', system-ui, sans-serif",
    displayWeight: 700,
    toastBg: "#3E7BFA", toastColor: "#FFFFFF",
    entry: "anim-slide", chip: false, paleta: ["#FF6B5E", "#FFB13D", "#3E7BFA"],
  },
  tranca: {
    id: "tranca", nome: "Mesa de Tranca", descricao: "Feltro, madeira e cartas",
    frameBg: "#0F2A1E",
    pageBg: "#1B4632",
    pageText: "#F2E9D8", pageSub: "rgba(242,233,216,0.72)",
    card: "#FBF7EC", chipBg: "#F4EDDC", inputBg: "#FFFDF6",
    tinta: "#2A2018", suave: "#7A6E5C", linha: "#E4D9C2",
    accent: "#C9A14E", accentClaro: "#E4C77E",
    ok: "#2E7D52", danger: "#A4382E",
    btnPrimaryBg: "#B3322B", btnPrimaryColor: "#FFF8EC",
    radius: 18, radiusBtn: 999,
    fontDisplay: "'Marcellus', serif", fontBody: "'Albert Sans', system-ui, sans-serif",
    displayWeight: 400,
    toastBg: "#C9A14E", toastColor: "#2A2018",
    entry: "anim-deal", chip: true, paleta: ["#1B4632", "#C9A14E", "#B3322B"],
  },
};
THEMES.tranca.pagePattern =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Ctext x='18' y='40' font-size='26' fill='%23FFFFFF' fill-opacity='0.05'%3E%E2%99%A0%3C/text%3E%3Ctext x='72' y='96' font-size='26' fill='%23FFFFFF' fill-opacity='0.05'%3E%E2%99%A6%3C/text%3E%3C/svg%3E\")";
THEMES.tranca.pagePatternSize = "120px 120px";

const ThemeCtx = createContext(THEMES.sobrio);
const useTheme = () => useContext(ThemeCtx);
const fmt = (n) => n.toLocaleString("pt-BR");

/* ════════════════ Primitivas (consomem o tema) ════════════════ */
function Avatar({ p, size = 44, ring }) {
  const th = useTheme();
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: "50%", flex: "none",
      background: th.chipBg, color: th.suave, border: `1.5px solid ${ring || th.linha}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.max(16, size * 0.36), fontWeight: 700, letterSpacing: "0.02em",
    }}>{p.apelido.slice(0, 2).toUpperCase()}</div>
  );
}
function Btn({ children, onClick, kind = "primary", disabled, style }) {
  const th = useTheme();
  const kinds = {
    primary: { background: th.btnPrimaryBg, color: th.btnPrimaryColor },
    ok:      { background: th.ok, color: "#FFF" },
    ghost:   { background: th.card, color: th.tinta, border: `1.5px solid ${th.linha}` },
    danger:  { background: th.card, color: th.danger, border: `1.5px solid ${th.linha}` },
  };
  const isChip = th.chip && (kind === "primary" || kind === "ok");
  return (
    <button className={`press ${isChip ? "ficha" : ""}`} disabled={disabled} onClick={onClick} style={{
      minHeight: 60, width: "100%", borderRadius: th.radiusBtn, fontSize: 19, fontWeight: 700,
      border: "none", cursor: disabled ? "default" : "pointer", padding: "0 20px",
      fontFamily: "inherit", opacity: disabled ? 0.45 : 1, position: "relative",
      ...kinds[kind], ...style,
    }}>{children}</button>
  );
}
function Header({ title, onBack, right }) {
  const th = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 4px 14px" }}>
      {onBack && (
        <button onClick={onBack} aria-label="Voltar" className="press" style={{
          width: 56, height: 56, borderRadius: 14, border: `1.5px solid ${th.linha}`,
          background: th.card, fontSize: 22, cursor: "pointer", color: th.tinta, flex: "none" }}>←</button>
      )}
      <h1 style={{ fontFamily: th.fontDisplay, fontWeight: th.displayWeight, fontSize: 27,
        margin: 0, flex: 1, lineHeight: 1.15, color: th.pageText }}>{title}</h1>
      {right}
    </div>
  );
}
function Card({ children, onClick, style, pad = 20 }) {
  const th = useTheme();
  return (
    <div onClick={onClick} className={onClick ? "press hoverable" : ""} style={{
      background: th.card, border: `1.5px solid ${th.linha}`, borderRadius: th.radius,
      padding: pad, cursor: onClick ? "pointer" : "default", color: th.tinta, ...style,
    }}>{children}</div>
  );
}
function Toast({ msg }) {
  const th = useTheme();
  if (!msg) return null;
  return (
    <div className="toast" style={{
      position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: th.toastBg, color: th.toastColor, padding: "14px 22px", borderRadius: 14,
      fontSize: 17, fontWeight: 700, whiteSpace: "nowrap", zIndex: 60 }}>{msg}</div>
  );
}
function Confirm({ open, titulo, texto, acao, onYes, onNo }) {
  const th = useTheme();
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,12,8,0.55)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: th.card, borderRadius: th.radius, padding: 24, width: "100%",
        maxWidth: 340, color: th.tinta }}>
        <p style={{ fontSize: 21, fontWeight: 800, margin: "0 0 8px" }}>{titulo}</p>
        <p style={{ fontSize: 18, color: th.suave, margin: "0 0 20px", lineHeight: 1.45 }}>{texto}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn kind="danger" onClick={onYes}>{acao}</Btn>
          <Btn kind="ghost" onClick={onNo}>Deixa como está</Btn>
        </div>
      </div>
    </div>
  );
}
function SegBtn({ on, onClick, children, style }) {
  const th = useTheme();
  return (
    <button onClick={onClick} className="press" style={{
      flex: 1, minHeight: 56, borderRadius: th.radiusBtn === 999 ? 999 : 14, fontSize: 18,
      fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      border: `2px solid ${on ? th.btnPrimaryBg : th.linha}`,
      background: on ? th.btnPrimaryBg : th.card, color: on ? th.btnPrimaryColor : th.tinta,
      ...style }}>{children}</button>
  );
}

/* ════════════════ App ════════════════ */
export default function App() {
  const [temaId, setTemaIdRaw] = useState(() => persist.get("tranca.tema") || "sobrio");
  const setTemaId = (id) => { setTemaIdRaw(id); persist.set("tranca.tema", id); };
  const th = THEMES[temaId];

  const [feltro, setFeltroRaw] = useState(() => persist.get("tranca.feltro") || "verde");
  const setFeltro = (f) => { setFeltroRaw(f); persist.set("tranca.feltro", f); };
  const fel = FELTROS[feltro];

  const { user, session, signOut } = useAuth();
  const [players, setPlayers] = useState([]);
  const [pendentes, setPendentes] = useState(() => {
    try { return JSON.parse(persist.get("tranca.pendentes") || "[]"); }
    catch { return []; }
  });
  const [games, setGames] = useState([]);
  const [momentos, setMomentos] = useState([]);
  const [champ, setChamp] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [route, setRoute] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("join") === "TRCA") return { name: "registro" };
    } catch {}
    return { name: "home" };
  });
  const [toast, setToast] = useState("");

  const reloadPlayers = async () => {
    try { setPlayers(await api.fetchJogadores()); } catch {}
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => { persist.set("tranca.pendentes", JSON.stringify(pendentes)); }, [pendentes]);
  // Carga inicial do Supabase (leitura pública — não exige login)
  useEffect(() => {
    let alive = true;
    api.loadAll()
      .then((d) => {
        if (!alive) return;
        setPlayers(d.players); setGames(d.games);
        setMomentos(d.momentos); setChamp(d.champ);
      })
      .catch(() => setToast("Não foi possível carregar os dados"))
      .finally(() => { if (alive) setLoadingData(false); });
    return () => { alive = false; };
  }, []);
  // Ao entrar/sair, atualiza a lista de jogadores (papel/identidade)
  useEffect(() => { if (user) reloadPlayers(); }, [user?.id]);

  const byId = (id) => players.find((p) => p.id === id) || pendentes.find((p) => p.id === id) || { apelido: "?" };
  const nomes = (ids) => ids.map((i) => byId(i).apelido).join(" & ");
  const go = (name, params = {}) => setRoute({ name, ...params });
  const liveGame = games.find((g) => g.status === "live" && !g.matchId);

  const currentPlayer = user ? players.find((p) => p.auth_user_id === user.id) || null : null;
  const currentUserId = currentPlayer?.id || null;
  const myPapel = currentPlayer?.papel || "convidado";
  const isHost = myPapel === "anfitriao";
  const isAdmin = myPapel === "administrador" || isHost;
  // Logado mas ainda sem jogador vinculado → precisa escolher "Quem é você?"
  const needsLink = !!user && !loadingData && !currentPlayer;
  // Bloqueia escrita para quem não entrou, com convite amigável (sem erro técnico)
  const guard = () => {
    if (!session) { setToast("Entre para registrar — é rapidinho"); go("login"); return false; }
    return true;
  };
  const TONS = ["#1E4D38", "#5B2230", "#1A4750", "#33322E"];
  const NAIPES = ["♠", "♥", "♦", "♣"];

  const ranking = useMemo(() => {
    const ind = {}, dup = {};
    players.forEach((p) => (ind[p.id] = { v: 0, d: 0, j: 0 }));
    games.filter((g) => g.status === "done").forEach((g) => {
      g.teams.forEach((t, ti) => {
        const won = g.winner === ti;
        const key = [...t.players].sort().join("+");
        dup[key] = dup[key] || { players: t.players, v: 0, d: 0 };
        won ? dup[key].v++ : dup[key].d++;
        t.players.forEach((pid) => {
          if (!ind[pid]) ind[pid] = { v: 0, d: 0, j: 0 };
          ind[pid].j++; won ? ind[pid].v++ : ind[pid].d++;
        });
      });
    });
    const indArr = players.map((p) => ({ p, ...ind[p.id] }))
      .map((r) => ({ ...r, ap: r.j ? Math.round((100 * r.v) / r.j) : 0 }))
      .sort((a, b) => b.v - a.v || b.ap - a.ap);
    const dupArr = Object.values(dup)
      .map((d) => ({ ...d, j: d.v + d.d, ap: Math.round((100 * d.v) / (d.v + d.d)) }))
      .sort((a, b) => b.v - a.v || b.ap - a.ap);
    return { indArr, dupArr };
  }, [games, players]);

  const today = () => new Date().toISOString().slice(0, 10);

  const startGame = async (teamA, teamB, meta, matchId = null, campeonatoId = null) => {
    if (!guard()) return;
    const draft = { date: today(), meta, matchId, campeonatoId,
      teams: [{ players: teamA, rounds: [] }, { players: teamB, rounds: [] }] };
    try {
      const g = await api.insertLive(draft);
      setGames((gs) => [...gs, g]);
      go("game", { gameId: g.id });
    } catch { setToast("Não foi possível iniciar a partida"); }
  };
  const addRound = async (gameId, a, b) => {
    const g = games.find((x) => x.id === gameId);
    if (!g) return;
    const teams = g.teams.map((t, i) => {
      const rounds = [...t.rounds, i === 0 ? a : b];
      return { ...t, rounds, total: rounds.reduce((s, n) => s + n, 0) };
    });
    const [ta, tb] = [teams[0].total, teams[1].total];
    let status = g.status, winner = g.winner;
    if ((ta >= g.meta || tb >= g.meta) && ta !== tb) { status = "done"; winner = ta > tb ? 0 : 1; }
    const ng = { ...g, teams, status, winner };
    setGames((gs) => gs.map((x) => (x.id === gameId ? ng : x)));
    try {
      if (status === "done") await api.commitPartida(ng);
      else await api.updateLiveRounds(gameId, teams[0].rounds, teams[1].rounds);
    } catch { setToast("Falha ao salvar a rodada — verifique a conexão"); }
  };
  const undoRound = async (gameId) => {
    const g = games.find((x) => x.id === gameId);
    if (!g) return;
    const teams = g.teams.map((t) => {
      const rounds = t.rounds.slice(0, -1);
      return { ...t, rounds, total: rounds.reduce((s, n) => s + n, 0) };
    });
    const ng = { ...g, teams, status: "live", winner: null };
    setGames((gs) => gs.map((x) => (x.id === gameId ? ng : x)));
    try { await api.updateLiveRounds(gameId, teams[0].rounds, teams[1].rounds); }
    catch { setToast("Falha ao salvar — verifique a conexão"); }
  };

  const sortearDuplas = () => {
    const ids = players.slice(0, 8).map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return [ids.slice(0, 2), ids.slice(2, 4), ids.slice(4, 6), ids.slice(6, 8)];
  };
  const criarCampeonato = async (duplas, meta) => {
    if (!guard()) return;
    const matches = [
      { id: "semi1", fase: "Semifinal 1", a: 0, b: 1, gameId: null, winner: null },
      { id: "semi2", fase: "Semifinal 2", a: 2, b: 3, gameId: null, winner: null },
      { id: "final", fase: "Grande final", a: null, b: null, gameId: null, winner: null },
    ];
    try {
      const row = await api.insertCampeonato({ data: today(), meta, status: "live", duplas, matches });
      setChamp({ id: row.id, data: row.data, meta: row.meta, status: row.status,
        duplas: row.duplas, matches: row.matches });
      go("champ");
    } catch { setToast("Não foi possível criar o campeonato"); }
  };
  const onGameFinished = async (g) => {
    if (!g.matchId || !champ) return;
    let updated = null;
    setChamp((c) => {
      const matches = c.matches.map((m) => {
        if (m.id !== g.matchId) return m;
        return { ...m, gameId: g.id, winner: g.winner === 0 ? m.a : m.b };
      });
      const s1 = matches[0].winner, s2 = matches[1].winner;
      if (s1 != null && s2 != null && matches[2].a == null)
        matches[2] = { ...matches[2], a: s1, b: s2 };
      updated = { ...c, matches, status: matches[2].winner != null ? "done" : "live" };
      return updated;
    });
    try { if (updated) await api.updateCampeonato(updated.id, { matches: updated.matches, status: updated.status }); }
    catch {}
  };
  const share = (texto) => {
    if (navigator.share) navigator.share({ text: texto }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(texto).catch(() => {});
    setToast("Resultado copiado ✓");
  };
  const deleteGame = async (id) => {
    try { await api.deletePartida(id); setGames((gs) => gs.filter((g) => g.id !== id)); }
    catch { setToast("Sem permissão para apagar (só o anfitrião)"); }
  };
  const deletePlayer = async (id) => {
    if (id === currentUserId) { setToast("Não é possível remover a si mesmo"); return; }
    try { await api.deleteJogador(id); setPlayers((ps) => ps.filter((p) => p.id !== id)); setToast("Jogador removido"); }
    catch { setToast("Sem permissão para remover (só o anfitrião)"); }
  };
  const updatePlayerPapel = async (id, papel) => {
    const LABEL = { convidado: "Convidado", administrador: "Admin", anfitriao: "Anfitrião" };
    try {
      await api.updateJogadorPapel(id, papel);
      setPlayers((ps) => ps.map((p) => p.id === id ? { ...p, papel } : p));
      setToast(`Perfil atualizado: ${LABEL[papel] || papel} ✓`);
    } catch { setToast("Sem permissão (só o anfitrião)"); }
  };
  const addMomento = async (texto) => {
    if (!guard()) return;
    try {
      const row = await api.insertMomento({ texto, autor_id: currentUserId });
      setMomentos((ms) => [{ id: row.id, autor: currentUserId, data: today(),
        texto, tom: TONS[0], naipe: NAIPES[0] }, ...ms]);
      setToast("Momento guardado ✓");
    } catch { setToast("Não foi possível guardar o momento"); }
  };
  const aprovarPendente = async (p) => {
    try {
      const row = await api.insertJogador({ nome: p.nome, apelido: p.apelido, papel: "convidado" });
      setPlayers((pl) => [...pl, { id: row.id, nome: row.nome, apelido: row.apelido || row.nome,
        papel: row.papel, auth_user_id: null, foto_url: null }]);
      setPendentes((ps) => ps.filter((x) => x.id !== p.id));
      setToast(`${p.apelido} entrou no grupo ✓`);
    } catch { setToast("Entre para aprovar pedidos"); }
  };
  // Anfitrião adiciona um jogador direto (sem login dele; ele vincula depois em "Quem é você?")
  const criarJogador = async (nome, apelido) => {
    if (!guard()) return;
    try {
      const row = await api.insertJogador({ nome, apelido, papel: "convidado" });
      setPlayers((pl) => [...pl, { id: row.id, nome: row.nome, apelido: row.apelido || row.nome,
        papel: row.papel, auth_user_id: null, foto_url: null }]);
      setToast(`${apelido} adicionado ✓`);
    } catch { setToast("Não foi possível adicionar o jogador"); }
  };
  // Vínculo conta de login ↔ jogador (tela "Quem é você?")
  const vincularExistente = async (jogadorId) => {
    try { await api.claimJogador(jogadorId, user.id); await reloadPlayers(); go("home"); setToast("Pronto! Você entrou ✓"); }
    catch { setToast("Esse jogador já tem dono. Escolha outro ou crie o seu."); }
  };
  const criarMeuJogador = async (nome, apelido) => {
    try {
      const primeiro = players.length === 0;
      await api.insertJogador({ nome, apelido, papel: primeiro ? "anfitriao" : "convidado", auth_user_id: user.id });
      await reloadPlayers();
      go("home");
      setToast(primeiro ? "Bem-vindo, anfitrião! ✓" : "Cadastro criado ✓");
    } catch { setToast("Não foi possível criar seu cadastro"); }
  };

  const screens = {
    home: <Home {...{ fel, players, pendentes, games, liveGame, champ, go, nomes }} />,
    novaPartida: <NovaPartida {...{ players, go, startGame }} />,
    game: <Game key={route.gameId} gameId={route.gameId}
      {...{ games, fel, nomes, addRound, undoRound, go, champ, onGameFinished, share, setToast }} />,
    champ: <Campeonato {...{ champ, fel, nomes, go, startGame, criarCampeonato, sortearDuplas, games, share }} />,
    ranking: <Ranking {...{ ranking, go, byId }} />,
    historico: <Historico {...{ games, go, nomes, isHost, deleteGame, setToast }} />,
    detalhe: <Detalhe gameId={route.gameId} {...{ games, go, nomes }} />,
    momentos: <Momentos {...{ momentos, addMomento, byId, go }} />,
    config: <Config {...{ feltro, setFeltro, temaId, setTemaId, pendentes, setPendentes, players,
      currentPlayer, isHost, isAdmin, updatePlayerPapel, deletePlayer, aprovarPendente, criarJogador, go, setToast }} />,
    registro: <Registro {...{ go, setPendentes, setToast }} />,
    login: <Login go={go} />,
  };

  return (
    <ThemeCtx.Provider value={th}>
      <div className={`t-${th.id}`} style={{ minHeight: "100vh", background: th.frameBg,
        display: "flex", justifyContent: "center",
        fontFamily: th.fontBody, color: th.tinta }}>
        <style>{CSS}</style>
        <div className="frame" style={{ width: "100%", minHeight: "100vh", background: th.pageBg,
          backgroundImage: th.pagePattern, backgroundSize: th.pagePatternSize || "auto",
          padding: "0 18px 28px", position: "relative", overflowX: "hidden" }}>
          {th.id === "tranca" && <CartasFundo />}
          <div className={th.entry} key={th.id + route.name + (route.gameId || "") + (loadingData ? "L" : "") + (needsLink ? "V" : "")}
            style={{ position: "relative", zIndex: 1 }}>
            {loadingData
              ? <Carregando />
              : needsLink
                ? <QuemEhVoce {...{ players, vincularExistente, criarMeuJogador, signOut }} />
                : (screens[route.name] || screens.home)}
          </div>
          <Toast msg={toast} />
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ════════════════ Carregando ════════════════ */
function Carregando() {
  const th = useTheme();
  return (
    <div style={{ textAlign: "center", paddingTop: 90 }}>
      <span className="trofeu" style={{ fontSize: 56 }} aria-hidden="true">🃏</span>
      <p style={{ fontSize: 20, color: th.pageSub, marginTop: 16 }}>Carregando…</p>
    </div>
  );
}

/* ════════════════ Entrar (Magic Link) ════════════════ */
function Login({ go }) {
  const th = useTheme();
  const { signInWithEmail, authMessage } = useAuth();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const valido = /\S+@\S+\.\S+/.test(email);

  const enviar = async () => {
    setEnviando(true); setErro("");
    const { error } = await signInWithEmail(email);
    setEnviando(false);
    if (error) setErro("Não conseguimos enviar agora. Confira o e-mail e tente de novo.");
    else setEnviado(true);
  };

  if (enviado) {
    return (
      <div style={{ textAlign: "center", paddingTop: 50 }}>
        <span style={{ fontSize: 64 }} aria-hidden="true">📧</span>
        <h1 style={{ fontFamily: th.fontDisplay, fontWeight: th.displayWeight, fontSize: 29,
          margin: "16px 0 10px", color: th.pageText, lineHeight: 1.2 }}>
          Enviamos um link para seu e-mail
        </h1>
        <p style={{ fontSize: 19, color: th.pageSub, lineHeight: 1.55, margin: "0 0 8px" }}>
          Abra o e-mail <strong style={{ color: th.pageText }}>no mesmo celular</strong> e toque no link para entrar.
        </p>
        <p style={{ fontSize: 17, color: th.pageSub, lineHeight: 1.55, margin: "0 0 30px" }}>
          Não chegou? Veja a caixa de spam ou peça de novo.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn kind="ghost" onClick={() => setEnviado(false)}>Usar outro e-mail</Btn>
          <Btn kind="ghost" onClick={() => go("home")}>Voltar ao app</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Entrar" onBack={() => go("home")} />
      <p style={{ fontSize: 18, color: th.pageSub, margin: "0 0 20px", lineHeight: 1.5 }}>
        Para registrar partidas, jogadores e momentos, entre com seu e-mail.
        Você recebe um link e pronto — <strong style={{ color: th.pageText }}>sem senha</strong>.
        Ver ranking e histórico não precisa entrar.
      </p>
      {(authMessage || erro) && (
        <Card style={{ marginBottom: 16, borderColor: th.accent, background: th.chipBg }}>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>{erro || authMessage}</p>
        </Card>
      )}
      <label style={{ display: "block", fontSize: 17, fontWeight: 700, marginBottom: 6, color: th.pageText }}>
        Seu e-mail
      </label>
      <input value={email} inputMode="email" autoComplete="email"
        onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com"
        style={{ width: "100%", minHeight: 60, borderRadius: 14, border: `2px solid ${th.linha}`,
          fontSize: 19, padding: "0 16px", background: th.inputBg, color: th.tinta,
          fontFamily: "inherit", outline: "none" }} />
      <div style={{ marginTop: 18 }}>
        <Btn kind="ok" disabled={!valido || enviando} onClick={enviar}>
          {enviando ? "Enviando…" : "Enviar link de entrada"}
        </Btn>
      </div>
    </div>
  );
}

/* ════════════════ Quem é você? (vínculo conta ↔ jogador) ════════════════ */
function QuemEhVoce({ players, vincularExistente, criarMeuJogador, signOut }) {
  const th = useTheme();
  const semDono = players.filter((p) => !p.auth_user_id);
  const [criando, setCriando] = useState(players.length === 0);
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const inputStyle = { width: "100%", minHeight: 56, borderRadius: 14, border: `2px solid ${th.linha}`,
    fontSize: 19, padding: "0 16px", background: th.inputBg, color: th.tinta, fontFamily: "inherit", outline: "none" };

  return (
    <div>
      <Header title="Quem é você?" />
      <p style={{ fontSize: 18, color: th.pageSub, margin: "0 0 18px", lineHeight: 1.5 }}>
        Você entrou! Agora diga qual jogador é você, para o app saber de quem são as vitórias.
      </p>

      {!criando && (
        <>
          {semDono.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {semDono.map((p) => (
                <button key={p.id} onClick={() => vincularExistente(p.id)} className="press hoverable"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    borderRadius: th.radius, border: `2px solid ${th.linha}`, background: th.card,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: th.tinta }}>
                  <Avatar p={p} size={44} />
                  <span style={{ flex: 1, fontSize: 19, fontWeight: 800 }}>{p.apelido}</span>
                  <span style={{ fontSize: 16, color: th.accent, fontWeight: 800 }}>Sou eu →</span>
                </button>
              ))}
            </div>
          ) : (
            <Card pad={18}><p style={{ margin: 0, fontSize: 18, color: th.suave }}>
              Todos os jogadores já têm dono. Crie o seu cadastro abaixo.
            </p></Card>
          )}
          <div style={{ marginTop: 14 }}>
            <Btn kind="ghost" onClick={() => setCriando(true)}>Não estou na lista — criar meu cadastro</Btn>
          </div>
        </>
      )}

      {criando && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 17, fontWeight: 700, marginBottom: 6, color: th.pageText }}>Seu nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 17, fontWeight: 700, marginBottom: 6, color: th.pageText }}>Apelido (no placar)</label>
            <input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Ex: Joãozinho" style={inputStyle} />
          </div>
          <Btn kind="ok" disabled={!nome.trim() || !apelido.trim()}
            onClick={() => criarMeuJogador(nome.trim(), apelido.trim())}>Sou eu, criar cadastro</Btn>
          {players.length > 0 && <Btn kind="ghost" onClick={() => setCriando(false)}>Voltar à lista</Btn>}
        </div>
      )}

      <div style={{ marginTop: 26 }}>
        <Btn kind="ghost" onClick={() => signOut()}>Sair</Btn>
      </div>
    </div>
  );
}

/* cartas decorativas em fade — só no tema Mesa de Tranca */
function CartasFundo() {
  const cartas = [
    { top: "8%",  left: "-30px", rot: -14, naipe: "♠", delay: "0s" },
    { top: "34%", right: "-26px", rot: 11,  naipe: "♥", delay: "1.2s" },
    { top: "64%", left: "-22px",  rot: 8,   naipe: "♦", delay: "2.1s" },
    { top: "86%", right: "-30px", rot: -10, naipe: "♣", delay: "0.6s" },
  ];
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden",
      pointerEvents: "none", zIndex: 0 }}>
      {cartas.map((c, i) => (
        <div key={i} className="carta-flutua" style={{
          position: "absolute", top: c.top, left: c.left, right: c.right, "--rot": `${c.rot}deg`,
          width: 86, height: 120, borderRadius: 10, background: "rgba(251,247,236,0.07)",
          border: "1px solid rgba(251,247,236,0.10)", transform: `rotate(${c.rot}deg)`,
          animationDelay: c.delay, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40, color: "rgba(251,247,236,0.12)" }}>{c.naipe}</div>
      ))}
    </div>
  );
}

/* ════════════════ Home ════════════════ */
function Home({ fel, players, pendentes, games, liveGame, champ, go, nomes }) {
  const th = useTheme();
  const done = games.filter((g) => g.status === "done");
  const ultima = done[done.length - 1];
  return (
    <div>
      <div style={{ margin: "18px -18px 0", padding: "30px 26px 26px",
        background: `radial-gradient(120% 140% at 50% 0%, ${fel.cor} 0%, ${fel.escuro} 100%)`,
        color: "#FFF", position: "relative",
        borderBottom: th.id === "tranca" ? `3px solid ${th.accent}` : "none" }}>
        <div aria-hidden="true" style={{ position: "absolute", right: 18, top: 14, fontSize: 64,
          opacity: 0.12, fontFamily: "Marcellus, serif" }}>♠</div>
        <p style={{ margin: 0, fontSize: 16, letterSpacing: "0.14em", textTransform: "uppercase",
          color: th.accentClaro, fontWeight: 700 }}>Toda terça, desde 2019</p>
        <h1 style={{ fontFamily: th.fontDisplay, fontWeight: th.displayWeight, fontSize: 36,
          margin: "6px 0 4px" }}>Cassino do Riva</h1>
        <p style={{ margin: 0, fontSize: 18, opacity: 0.85 }}>{players.length} jogadores · Tranca até 3.000</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
        {liveGame && (
          <Card onClick={() => go("game", { gameId: liveGame.id })}
            style={{ borderColor: th.accent, background: th.chipBg }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: th.accent,
              textTransform: "uppercase", letterSpacing: "0.1em" }}>Partida em andamento</p>
            <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 700 }}>
              {nomes(liveGame.teams[0].players)} · {fmt(liveGame.teams[0].total)}
              <span style={{ color: th.suave, fontWeight: 400 }}>  ×  </span>
              {fmt(liveGame.teams[1].total)} · {nomes(liveGame.teams[1].players)}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 17, color: th.suave }}>Toque para voltar ao placar →</p>
          </Card>
        )}
        {champ && champ.status === "live" && (
          <Card onClick={() => go("champ")} style={{ borderColor: th.accent }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🏆 Campeonato da noite em andamento</p>
            <p style={{ margin: "4px 0 0", fontSize: 17, color: th.suave }}>Ver o chaveamento →</p>
          </Card>
        )}

        <Btn kind="primary" style={{ minHeight: 66, fontSize: 21 }} onClick={() => go("novaPartida")}>
          ＋ Nova partida
        </Btn>
        <Btn kind="ghost" style={{ minHeight: 62 }} onClick={() => go("champ")}>
          🏆 Campeonato da noite
        </Btn>

        <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            ["ranking", "Ranking", "Quem vence mais"],
            ["historico", "Histórico", `${done.length} jogos`],
            ["momentos", "Momentos", "Fotos e resenha"],
            ["config", "Ajustes", pendentes.length ? `${pendentes.length} pedido de entrada` : "Estilo, fundo e grupo"],
          ].map(([r, t, s]) => (
            <Card key={r} onClick={() => go(r)} style={{ minHeight: 96, position: "relative" }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{t}</p>
              <p style={{ margin: "4px 0 0", fontSize: 16, color: th.suave, lineHeight: 1.35 }}>{s}</p>
              {r === "config" && pendentes.length > 0 && (
                <span style={{ position: "absolute", top: 14, right: 14, width: 12, height: 12,
                  borderRadius: "50%", background: th.danger }} aria-label="Pedido pendente" />
              )}
            </Card>
          ))}
        </div>

        {ultima && (
          <Card onClick={() => go("detalhe", { gameId: ultima.id })}>
            <p style={{ margin: 0, fontSize: 16, color: th.suave, textTransform: "uppercase",
              letterSpacing: "0.1em", fontWeight: 700 }}>Última terça</p>
            <p style={{ margin: "6px 0 0", fontSize: 19, lineHeight: 1.4 }}>
              <strong>{nomes(ultima.teams[ultima.winner].players)}</strong> venceram por{" "}
              {fmt(ultima.teams[ultima.winner].total)} a {fmt(ultima.teams[1 - ultima.winner].total)}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ════════════════ Nova partida ════════════════ */
function NovaPartida({ players, go, startGame }) {
  const th = useTheme();
  const [sel, setSel] = useState([]);
  const [meta, setMeta] = useState(3000);
  const toggle = (id) => setSel((s) =>
    s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s);
  return (
    <div>
      <Header title="Nova partida" onBack={() => go("home")} />
      <p style={{ fontSize: 18, color: th.pageSub, margin: "0 0 14px", lineHeight: 1.45 }}>
        Toque em 4 jogadores, na ordem das duplas: os 2 primeiros formam a dupla A, os 2 seguintes a dupla B.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {players.map((p) => {
          const idx = sel.indexOf(p.id);
          const on = idx >= 0;
          const dupla = idx < 0 ? null : idx < 2 ? "A" : "B";
          return (
            <button key={p.id} onClick={() => toggle(p.id)} className="press hoverable" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
              minHeight: 68, borderRadius: th.radius, fontSize: 18, fontWeight: 700, cursor: "pointer",
              background: on ? th.chipBg : th.card, fontFamily: "inherit", textAlign: "left",
              border: `2px solid ${on ? th.accent : th.linha}`, color: th.tinta }}>
              <Avatar p={p} size={40} ring={on ? th.accent : undefined} />
              <span style={{ flex: 1 }}>{p.apelido}</span>
              {dupla && <span style={{ fontSize: 16, fontWeight: 800, color: th.accent }}>Dupla {dupla}</span>}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 19, fontWeight: 800, margin: "22px 0 10px", color: th.pageText }}>
        Jogar até quantos pontos?
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        {[1500, 3000, 5000].map((m) => (
          <SegBtn key={m} on={meta === m} onClick={() => setMeta(m)}>{fmt(m)}</SegBtn>
        ))}
      </div>

      <div style={{ marginTop: 26 }}>
        <Btn kind="ok" disabled={sel.length !== 4}
          onClick={() => startGame(sel.slice(0, 2), sel.slice(2, 4), meta)}>
          {sel.length === 4 ? "Começar partida" : `Escolha ${4 - sel.length} jogador${4 - sel.length > 1 ? "es" : ""}`}
        </Btn>
      </div>
    </div>
  );
}

/* ════════════════ Placar ao vivo ════════════════ */
function Game({ gameId, games, fel, nomes, addRound, undoRound, go, champ, onGameFinished, share, setToast }) {
  const th = useTheme();
  const g = games.find((x) => x.id === gameId);
  const [sheet, setSheet] = useState(false);
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [negA, setNegA] = useState(false); const [negB, setNegB] = useState(false);
  const [confirma, setConfirma] = useState(false);
  const [finReported, setFinReported] = useState(false);

  useEffect(() => {
    if (g && g.status === "done" && !finReported) { setFinReported(true); onGameFinished(g); }
  }, [g, finReported]);

  if (!g) return null;
  const isChampMatch = !!g.matchId;
  const empate = g.teams[0].total === g.teams[1].total && g.teams[0].total >= g.meta;

  if (g.status === "done") {
    const w = g.teams[g.winner], l = g.teams[1 - g.winner];
    const matchInfo = isChampMatch && champ ? champ.matches.find((m) => m.id === g.matchId) : null;
    return (
      <div style={{ textAlign: "center", paddingTop: 40 }}>
        <span className="trofeu" style={{ fontSize: 84 }} aria-hidden="true">🏆</span>
        <p style={{ fontSize: 17, letterSpacing: "0.14em", textTransform: "uppercase",
          color: th.accent, fontWeight: 800, margin: "16px 0 4px" }}>
          {matchInfo ? matchInfo.fase + " decidida" : "Temos vencedores"}
        </p>
        <h1 style={{ fontFamily: th.fontDisplay, fontWeight: th.displayWeight, fontSize: 38,
          margin: "0 0 6px", lineHeight: 1.15, color: th.pageText }}>{nomes(w.players)}</h1>
        <p style={{ fontSize: 22, margin: 0, color: th.pageText }}>
          <strong>{fmt(w.total)}</strong> <span style={{ color: th.pageSub }}>a</span> <strong>{fmt(l.total)}</strong>
        </p>
        <p style={{ fontSize: 18, color: th.pageSub, margin: "8px 0 30px" }}>
          {g.teams[0].rounds.length} rodadas · meta de {fmt(g.meta)} pontos
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isChampMatch
            ? <Btn kind="primary" onClick={() => go("champ")}>Voltar ao campeonato</Btn>
            : <>
                <Btn kind="ok" onClick={() => share(
                  `🃏 Cassino do Riva — ${nomes(w.players)} venceram por ${fmt(w.total)} a ${fmt(l.total)}!`)}>
                  Compartilhar no WhatsApp
                </Btn>
                <Btn kind="ghost" onClick={() => go("home")}>Voltar ao grupo</Btn>
              </>}
        </div>
      </div>
    );
  }

  const preview = (raw, neg) => { const n = parseInt(raw || "0", 10) || 0; return neg ? -n : n; };
  const novoA = g.teams[0].total + preview(a, negA);
  const novoB = g.teams[1].total + preview(b, negB);

  const TeamFelt = ({ t, i }) => {
    const pct = Math.min(100, Math.round((100 * Math.max(0, t.total)) / g.meta));
    const lider = t.total > g.teams[1 - i].total;
    return (
      <div className="placar" style={{ borderRadius: 22, padding: "20px 22px", color: "#FFF",
        position: "relative", background: `linear-gradient(155deg, ${fel.cor}, ${fel.escuro})`,
        border: lider ? `2px solid ${th.accent}` : "2px solid transparent" }}>
        <div aria-hidden="true" style={{ position: "absolute", right: 16, top: 10, fontSize: 46,
          opacity: 0.14, fontFamily: "Marcellus, serif" }}>{i === 0 ? "♠" : "♦"}</div>
        <p style={{ margin: 0, fontSize: 19, fontWeight: 700, opacity: 0.95 }}>{nomes(t.players)}</p>
        <p style={{ margin: "2px 0 8px", fontSize: 54, fontWeight: 800, lineHeight: 1,
          fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{fmt(t.total)}</p>
        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.18)" }}>
          <div style={{ height: 8, borderRadius: 4, width: pct + "%", background: th.accentClaro,
            transition: "width 400ms cubic-bezier(0.25,0.46,0.45,0.94)" }} />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 17, opacity: 0.85 }}>
          {t.total >= g.meta ? "Meta atingida" : `Faltam ${fmt(g.meta - t.total)} pontos`}
        </p>
      </div>
    );
  };

  return (
    <div>
      <Header title={isChampMatch ? "Confronto do campeonato" : "Placar ao vivo"}
        onBack={() => go(isChampMatch ? "champ" : "home")} />
      <p style={{ fontSize: 18, color: th.pageSub, margin: "0 0 14px" }}>
        Jogando até <strong style={{ color: th.pageText }}>{fmt(g.meta)} pontos</strong> · soma das rodadas
      </p>
      {empate && (
        <Card style={{ borderColor: th.accent, background: th.chipBg, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.45 }}>
            <strong>Empate em {fmt(g.teams[0].total)}!</strong> Joguem uma rodada de desempate — a próxima rodada decide.
          </p>
        </Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TeamFelt t={g.teams[0]} i={0} />
        <TeamFelt t={g.teams[1]} i={1} />
      </div>

      <div style={{ marginTop: 16 }}>
        <Btn kind="ok" style={{ minHeight: 68, fontSize: 21 }} onClick={() => setSheet(true)}>
          ＋ Anotar rodada
        </Btn>
      </div>

      {g.teams[0].rounds.length > 0 ? (
        <Card style={{ marginTop: 14 }} pad={18}>
          <p style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: th.suave,
            textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Rodadas ({g.teams[0].rounds.length})
          </p>
          {g.teams[0].rounds.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0",
              borderTop: i ? `1px solid ${th.linha}` : "none", fontSize: 18,
              fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: th.suave }}>Rodada {i + 1}</span>
              <span><strong>{fmt(r)}</strong> · <strong>{fmt(g.teams[1].rounds[i])}</strong></span>
            </div>
          ))}
          <button onClick={() => setConfirma(true)} className="press" style={{
            marginTop: 12, minHeight: 52, width: "100%", borderRadius: 12, fontSize: 17,
            border: `1.5px solid ${th.linha}`, background: th.card, color: th.danger,
            cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            Desfazer última rodada
          </button>
        </Card>
      ) : (
        <Card style={{ marginTop: 14, textAlign: "center" }} pad={26}>
          <p style={{ margin: 0, fontSize: 19, lineHeight: 1.5 }}>
            Boa partida! 🃏<br />
            <span style={{ color: th.suave, fontSize: 18 }}>Quando a primeira rodada terminar, anote os pontos aqui.</span>
          </p>
        </Card>
      )}

      {sheet && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(15,12,8,0.55)", zIndex: 40,
          display: "flex", alignItems: "flex-end" }} onClick={() => setSheet(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: th.card, width: "100%",
            borderRadius: `${th.radius + 4}px ${th.radius + 4}px 0 0`, padding: "22px 20px 26px",
            color: th.tinta }}>
            <p style={{ margin: "0 0 16px", fontSize: 23, fontWeight: 800 }}>Pontos da rodada</p>
            {[0, 1].map((i) => {
              const val = i === 0 ? a : b, setVal = i === 0 ? setA : setB;
              const neg = i === 0 ? negA : negB, setNeg = i === 0 ? setNegA : setNegB;
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 18, fontWeight: 700 }}>{nomes(g.teams[i].players)}</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button onClick={() => setNeg(!neg)} className="press" aria-label="Pontos negativos" style={{
                      width: 58, borderRadius: 14, fontSize: 24, fontWeight: 800, cursor: "pointer",
                      border: `2px solid ${neg ? th.danger : th.linha}`, fontFamily: "inherit",
                      background: neg ? th.chipBg : th.card, color: neg ? th.danger : th.suave }}>−</button>
                    <input inputMode="numeric" pattern="[0-9]*" value={val} placeholder="0"
                      onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 5))}
                      style={{ flex: 1, minHeight: 60, borderRadius: 14, border: `2px solid ${th.linha}`,
                        fontSize: 26, fontWeight: 700, padding: "0 16px",
                        color: neg ? th.danger : th.tinta, fontFamily: "inherit",
                        fontVariantNumeric: "tabular-nums", background: th.inputBg }} />
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 18, color: th.suave, margin: "4px 0 16px", lineHeight: 1.5 }}>
              Nova soma: <strong style={{ color: th.tinta }}>{fmt(novoA)}</strong> ×{" "}
              <strong style={{ color: th.tinta }}>{fmt(novoB)}</strong>
              {(novoA >= g.meta || novoB >= g.meta) && novoA !== novoB && (
                <><br /><span style={{ color: th.ok, fontWeight: 800 }}>Essa rodada fecha o jogo! 🏁</span></>
              )}
            </p>
            <Btn kind="ok" disabled={a === "" && b === ""} onClick={() => {
              addRound(g.id, preview(a, negA), preview(b, negB));
              setSheet(false); setA(""); setB(""); setNegA(false); setNegB(false);
              setToast("Pontos anotados ✓");
            }}>Confirmar pontos</Btn>
            <div style={{ height: 10 }} />
            <Btn kind="ghost" onClick={() => setSheet(false)}>Voltar sem anotar</Btn>
          </div>
        </div>
      )}

      <Confirm open={confirma} titulo="Apagar a última rodada?"
        texto="Os pontos dessa rodada saem do placar das duas duplas. Dá para anotar de novo em seguida."
        acao="Sim, apagar rodada"
        onYes={() => { undoRound(g.id); setConfirma(false); setToast("Rodada apagada"); }}
        onNo={() => setConfirma(false)} />
    </div>
  );
}

/* ════════════════ Campeonato ════════════════ */
function Campeonato({ champ, fel, nomes, go, startGame, criarCampeonato, sortearDuplas, games, share }) {
  const th = useTheme();
  const [duplas, setDuplas] = useState(() => sortearDuplas());
  const [meta, setMeta] = useState(1500);

  if (!champ || champ.status === "setup") {
    return (
      <div>
        <Header title="Campeonato da noite" onBack={() => go("home")} />
        <p style={{ fontSize: 18, color: th.pageSub, lineHeight: 1.5, margin: "0 0 16px" }}>
          As 4 duplas se enfrentam em duas semifinais. As vencedoras se cruzam na grande final
          e decidem o <strong style={{ color: th.pageText }}>Campeão da Noite</strong>.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {duplas.map((d, i) => (
            <Card key={i} pad={16} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: th.fontDisplay, fontWeight: th.displayWeight,
                fontSize: 22, color: th.accent, width: 26 }}>{i + 1}</span>
              <span style={{ fontSize: 19, fontWeight: 700 }}>{nomes(d)}</span>
            </Card>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <Btn kind="ghost" onClick={() => setDuplas(sortearDuplas())}>🔀 Sortear duplas de novo</Btn>
        </div>
        <p style={{ fontSize: 19, fontWeight: 800, margin: "20px 0 10px", color: th.pageText }}>
          Pontos por confronto
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          {[1500, 3000].map((m) => (
            <SegBtn key={m} on={meta === m} onClick={() => setMeta(m)}>{fmt(m)}</SegBtn>
          ))}
        </div>
        <p style={{ fontSize: 17, color: th.pageSub, margin: "10px 0 20px" }}>
          Com 1.500 por confronto, a noite costuma render as três partidas.
        </p>
        <Btn kind="ok" style={{ minHeight: 66 }} onClick={() => criarCampeonato(duplas, meta)}>
          Começar campeonato
        </Btn>
      </div>
    );
  }

  const Match = ({ m }) => {
    const pronto = m.a != null && m.b != null;
    const jogo = games.find((g) => g.id === m.gameId);
    return (
      <Card pad={18} style={{ borderColor: m.winner != null ? th.accent : th.linha }}>
        <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: th.accent,
          textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.fase}</p>
        {pronto ? (
          <>
            {[m.a, m.b].map((d, i) => {
              const venceu = m.winner === d;
              const pts = jogo ? jogo.teams[i].total : null;
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between",
                  padding: "7px 0", fontSize: 19, fontWeight: venceu ? 800 : 600,
                  color: m.winner != null && !venceu ? th.suave : th.tinta }}>
                  <span>{venceu ? "🏆 " : ""}{nomes(champ.duplas[d])}</span>
                  {pts != null && <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(pts)}</span>}
                </div>
              );
            })}
            {m.winner == null && (
              <div style={{ marginTop: 10 }}>
                <Btn kind="primary" style={{ minHeight: 56, fontSize: 18 }}
                  onClick={() => {
                    if (jogo && jogo.status === "live") go("game", { gameId: jogo.id });
                    else startGame(champ.duplas[m.a], champ.duplas[m.b], champ.meta, m.id, champ.id);
                  }}>
                  {jogo && jogo.status === "live" ? "Voltar ao placar" : "Abrir o placar"}
                </Btn>
              </div>
            )}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 18, color: th.suave }}>
            Aguardando as duplas vencedoras das semifinais.
          </p>
        )}
      </Card>
    );
  };

  const campea = champ.matches[2].winner != null ? champ.duplas[champ.matches[2].winner] : null;
  return (
    <div>
      <Header title="Campeonato da noite" onBack={() => go("home")} />
      {campea && (
        <div style={{ borderRadius: 22, padding: "26px 22px", color: "#FFF", textAlign: "center",
          background: `linear-gradient(155deg, ${fel.cor}, ${fel.escuro})`, marginBottom: 14,
          border: `2px solid ${th.accent}` }}>
          <span className="trofeu" style={{ fontSize: 56 }} aria-hidden="true">🏆</span>
          <p style={{ margin: "8px 0 2px", fontSize: 16, letterSpacing: "0.14em",
            textTransform: "uppercase", color: th.accentClaro, fontWeight: 800 }}>Campeãs da noite</p>
          <p style={{ fontFamily: th.fontDisplay, fontWeight: th.displayWeight, fontSize: 30, margin: 0 }}>
            {nomes(campea)}
          </p>
          <div style={{ marginTop: 16 }}>
            <Btn kind="ok" onClick={() => share(`🏆 Campeonato do Cassino do Riva: ${nomes(campea)} são as campeãs da noite!`)}>
              Compartilhar no WhatsApp
            </Btn>
          </div>
        </div>
      )}
      <p style={{ fontSize: 18, color: th.pageSub, margin: "0 0 14px" }}>
        Confrontos até {fmt(champ.meta)} pontos · vencedoras avançam
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {champ.matches.map((m) => <Match key={m.id} m={m} />)}
      </div>
    </div>
  );
}

/* ════════════════ Ranking ════════════════ */
function Ranking({ ranking, go, byId }) {
  const th = useTheme();
  const [tab, setTab] = useState("duplas");
  const Bar = ({ pct }) => (
    <div style={{ height: 8, borderRadius: 4, background: th.chipBg, marginTop: 8 }}>
      <div style={{ height: 8, borderRadius: 4, width: pct + "%", background: th.accent }} />
    </div>
  );
  const Linha = ({ pos, titulo, sub, ap, avatar }) => (
    <Card pad={16}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: th.fontDisplay, fontWeight: th.displayWeight, fontSize: 24,
          width: 34, color: pos === 1 ? th.accent : th.suave }}>{pos}º</span>
        {avatar}
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{pos === 1 ? "👑 " : ""}{titulo}</p>
          <p style={{ margin: 0, fontSize: 16, color: th.suave }}>{sub}</p>
        </div>
        <span style={{ fontSize: 21, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{ap}%</span>
      </div>
      <Bar pct={ap} />
    </Card>
  );
  return (
    <div>
      <Header title="Ranking" onBack={() => go("home")} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <SegBtn on={tab === "duplas"} onClick={() => setTab("duplas")}>Duplas</SegBtn>
        <SegBtn on={tab === "individual"} onClick={() => setTab("individual")}>Individual</SegBtn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tab === "individual"
          ? ranking.indArr.map((r, i) => (
              <Linha key={r.p.id} pos={i + 1} titulo={r.p.apelido}
                sub={`${r.v} vitórias · ${r.d} derrotas`} ap={r.ap}
                avatar={<Avatar p={r.p} size={46} ring={i === 0 ? th.accent : undefined} />} />
            ))
          : ranking.dupArr.map((d, i) => (
              <Linha key={d.players.join()} pos={i + 1}
                titulo={d.players.map((id) => byId(id).apelido).join(" & ")}
                sub={`${d.v} vitórias · ${d.d} derrotas · ${d.j} jogos`} ap={d.ap} avatar={null} />
            ))}
      </div>
    </div>
  );
}

/* ════════════════ Histórico e detalhe ════════════════ */
function Historico({ games, go, nomes, isHost, deleteGame, setToast }) {
  const th = useTheme();
  const [delConfirm, setDelConfirm] = useState(null);
  const done = [...games].filter((g) => g.status === "done").reverse();
  const dataBr = (d) => new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  return (
    <div>
      <Header title="Histórico" onBack={() => go("home")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {done.map((g) => (
          <div key={g.id} style={{ position: "relative" }}>
            <Card pad={16} onClick={() => go("detalhe", { gameId: g.id })}
              style={isHost ? { paddingRight: 56 } : {}}>
              <p style={{ margin: 0, fontSize: 16, color: th.suave, textTransform: "uppercase",
                letterSpacing: "0.08em", fontWeight: 700 }}>
                {dataBr(g.date)}{g.matchId ? " · campeonato" : ""}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 19, lineHeight: 1.4 }}>
                <strong>🏆 {nomes(g.teams[g.winner].players)}</strong>{" "}
                {fmt(g.teams[g.winner].total)} × {fmt(g.teams[1 - g.winner].total)}{" "}
                {nomes(g.teams[1 - g.winner].players)}
              </p>
            </Card>
            {isHost && (
              <button onClick={(e) => { e.stopPropagation(); setDelConfirm(g.id); }}
                className="press" aria-label="Apagar partida"
                style={{ position: "absolute", top: 10, right: 10, width: 40, height: 40, zIndex: 2,
                  borderRadius: 10, border: `1.5px solid ${th.linha}`, background: th.card,
                  color: th.danger, fontSize: 17, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
            )}
          </div>
        ))}
      </div>
      <Confirm open={!!delConfirm} titulo="Apagar esta partida?"
        texto="O registro sai do histórico permanentemente. O ranking será recalculado."
        acao="Sim, apagar"
        onYes={() => { deleteGame(delConfirm); setDelConfirm(null); setToast("Partida apagada"); }}
        onNo={() => setDelConfirm(null)} />
    </div>
  );
}
function Detalhe({ gameId, games, go, nomes }) {
  const th = useTheme();
  const g = games.find((x) => x.id === gameId);
  if (!g) return null;
  return (
    <div>
      <Header title="Detalhe da partida" onBack={() => go("historico")} />
      <Card>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🏆 {nomes(g.teams[g.winner].players)}</p>
        <p style={{ margin: "4px 0 14px", fontSize: 18, color: th.suave }}>
          venceram por {fmt(g.teams[g.winner].total)} a {fmt(g.teams[1 - g.winner].total)} · meta {fmt(g.meta)}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16,
          color: th.suave, fontWeight: 700, paddingBottom: 6 }}>
          <span>Rodada</span><span>{nomes(g.teams[0].players)} · {nomes(g.teams[1].players)}</span>
        </div>
        {g.teams[0].rounds.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0",
            borderTop: `1px solid ${th.linha}`, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: th.suave }}>{i + 1}ª</span>
            <span><strong>{fmt(r)}</strong> · <strong>{fmt(g.teams[1].rounds[i])}</strong></span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ════════════════ Momentos ════════════════ */
function Momentos({ momentos, addMomento, byId, go }) {
  const th = useTheme();
  const [texto, setTexto] = useState("");
  const [escrevendo, setEscrevendo] = useState(false);
  const dataBr = (d) => new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  return (
    <div>
      <Header title="Momentos" onBack={() => go("home")} />
      <p style={{ fontSize: 18, color: th.pageSub, margin: "0 0 14px", lineHeight: 1.45 }}>
        A memória da turma: fotos, resenha e as histórias de cada terça.
      </p>
      {!escrevendo ? (
        <Btn kind="primary" onClick={() => setEscrevendo(true)} style={{ marginBottom: 14 }}>
          📷 Registrar um momento
        </Btn>
      ) : (
        <Card style={{ marginBottom: 14 }}>
          <p style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800 }}>Novo momento</p>
          <p style={{ margin: "0 0 10px", fontSize: 17, color: th.suave }}>
            No app final, a foto vem da câmera ou da galeria. Aqui, escreva a resenha:
          </p>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
            placeholder="Conte como foi a noite..."
            style={{ width: "100%", borderRadius: 14, border: `2px solid ${th.linha}`, padding: 14,
              fontSize: 18, resize: "none", background: th.inputBg, color: th.tinta,
              fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn kind="ok" style={{ minHeight: 54, fontSize: 17 }} disabled={!texto.trim()} onClick={() => {
              addMomento(texto.trim());
              setTexto(""); setEscrevendo(false);
            }}>Guardar momento</Btn>
            <Btn kind="ghost" style={{ minHeight: 54, fontSize: 17 }} onClick={() => setEscrevendo(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {momentos.map((m) => (
          <Card key={m.id} pad={0} style={{ overflow: "hidden" }}>
            <div aria-label="Foto do momento" style={{ height: 130, position: "relative",
              background: `linear-gradient(150deg, ${m.tom}, #15120E)` }}>
              <span aria-hidden="true" style={{ position: "absolute", right: 18, bottom: 8, fontSize: 72,
                color: "rgba(255,255,255,0.16)", fontFamily: "Marcellus, serif" }}>{m.naipe}</span>
              <span style={{ position: "absolute", left: 16, bottom: 12, color: "#FFF",
                fontSize: 16, fontWeight: 700, opacity: 0.9 }}>📷 Foto da noite</span>
            </div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55 }}>{m.texto}</p>
              <p style={{ margin: "10px 0 0", fontSize: 16, color: th.suave }}>
                {byId(m.autor).apelido} · {dataBr(m.data)}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ════════════════ Seletor de estilo ════════════════ */
function ThemeSelector({ temaId, setTemaId, setToast }) {
  const th = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Object.values(THEMES).map((t) => {
        const on = temaId === t.id;
        return (
          <button key={t.id} onClick={() => { setTemaId(t.id); setToast(`Estilo ${t.nome} aplicado ✓`); }}
            className="press hoverable" aria-pressed={on} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", minHeight: 76,
              borderRadius: th.radius, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              background: on ? th.chipBg : th.card,
              border: `2px solid ${on ? th.accent : th.linha}`, color: th.tinta }}>
            <span aria-hidden="true" style={{
              width: 56, height: 56, borderRadius: 14, flex: "none", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 24,
              fontFamily: t.fontDisplay, fontWeight: t.displayWeight,
              background: t.pageBg, color: t.id === "tranca" ? "#F2E9D8" : t.tinta,
              border: `1px solid ${th.linha}` }}>Aa</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 19, fontWeight: 800 }}>
                {on ? "✓ " : ""}{t.nome}
              </span>
              <span style={{ display: "block", fontSize: 16, color: th.suave }}>{t.descricao}</span>
            </span>
            <span aria-hidden="true" style={{ display: "flex", gap: 4 }}>
              {t.paleta.map((c) => (
                <span key={c} style={{ width: 16, height: 16, borderRadius: "50%", background: c,
                  border: "1px solid rgba(0,0,0,0.12)" }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════ Ajustes ════════════════ */
function Config({ feltro, setFeltro, temaId, setTemaId, pendentes, setPendentes, players,
  currentPlayer, isHost, isAdmin, updatePlayerPapel, deletePlayer, aprovarPendente, criarJogador, go, setToast }) {
  const th = useTheme();
  const { user, signOut } = useAuth();
  const [delPlayer, setDelPlayer] = useState(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoApelido, setNovoApelido] = useState("");
  const currentUserId = currentPlayer?.id || null;
  const addInput = { width: "100%", minHeight: 52, borderRadius: 12, border: `2px solid ${th.linha}`,
    fontSize: 18, padding: "0 14px", background: th.inputBg, color: th.tinta, fontFamily: "inherit", outline: "none" };

  const PAPEIS = [
    { id: "convidado",     label: "Convidado",  cor: th.suave },
    { id: "administrador", label: "Admin",       cor: th.ok },
    { id: "anfitriao",     label: "Anfitrião",   cor: th.accent },
  ];

  const Titulo = ({ children }) => (
    <p style={{ fontSize: 19, fontWeight: 800, margin: "24px 0 10px", color: th.pageText }}>{children}</p>
  );

  return (
    <div>
      <Header title="Ajustes" onBack={() => go("home")} />

      {/* ── Meu perfil / conta ── */}
      <p style={{ fontSize: 19, fontWeight: 800, margin: "4px 0 6px", color: th.pageText }}>Meu perfil</p>
      {user && currentPlayer ? (
        <Card pad={16} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar p={currentPlayer} size={46} ring={th.accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{currentPlayer.apelido}</p>
            <p style={{ margin: 0, fontSize: 15, color: th.suave, overflow: "hidden", textOverflow: "ellipsis" }}>
              {(PAPEIS.find((x) => x.id === currentPlayer.papel) || {}).label || "Convidado"} · {user.email}
            </p>
          </div>
          <button onClick={() => signOut()} className="press" style={{ minHeight: 48, padding: "0 16px",
            borderRadius: 12, border: `1.5px solid ${th.linha}`, background: th.card, color: th.danger,
            fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flex: "none" }}>Sair</button>
        </Card>
      ) : (
        <Card pad={18}>
          <p style={{ margin: "0 0 12px", fontSize: 18, color: th.suave, lineHeight: 1.45 }}>
            Você está só de visita: dá para ver tudo, mas para registrar partidas e momentos é preciso entrar.
          </p>
          <Btn kind="ok" onClick={() => go("login")}>Entrar com meu e-mail</Btn>
        </Card>
      )}

      {/* ── Jogadores e perfis — só anfitrião ── */}
      {isHost && (
        <>
          <Titulo>Jogadores e perfis</Titulo>
          <p style={{ fontSize: 17, color: th.pageSub, margin: "0 0 12px" }}>
            Como anfitrião, você define o perfil de cada jogador e pode remover quem não joga mais.
          </p>
          <Card pad={16} style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800 }}>Adicionar jogador</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome (ex: João Silva)" style={addInput} />
              <input value={novoApelido} onChange={(e) => setNovoApelido(e.target.value)}
                placeholder="Apelido (no placar)" style={addInput} />
              <Btn kind="ok" style={{ minHeight: 52, fontSize: 17 }}
                disabled={!novoNome.trim() || !novoApelido.trim()}
                onClick={() => { criarJogador(novoNome.trim(), novoApelido.trim()); setNovoNome(""); setNovoApelido(""); }}>
                Adicionar ao grupo
              </Btn>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 15, color: th.suave, lineHeight: 1.4 }}>
              Entra como convidado. Quando essa pessoa fizer login, é só escolher o próprio nome na tela “Quem é você?”.
            </p>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {players.map((p) => {
              const papelAtual = p.papel || "convidado";
              return (
                <Card key={p.id} pad={14}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Avatar p={p} size={40} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{p.apelido}</p>
                      <p style={{ margin: 0, fontSize: 15, color: th.suave }}>{p.nome}</p>
                    </div>
                    {p.id !== currentUserId && (
                      <button onClick={() => setDelPlayer(p.id)} className="press"
                        aria-label={`Remover ${p.apelido}`}
                        style={{ width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${th.linha}`,
                          background: th.card, color: th.danger, fontSize: 17, cursor: "pointer",
                          fontFamily: "inherit" }}>🗑</button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {PAPEIS.map((pp) => (
                      <button key={pp.id} onClick={() => updatePlayerPapel(p.id, pp.id)} className="press"
                        style={{ flex: 1, minHeight: 38, borderRadius: 10, fontSize: 14, fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit",
                          border: `2px solid ${papelAtual === pp.id ? pp.cor : th.linha}`,
                          background: papelAtual === pp.id ? th.chipBg : th.card,
                          color: papelAtual === pp.id ? pp.cor : th.suave }}>
                        {pp.label}
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Pedidos para entrar — admin e anfitrião ── */}
      {isAdmin && (
        <>
          <Titulo>Pedidos para entrar no grupo</Titulo>
          {pendentes.length === 0 ? (
            <Card pad={18}><p style={{ margin: 0, fontSize: 18, color: th.suave }}>
              Nenhum pedido no momento. Convide pelo link do WhatsApp — quem entrar aparece aqui para você aprovar.
            </p></Card>
          ) : pendentes.map((p) => (
            <Card key={p.id} pad={16} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar p={p} size={46} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{p.apelido}</p>
                <p style={{ margin: 0, fontSize: 16, color: th.suave }}>{p.nome} · quer entrar</p>
              </div>
              <button className="press" aria-label={`Aprovar ${p.apelido}`} onClick={() => aprovarPendente(p)}
                style={{ minWidth: 56, minHeight: 56, borderRadius: 14, border: "none", cursor: "pointer",
                background: th.ok, color: "#FFF", fontSize: 22, fontFamily: "inherit" }}>✓</button>
              <button className="press" aria-label={`Recusar ${p.apelido}`} onClick={() => {
                setPendentes((ps) => ps.filter((x) => x.id !== p.id));
                setToast("Pedido recusado");
              }} style={{ minWidth: 56, minHeight: 56, borderRadius: 14, cursor: "pointer",
                border: `1.5px solid ${th.linha}`, background: th.card, color: th.danger,
                fontSize: 22, fontFamily: "inherit" }}>✕</button>
            </Card>
          ))}
        </>
      )}

      <Titulo>Estilo do aplicativo</Titulo>
      <p style={{ fontSize: 17, color: th.pageSub, margin: "0 0 12px", lineHeight: 1.45 }}>
        Escolha como o app aparece para você. A escolha fica guardada no seu celular.
      </p>
      <ThemeSelector temaId={temaId} setTemaId={setTemaId} setToast={setToast} />

      <Titulo>Fundo do grupo</Titulo>
      <p style={{ fontSize: 17, color: th.pageSub, margin: "0 0 12px" }}>
        A cor da mesa do grupo aparece na capa e no placar, em qualquer estilo. No app final, dá para usar uma foto sua.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Object.entries(FELTROS).map(([k, f]) => (
          <button key={k} onClick={() => { setFeltro(k); setToast("Fundo trocado ✓"); }} className="press hoverable"
            style={{ height: 76, borderRadius: th.radius, cursor: "pointer", color: "#FFF", fontSize: 17,
              fontWeight: 700, fontFamily: "inherit",
              background: `linear-gradient(150deg, ${f.cor}, ${f.escuro})`,
              border: feltro === k ? `3px solid ${th.accent}` : "3px solid transparent" }}>
            {feltro === k ? "✓ " : ""}{f.nome}
          </button>
        ))}
      </div>

      <Titulo>Convite</Titulo>
      <Card pad={18}>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5 }}>
          Código do grupo: <strong style={{ fontSize: 22, letterSpacing: "0.2em" }}>TRCA</strong>
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 16, color: th.suave, lineHeight: 1.45 }}>
          Compartilhe o link abaixo. O convidado preenche nome e apelido, e o pedido aparece aqui para você aprovar.
        </p>
        <div style={{ marginTop: 12 }}>
          <Btn kind="ghost" onClick={() => {
            const url = window.location.origin + "?join=TRCA";
            if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
            setToast("Link copiado ✓");
          }}>Copiar link de convite</Btn>
        </div>
      </Card>

      <Confirm open={!!delPlayer} titulo="Remover jogador?"
        texto="O jogador sai do grupo. O histórico de partidas com ele permanece."
        acao="Sim, remover"
        onYes={() => { deletePlayer(delPlayer); setDelPlayer(null); setToast("Jogador removido"); }}
        onNo={() => setDelPlayer(null)} />
    </div>
  );
}

/* ════════════════ Registro (acesso via link de convite ?join=TRCA) ════════════════ */
function Registro({ go, setPendentes, setToast }) {
  const th = useTheme();
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [enviado, setEnviado] = useState(false);

  const Input = ({ label, value, onChange, placeholder }) => (
    <div>
      <label style={{ display: "block", fontSize: 17, fontWeight: 700, marginBottom: 6, color: th.pageText }}>
        {label}
      </label>
      <input value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: "100%", minHeight: 56, borderRadius: 14, border: `2px solid ${th.linha}`,
          fontSize: 19, padding: "0 16px", background: th.inputBg, color: th.tinta,
          fontFamily: "inherit", outline: "none" }} />
    </div>
  );

  if (enviado) {
    return (
      <div style={{ textAlign: "center", paddingTop: 60 }}>
        <span style={{ fontSize: 64 }} aria-hidden="true">✅</span>
        <h1 style={{ fontFamily: th.fontDisplay, fontWeight: th.displayWeight, fontSize: 30,
          margin: "16px 0 8px", color: th.pageText }}>Pedido enviado!</h1>
        <p style={{ fontSize: 18, color: th.pageSub, margin: "0 0 32px", lineHeight: 1.55 }}>
          O anfitrião vai aprovar sua entrada em breve. Você já pode explorar o app enquanto aguarda.
        </p>
        <Btn kind="ghost" onClick={() => go("home")}>Ir para o app</Btn>
      </div>
    );
  }

  return (
    <div>
      <Header title="Entrar no grupo" />
      <p style={{ fontSize: 18, color: th.pageSub, margin: "0 0 24px", lineHeight: 1.5 }}>
        Preencha seus dados para pedir entrada no{" "}
        <strong style={{ color: th.pageText }}>Cassino do Riva</strong>.
        O anfitrião vai aprovar e você poderá jogar.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input label="Nome completo" value={nome}
          onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
        <Input label="Apelido (como vai aparecer no placar)" value={apelido}
          onChange={(e) => setApelido(e.target.value)} placeholder="Ex: Joãozinho" />
        <div style={{ marginTop: 8 }}>
          <Btn kind="ok" disabled={!nome.trim() || !apelido.trim()} onClick={() => {
            const req = { id: "p" + Date.now(), nome: nome.trim(), apelido: apelido.trim() };
            setPendentes((ps) => [...ps, req]);
            setEnviado(true);
            setToast("Pedido enviado ✓");
          }}>Solicitar entrada</Btn>
        </div>
      </div>
    </div>
  );
}

/* ════════════════ CSS global — módulos de tema ════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;600;700;800&family=Baloo+2:wght@600;700;800&family=Marcellus&family=Nunito:wght@400;600;700;800&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
button { transition: transform 140ms ease, box-shadow 200ms ease, opacity 140ms ease, border-color 140ms ease; }
.hoverable { transition: transform 160ms ease, box-shadow 200ms ease, border-color 160ms ease; }

/* frame responsivo: mobile → tablet → desktop */
.frame { max-width: 430px; }
@media (min-width: 768px)  { .frame { max-width: 520px; border-radius: 24px; min-height: 92vh; margin: 4vh 0; } }
@media (min-width: 1200px) { .frame { max-width: 560px; } }

/* ── Animações de entrada (uma por tema, mesma intenção) ── */
.anim-fade  { animation: aFade 320ms cubic-bezier(0.25,0.46,0.45,0.94); }
@keyframes aFade  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.anim-slide { animation: aSlide 420ms cubic-bezier(0.34,1.56,0.64,1); }
@keyframes aSlide { from { opacity: 0; transform: translateY(28px) scale(0.98); } to { opacity: 1; transform: none; } }
.anim-deal  { animation: aDeal 380ms cubic-bezier(0.25,0.46,0.45,0.94); }
@keyframes aDeal  { from { opacity: 0; transform: translateY(18px) rotate(-1.5deg) scale(0.985); } to { opacity: 1; transform: none; } }

/* ── Tema Sóbrio: microtransições discretas ── */
.t-sobrio .press:active { transform: scale(0.985); }
@media (hover: hover) {
  .t-sobrio .hoverable:hover { border-color: #CFC9BA; }
  .t-sobrio button.press:hover:not(:disabled) { opacity: 0.93; }
}
.t-sobrio button:focus-visible { outline: 3px solid #B08D3E; outline-offset: 2px; }

/* ── Tema Divertido: bounce e scale-up ── */
.t-divertido .press:active { transform: scale(0.94); }
.t-divertido .press, .t-divertido .hoverable { transition-timing-function: cubic-bezier(0.34,1.56,0.64,1); }
@media (hover: hover) {
  .t-divertido .hoverable:hover { transform: translateY(-2px) scale(1.02); }
  .t-divertido button.press:hover:not(:disabled) { transform: translateY(-2px) scale(1.03); }
  .t-divertido button.press:hover:active { transform: scale(0.94); }
}
.t-divertido button:focus-visible { outline: 3px solid #3E7BFA; outline-offset: 2px; }

/* ── Tema Mesa de Tranca: fichas, brilho e cartas ── */
.t-tranca .press:active { transform: scale(0.97); filter: brightness(1.07); }
@media (hover: hover) {
  .t-tranca .hoverable:hover,
  .t-tranca button.press:hover:not(:disabled) { box-shadow: 0 0 0 3px rgba(201,161,78,0.35); }
}
.t-tranca button:focus-visible { outline: 3px solid #E4C77E; outline-offset: 2px; }
.ficha::after {
  content: ""; position: absolute; inset: 5px; border-radius: inherit;
  border: 2px dashed rgba(255,255,255,0.45); pointer-events: none;
}
.t-tranca .placar { box-shadow: inset 0 0 0 1px rgba(201,161,78,0.35), 0 2px 10px rgba(0,0,0,0.25); }
.carta-flutua { animation: flutua 6s ease-in-out infinite; }
@keyframes flutua {
  0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
  50% { transform: translateY(-10px) rotate(var(--rot, 0deg)); }
}

/* ── Comuns ── */
.toast { animation: toastIn 240ms cubic-bezier(0.25,0.46,0.45,0.94); }
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
.trofeu { animation: trofeu 700ms cubic-bezier(0.34,1.56,0.64,1); display: inline-block; }
@keyframes trofeu { from { opacity: 0; transform: scale(0.4) rotate(-8deg); } to { opacity: 1; transform: scale(1) rotate(0); } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;
