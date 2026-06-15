# ADR 0001 — Vínculo usuário (login) ↔ jogador, papéis e persistência

- **Status:** Aceito
- **Data:** 2026-06-15
- **Contexto do app:** Tranca Online ("Cassino do Riva") — público 50+, grupo de amigos.

## Contexto

O app migrou de `localStorage` para Supabase. A leitura (ranking, histórico,
momentos) é pública; a escrita (registrar partida, jogador, momento) exige
login via **Supabase Auth (Magic Link)**.

Surgiram três decisões de modelagem que o schema-resumo original não cobria.

## Decisão 1 — Vínculo conta de login ↔ jogador

Uma conta do Supabase Auth (e-mail) não é a mesma coisa que um "jogador" do
grupo (que tem apelido, papel e histórico). Eles podem existir de forma
independente: há jogadores antigos sem conta, e uma conta nova precisa dizer
"qual jogador eu sou".

**Escolha:** coluna `jogadores.auth_user_id uuid unique references auth.users(id) on delete set null`.

- `unique`: cada conta mapeia para no máximo um jogador.
- `on delete set null`: se a conta for apagada, o jogador (e seu histórico)
  permanece, apenas "desvinculado".
- No **primeiro login**, se o e-mail ainda não está vinculado a nenhum
  jogador, mostramos a tela **"Quem é você?"**: lista os jogadores existentes
  para a pessoa **reivindicar o seu** (seta `auth_user_id`), ou **criar um novo**.
- Se o banco estiver vazio, o primeiro jogador criado vira `anfitriao`
  (alguém precisa poder administrar).

### Por que não usar `auth.users` direto como "jogador"?
Jogadores têm apelido, papel e aparecem no ranking/duplas mesmo sem nunca terem
logado. Acoplar identidade de jogo à conta de e-mail quebraria o histórico e
impediria cadastrar quem não tem (ou não quer) conta.

## Decisão 2 — Papel real no banco + RLS por papel

`jogadores.papel in ('convidado','administrador','anfitriao')`. As permissões
são aplicadas no banco (não só na UI) via RLS, usando a função
`public.meu_papel()` (`security definer`, `search_path = ''`, `execute` revogado
do `anon`):

- **jogadores**: insert livre p/ autenticado; update própria conta OU reivindicar
  jogador sem dono OU anfitrião gerencia qualquer um; delete só anfitrião.
- **partidas**: insert livre p/ autenticado; delete só anfitrião.
- **momentos**: insert livre p/ autenticado.
- **campeonatos / jogos_ao_vivo**: insert/update/delete p/ autenticado (quem
  organiza a noite mexe no estado ao vivo).

> Os WARNs "RLS Policy Always True" do linter nos `insert`/estado-ao-vivo são
> intencionais: é um grupo de confiança e qualquer membro logado pode jogar.

## Decisão 3 — Persistência completa (nada só no cliente)

- `partidas` guarda **jogos finalizados** (com `meta`, `rodadas_a/b`, `match_id`,
  `campeonato_id`) → alimenta histórico, detalhe rodada-a-rodada e as views de
  ranking.
- `jogos_ao_vivo` guarda o placar **em andamento** (fora do ranking); ao
  terminar, vira `partidas` e a linha ao vivo é apagada.
- `campeonatos` guarda o chaveamento da noite (`duplas`/`matches` em `jsonb`).

## Fora de escopo (decisões registradas)

- **Jogadores pendentes** (pedidos de entrada): seguem em `localStorage` por
  enquanto, sem tabela no banco — decisão explícita desta fase.
- **Realtime / sincronização ao vivo entre aparelhos**: não incluída. O estado
  persiste e sobrevive a recarregar, mas não há push em tempo real (follow-up).

## UX do Magic Link (50+)

- Login por e-mail (sem senha). Após enviar: tela **"Enviamos um link para seu
  e-mail. Abra no mesmo celular e toque no link."**
- Abrir o link em **outro aparelho** ou link expirado → mensagem amigável
  ("peça um novo link"), nunca erro técnico.
- Leitura funciona sem login; ao tentar escrever sem login, convite gentil para
  entrar — nunca um erro.

## Consequências

- Mutações do app passam a ser assíncronas (Supabase) com carga inicial no boot.
- Permissões ficam consistentes entre UI e banco.
- O schema completo está em [`schema.sql`](../../schema.sql).
