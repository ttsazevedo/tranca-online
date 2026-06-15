-- ============================================================
-- Tranca Online — schema do banco (Supabase / PostgreSQL 17)
-- ============================================================
-- Acesso: LEITURA PÚBLICA (qualquer um com o link vê ranking,
-- histórico e momentos) + ESCRITA SOMENTE AUTENTICADA (Supabase Auth),
-- com permissões reais por PAPEL (convidado / administrador / anfitrião).
--
-- Ordem pensada para rodar do zero (respeita as foreign keys).
-- ============================================================

-- ────────────────────────────────────────────────
-- Tabelas
-- ────────────────────────────────────────────────

-- Campeonatos (torneio da noite). Vem antes pois partidas/jogos referenciam.
create table campeonatos (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  meta integer not null default 1500,
  status text not null default 'live' check (status in ('live','done')),
  duplas jsonb not null,   -- [[uuid,uuid],[uuid,uuid],[uuid,uuid],[uuid,uuid]]
  matches jsonb not null,  -- [{id,fase,a,b,gameId,winner}, ...]
  created_at timestamptz default now()
);

-- Jogadores
create table jogadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  apelido text,
  foto_url text,
  papel text not null default 'convidado'
    check (papel in ('convidado','administrador','anfitriao')),
  -- Vínculo opcional com a conta de login (Supabase Auth). Único: cada
  -- conta mapeia para no máximo um jogador. Se a conta for apagada, o
  -- jogador permanece e fica apenas "desvinculado".
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Partidas (apenas jogos FINALIZADOS; sempre têm placar e vencedor).
-- Guarda o detalhe rodada-a-rodada para a tela de Detalhe.
create table partidas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  dupla_a uuid[] not null,
  dupla_b uuid[] not null,
  pontos_dupla_a integer not null,
  pontos_dupla_b integer not null,
  dupla_vencedora text not null check (dupla_vencedora in ('A','B')),
  modo text default 'normal' check (modo in ('normal','campeonato')),
  meta integer not null default 3000,
  rodadas_a integer[] not null default '{}',
  rodadas_b integer[] not null default '{}',
  match_id text,                       -- qual confronto do chaveamento (semi1/semi2/final)
  campeonato_id uuid references campeonatos(id) on delete set null,
  created_at timestamptz default now(),
  -- Cada dupla tem exatamente 2 jogadores (o app é sempre 2x2)
  constraint duplas_com_2_jogadores
    check (array_length(dupla_a, 1) = 2 and array_length(dupla_b, 1) = 2)
);

-- Jogos ao vivo (placar em andamento). NÃO entram no ranking; ao terminar,
-- o app insere em `partidas` e apaga a linha daqui.
create table jogos_ao_vivo (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  meta integer not null default 3000,
  dupla_a uuid[] not null,
  dupla_b uuid[] not null,
  rodadas_a integer[] not null default '{}',
  rodadas_b integer[] not null default '{}',
  modo text not null default 'normal' check (modo in ('normal','campeonato')),
  campeonato_id uuid references campeonatos(id) on delete cascade,
  match_id text,
  created_at timestamptz default now(),
  constraint duplas_vivo_2 check (array_length(dupla_a, 1) = 2 and array_length(dupla_b, 1) = 2)
);

-- Momentos (fotos + legendas)
create table momentos (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid references partidas(id) on delete cascade,
  foto_url text,
  legenda text,
  -- Se o autor for removido, o momento permanece (autor vira nulo)
  autor_id uuid references jogadores(id) on delete set null,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────
-- Sem RLS, qualquer pessoa com a chave pública (embutida no frontend)
-- poderia ler E escrever tudo. Habilitamos RLS em todas as tabelas.

alter table jogadores     enable row level security;
alter table partidas      enable row level security;
alter table momentos      enable row level security;
alter table campeonatos   enable row level security;
alter table jogos_ao_vivo enable row level security;

-- Função helper: papel do usuário logado (usada pelas policies).
-- security definer + search_path = '' (nomes qualificados) = seguro.
create or replace function public.meu_papel()
  returns text
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select papel from public.jogadores where auth_user_id = auth.uid() limit 1;
$$;

-- meu_papel() só roda dentro das policies (papel authenticated); fora do anon.
revoke execute on function public.meu_papel() from public;
grant execute on function public.meu_papel() to authenticated;

-- ── Leitura pública (vale para anon e autenticado) ──
create policy "leitura publica" on jogadores     for select using (true);
create policy "leitura publica" on partidas       for select using (true);
create policy "leitura publica" on momentos       for select using (true);
create policy "leitura publica" on campeonatos     for select using (true);
create policy "leitura publica" on jogos_ao_vivo  for select using (true);

-- ── Escrita: jogadores ──
-- Qualquer autenticado pode cadastrar jogador (aprovar pedido / criar o seu).
create policy "inserir autenticado" on jogadores for insert to authenticated with check (true);
-- (a) reivindicar um jogador "sem dono" no 1º login (tela "Quem é você?")
create policy "vincular jogador" on jogadores for update to authenticated
  using (auth_user_id is null)
  with check (auth_user_id = auth.uid());
-- (b) editar o próprio cadastro
create policy "editar proprio" on jogadores for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
-- (c) anfitrião gerencia qualquer jogador (papel, dados)
create policy "anfitriao atualiza" on jogadores for update to authenticated
  using (public.meu_papel() = 'anfitriao')
  with check (public.meu_papel() = 'anfitriao');
-- (d) só anfitrião remove jogador
create policy "anfitriao apaga" on jogadores for delete to authenticated
  using (public.meu_papel() = 'anfitriao');

-- ── Escrita: partidas (insert livre p/ autenticado; apagar só anfitrião) ──
create policy "inserir autenticado"     on partidas for insert to authenticated with check (true);
create policy "anfitriao apaga partida" on partidas for delete to authenticated
  using (public.meu_papel() = 'anfitriao');

-- ── Escrita: momentos (só insert no app de hoje) ──
create policy "inserir autenticado" on momentos for insert to authenticated with check (true);

-- ── Escrita: estado da noite (qualquer autenticado organiza) ──
create policy "inserir autenticado"   on campeonatos for insert to authenticated with check (true);
create policy "atualizar autenticado" on campeonatos for update to authenticated using (true) with check (true);
create policy "apagar autenticado"    on campeonatos for delete to authenticated using (true);

create policy "inserir autenticado"   on jogos_ao_vivo for insert to authenticated with check (true);
create policy "atualizar autenticado" on jogos_ao_vivo for update to authenticated using (true) with check (true);
create policy "apagar autenticado"    on jogos_ao_vivo for delete to authenticated using (true);

-- ────────────────────────────────────────────────
-- View: ranking individual (com aproveitamento %)
-- ────────────────────────────────────────────────
-- security_invoker = true → roda com as permissões de quem consulta,
-- respeitando o RLS das tabelas-base.
create or replace view ranking with (security_invoker = true) as
select
  j.id,
  j.nome,
  j.apelido,
  count(*) filter (
    where (p.dupla_vencedora = 'A' and j.id = any(p.dupla_a))
    or    (p.dupla_vencedora = 'B' and j.id = any(p.dupla_b))
  ) as vitorias,
  count(*) filter (
    where j.id = any(p.dupla_a) or j.id = any(p.dupla_b)
  ) as partidas,
  count(*) filter (
    where j.id = any(p.dupla_a) or j.id = any(p.dupla_b)
  ) - count(*) filter (
    where (p.dupla_vencedora = 'A' and j.id = any(p.dupla_a))
    or    (p.dupla_vencedora = 'B' and j.id = any(p.dupla_b))
  ) as derrotas,
  coalesce(
    round(
      100.0 * count(*) filter (
        where (p.dupla_vencedora = 'A' and j.id = any(p.dupla_a))
        or    (p.dupla_vencedora = 'B' and j.id = any(p.dupla_b))
      )
      / nullif(count(*) filter (
        where j.id = any(p.dupla_a) or j.id = any(p.dupla_b)
      ), 0)
    )::int,
    0
  ) as aproveitamento
from jogadores j
left join partidas p on j.id = any(p.dupla_a) or j.id = any(p.dupla_b)
group by j.id, j.nome, j.apelido;

-- ────────────────────────────────────────────────
-- View: ranking de duplas (par normalizado)
-- ────────────────────────────────────────────────
create or replace view ranking_duplas with (security_invoker = true) as
with confrontos as (
  select
    least(dupla_a[1], dupla_a[2])    as jogador_1,
    greatest(dupla_a[1], dupla_a[2]) as jogador_2,
    (dupla_vencedora = 'A')          as venceu
  from partidas
  union all
  select
    least(dupla_b[1], dupla_b[2]),
    greatest(dupla_b[1], dupla_b[2]),
    (dupla_vencedora = 'B')
  from partidas
),
agg as (
  select
    jogador_1,
    jogador_2,
    count(*) filter (where venceu)     as vitorias,
    count(*)                           as partidas,
    count(*) filter (where not venceu) as derrotas,
    coalesce(
      round(100.0 * count(*) filter (where venceu) / nullif(count(*), 0))::int,
      0
    ) as aproveitamento
  from confrontos
  group by jogador_1, jogador_2
)
select
  a.jogador_1,
  a.jogador_2,
  j1.nome    as nome_1,
  coalesce(j1.apelido, j1.nome) as apelido_1,
  j2.nome    as nome_2,
  coalesce(j2.apelido, j2.nome) as apelido_2,
  a.vitorias,
  a.partidas,
  a.derrotas,
  a.aproveitamento
from agg a
left join jogadores j1 on j1.id = a.jogador_1
left join jogadores j2 on j2.id = a.jogador_2;
