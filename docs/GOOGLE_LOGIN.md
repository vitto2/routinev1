# Login com Google

O botão "Continuar com o Google" só aparece quando `NEXT_PUBLIC_GOOGLE_AUTH=true`.
Sem essa variável, o app continua com email e senha, exatamente como antes.

## 1. Google Cloud (credencial OAuth)

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) e escolha (ou crie) um projeto.
2. **APIs e serviços > Tela de consentimento OAuth**: tipo *Externo*, preencha nome do app e seu email.
   Escopos necessários: `email`, `profile`, `openid` (são os padrão).
3. **APIs e serviços > Credenciais > Criar credenciais > ID do cliente OAuth** (tipo *Aplicativo da Web*).
4. Em **URIs de redirecionamento autorizados**, adicione exatamente:

   ```
   https://SEU-PROJETO.supabase.co/auth/v1/callback
   ```

   (o `SEU-PROJETO` é o código do seu projeto Supabase, o mesmo que aparece na URL dele).
5. Copie o **ID do cliente** e a **Chave secreta do cliente**.

## 2. Supabase

1. **Authentication > Sign In / Providers > Google**: ative e cole o ID do cliente e a chave secreta.
2. **Authentication > URL Configuration**:
   - **Site URL**: `https://SEU-APP.vercel.app`
   - **Redirect URLs**: adicione `https://SEU-APP.vercel.app/auth/callback` e, para testar localmente,
     `http://localhost:3000/auth/callback`.

## 3. Vercel

Em **Settings > Environment Variables**, crie `NEXT_PUBLIC_GOOGLE_AUTH` com o valor `true` e faça um **Redeploy**
(variáveis `NEXT_PUBLIC_*` entram no build).

## Como funciona

1. O botão chama `supabase.auth.signInWithOAuth({ provider: "google" })` com retorno em `/auth/callback`.
2. O Google devolve ao Supabase, que redireciona para `/auth/callback?code=...` (fluxo PKCE).
3. A rota troca o código por uma sessão em cookies e envia o usuário para `/today`.
4. O destino (`next`) só aceita caminhos do próprio app: `//site.com`, `https://...` e similares são ignorados.
5. O perfil é criado pela mesma trigger do cadastro por email; o nome vem do Google (migration `0004`).
   O fuso horário é acertado no onboarding ou em **Perfil > Fuso horário**.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Google mostra `redirect_uri_mismatch` | A URI no Google Cloud não é exatamente `https://SEU-PROJETO.supabase.co/auth/v1/callback` |
| Volta para o login com aviso de erro | `Redirect URLs` do Supabase sem `https://SEU-APP.vercel.app/auth/callback` |
| "Unsupported provider" ao clicar | Google não está ativado em Authentication > Providers |
| Botão não aparece | `NEXT_PUBLIC_GOOGLE_AUTH` ausente ou sem redeploy |
| Entra, mas o nome não aparece | Migration `0004` ainda não rodada (a trigger antiga ignora o nome do Google) |
