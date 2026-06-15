import { supabase } from "./supabaseClient";

/* ════════════════ helpers ════════════════ */
const sum = (arr) => (arr || []).reduce((s, n) => s + n, 0);
const ok = ({ data, error }) => { if (error) throw error; return data; };

// presentational (não vem do banco) — derivado por posição
const TONS = ["#1E4D38", "#5B2230", "#1A4750", "#33322E"];
const NAIPES = ["♠", "♥", "♦", "♣"];

/* ════════════════ mappers (linha do banco → forma do app) ════════════════ */
function partidaToGame(r) {
  return {
    id: r.id,
    date: r.data,
    meta: r.meta,
    status: "done",
    winner: r.dupla_vencedora === "A" ? 0 : 1,
    matchId: r.match_id || null,
    campeonatoId: r.campeonato_id || null,
    modo: r.modo || "normal",
    teams: [
      { players: r.dupla_a, rounds: r.rodadas_a || [], total: r.pontos_dupla_a },
      { players: r.dupla_b, rounds: r.rodadas_b || [], total: r.pontos_dupla_b },
    ],
  };
}
function liveToGame(r) {
  return {
    id: r.id,
    date: r.data,
    meta: r.meta,
    status: "live",
    winner: null,
    matchId: r.match_id || null,
    campeonatoId: r.campeonato_id || null,
    modo: r.modo || "normal",
    teams: [
      { players: r.dupla_a, rounds: r.rodadas_a || [], total: sum(r.rodadas_a) },
      { players: r.dupla_b, rounds: r.rodadas_b || [], total: sum(r.rodadas_b) },
    ],
  };
}
function momentoToApp(r, i) {
  return {
    id: r.id,
    autor: r.autor_id,
    data: (r.created_at || "").slice(0, 10),
    texto: r.legenda || "",
    foto_url: r.foto_url || null,
    tom: TONS[i % 4],
    naipe: NAIPES[i % 4],
  };
}

/* ════════════════ forma do app → linha do banco ════════════════ */
function gameToPartidaRow(g) {
  return {
    id: g.id, // mantém o mesmo id do jogo ao vivo (refs de campeonato continuam válidas)
    data: g.date,
    dupla_a: g.teams[0].players,
    dupla_b: g.teams[1].players,
    pontos_dupla_a: g.teams[0].total,
    pontos_dupla_b: g.teams[1].total,
    dupla_vencedora: g.winner === 0 ? "A" : "B",
    modo: g.campeonatoId ? "campeonato" : "normal",
    meta: g.meta,
    rodadas_a: g.teams[0].rounds,
    rodadas_b: g.teams[1].rounds,
    match_id: g.matchId || null,
    campeonato_id: g.campeonatoId || null,
  };
}
function gameToLiveRow(g) {
  return {
    id: g.id,
    data: g.date,
    meta: g.meta,
    dupla_a: g.teams[0].players,
    dupla_b: g.teams[1].players,
    rodadas_a: g.teams[0].rounds,
    rodadas_b: g.teams[1].rounds,
    modo: g.campeonatoId ? "campeonato" : "normal",
    campeonato_id: g.campeonatoId || null,
    match_id: g.matchId || null,
  };
}

/* ════════════════ carga inicial ════════════════ */
export async function loadAll() {
  const [jogadores, partidas, vivos, momentos, champRows] = await Promise.all([
    supabase.from("jogadores").select("*").order("created_at", { ascending: true }).then(ok),
    supabase.from("partidas").select("*").order("data", { ascending: true }).then(ok),
    supabase.from("jogos_ao_vivo").select("*").order("created_at", { ascending: true }).then(ok),
    supabase.from("momentos").select("*").order("created_at", { ascending: false }).then(ok),
    supabase.from("campeonatos").select("*").eq("status", "live")
      .order("created_at", { ascending: false }).limit(1).then(ok),
  ]);

  const players = jogadores.map((j) => ({
    id: j.id, nome: j.nome, apelido: j.apelido || j.nome,
    papel: j.papel, auth_user_id: j.auth_user_id, foto_url: j.foto_url,
  }));
  const games = [...partidas.map(partidaToGame), ...vivos.map(liveToGame)];
  const moments = momentos.map(momentoToApp);
  const champ = champRows[0]
    ? { id: champRows[0].id, data: champRows[0].data, meta: champRows[0].meta,
        status: champRows[0].status, duplas: champRows[0].duplas, matches: champRows[0].matches }
    : null;

  return { players, games, momentos: moments, champ };
}

/* ════════════════ jogadores ════════════════ */
export const fetchJogadores = () =>
  supabase.from("jogadores").select("*").order("created_at", { ascending: true })
    .then(ok)
    .then((rows) => rows.map((j) => ({
      id: j.id, nome: j.nome, apelido: j.apelido || j.nome,
      papel: j.papel, auth_user_id: j.auth_user_id, foto_url: j.foto_url,
    })));

export const insertJogador = (j) =>
  supabase.from("jogadores").insert({
    nome: j.nome, apelido: j.apelido, papel: j.papel || "convidado",
    auth_user_id: j.auth_user_id || null,
  }).select().single().then(ok);

export const claimJogador = (id, authUserId) =>
  supabase.from("jogadores").update({ auth_user_id: authUserId })
    .eq("id", id).is("auth_user_id", null).select().single().then(ok);

export const updateJogadorPapel = (id, papel) =>
  supabase.from("jogadores").update({ papel }).eq("id", id).select().single().then(ok);

export const updateJogadorDados = (id, { nome, apelido }) =>
  supabase.from("jogadores").update({ nome, apelido }).eq("id", id).select().single().then(ok);

export const deleteJogador = (id) =>
  supabase.from("jogadores").delete().eq("id", id).then(ok);

/* ════════════════ partidas / jogos ao vivo ════════════════ */
export const insertLive = (g) =>
  supabase.from("jogos_ao_vivo").insert(gameToLiveRow(g)).select().single()
    .then(ok).then(liveToGame);

export const updateLiveRounds = (id, rodadas_a, rodadas_b) =>
  supabase.from("jogos_ao_vivo").update({ rodadas_a, rodadas_b }).eq("id", id).then(ok);

export const deleteLive = (id) =>
  supabase.from("jogos_ao_vivo").delete().eq("id", id).then(ok);

// Finaliza: grava em partidas (mesmo id) e remove o jogo ao vivo.
export async function commitPartida(g) {
  await supabase.from("partidas").insert(gameToPartidaRow(g)).then(ok);
  await deleteLive(g.id);
}

export const deletePartida = (id) =>
  supabase.from("partidas").delete().eq("id", id).then(ok);

/* ════════════════ momentos ════════════════ */
export const insertMomento = (m) =>
  supabase.from("momentos").insert({
    legenda: m.texto, autor_id: m.autor_id || null, partida_id: m.partida_id || null,
  }).select().single().then(ok);

/* ════════════════ campeonatos ════════════════ */
export const insertCampeonato = (c) =>
  supabase.from("campeonatos").insert({
    data: c.data, meta: c.meta, status: c.status || "live",
    duplas: c.duplas, matches: c.matches,
  }).select().single().then(ok);

export const updateCampeonato = (id, patch) =>
  supabase.from("campeonatos").update(patch).eq("id", id).then(ok);

export const deleteCampeonato = (id) =>
  supabase.from("campeonatos").delete().eq("id", id).then(ok);
