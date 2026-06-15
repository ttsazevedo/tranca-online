# ADR 0002 — Login só com e-mail, sem verificação (fase de teste)

- **Status:** Aceito (TEMPORÁRIO — fase de teste)
- **Data:** 2026-06-15
- **Substitui parcialmente:** o fluxo de Magic Link descrito no [ADR 0001](0001-vinculo-usuario-jogador.md).

## Contexto

O login por **Magic Link** (ADR 0001) virou uma trava para testar com o grupo:

- O e-mail embutido do Supabase tem **rate limit** baixo no plano free.
- Não há **domínio próprio de envio** configurado, então links para os amigos
  caíam em spam / não chegavam de forma confiável.

Queremos destravar o teste com a turma **agora**, mantendo o **e-mail como
identidade** da pessoa (e o vínculo `auth_user_id → jogador` que já existe).

## Decisão

Login **somente com e-mail**, sem senha visível e sem link de confirmação:

1. **Supabase Auth:** desligar **"Confirm email"** (Authentication → Sign In /
   Providers → Email). Manter "Allow new users to sign up" **ligado**.
2. **App:** a pessoa digita o e-mail e entra na hora. Internamente o app usa
   uma **senha determinística derivada do e-mail**
   (`SHA-256("tranca:v1:" + email)`), que é a mesma em qualquer aparelho e que
   o usuário **nunca vê nem digita**:
   - `signInWithPassword` (e-mail já cadastrado) →
   - se falhar, `signUp` (e-mail novo) — sem verificação, retorna sessão.
3. Primeiro acesso de um e-mail novo → tela **"Quem é você?"** (fluxo do ADR 0001).
4. Acessos seguintes com o mesmo e-mail → reconhece e entra direto.
5. Leitura (ranking, histórico, momentos) continua **sem login**.

### Por que senha determinística (e não aleatória armazenada)
Uma senha aleatória guardada localmente quebraria no **segundo aparelho** (sem
a senha guardada, o login falha). Derivando do e-mail, funciona em qualquer
lugar sem o usuário saber que existe uma senha.

## Consequências e RISCO (explícito)

- ⚠️ **Não há verificação de posse do e-mail.** Como a senha deriva do e-mail
  por um algoritmo público (roda no frontend), **qualquer pessoa que saiba um
  e-mail pode entrar como aquela pessoa.** Na prática, o login é uma
  **identidade declarada, sem prova** — aceitável só por ser um grupo pequeno e
  de confiança, em fase de teste.
- O que **continua protegendo**: o **RLS por papel** (escrita autenticada;
  apagar partida/jogador só anfitrião) e o vínculo `auth_user_id → jogador`
  seguem **intactos** — há uma sessão real do Supabase (role `authenticated`).
- **SMTP do Resend:** mantido como está; apenas não é mais usado para
  confirmação.

## Reversão obrigatória antes do público amplo

Antes de abrir para fora do grupo de confiança, **religar a verificação**:
- **Magic Link com domínio próprio** (SMTP do Resend com domínio verificado), ou
- **OTP por e-mail** com confirmação, ou senha real.

Ou seja: religar **"Confirm email"** e voltar o fluxo do app para um método
verificado. Esta decisão é **deliberadamente temporária** — registrada aqui
para não virar caixa-preta.
