# SBAR Médico

PWA _local-first_ para **passagem de plantão (SBAR)** de médicos de enfermaria.
Mobile-first, offline e com os **dados 100% no aparelho** (IndexedDB). Monta o SBAR
de forma determinística a partir de campos e também traz um **gerador por IA
opcional**: cola-se o prontuário bruto e o Claude resume em SBAR — com anonimização
no navegador e a chave da API guardada só no servidor. O app entrega **rascunhos
para revisão** e não toma decisões clínicas.

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:5173
```

## Verificação

```bash
npm run test         # testes do motor SBAR (Vitest)
npm run typecheck    # checagem de tipos (TS strict)
npm run build        # build de produção (PWA) → dist/
```

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e faça `push` na branch **main**.
2. Em **Settings → Pages**, selecione **GitHub Actions** como origem.
3. O workflow em `.github/workflows/deploy.yml` builda e publica a cada push.

O `base: './'` já deixa o app funcionando no subcaminho do Pages. Os **dados do
paciente continuam só no celular** — o Pages hospeda apenas o código.

## Gerador de SBAR por IA — deploy na Vercel

A aba **"Gerar"** (texto/áudio/foto/PDF → SBAR) e o botão **"Importar prontuário"**
chamam funções serverless (`api/generate.ts`, `api/transcribe.ts`, `api/sbar.ts`) que
falam com o Claude/Groq usando as **chaves guardadas no servidor**. Isso precisa da
Vercel — o GitHub Pages é estático e não roda funções.

1. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório `sbarmedico`.
2. Framework detectado: **Vite** (deixe o padrão; a pasta `api/` vira função automaticamente).
3. **Environment Variables** → adicione:
   - `ANTHROPIC_API_KEY` = sua chave `sk-ant-…` (geração do SBAR).
   - `GROQ_API_KEY` = sua chave `gsk_…` (transcrição de áudio da aba Gerar; grátis em console.groq.com).
   - Opcional: `SBAR_MODEL=claude-sonnet-5` para menor custo/latência (padrão: `claude-opus-4-8`).
4. **Deploy**. A URL da Vercel passa a ser o app **com IA** — use essa no celular.

**Privacidade:** os dados dos pacientes continuam no aparelho. Para o resumo por IA, o
texto (anonimizado no cliente) passa pelo Claude; a API não treina com esses dados.
Rodar `vercel dev` localmente também expõe `/api/sbar` para testes.

## Build single-file (offline puro, opcional)

```bash
npm run build:single   # → dist-single/index.html (um arquivo só)
```

Útil como cópia de resiliência: um único HTML que abre no celular sem internet.

## Ícones

Os PNGs em `public/` são gerados a partir de `public/icon.svg`. Em uma máquina com
`sharp` funcional (ex.: CI Linux): `npm run generate-icons`.

## Privacidade / LGPD

Nenhum dado de paciente sai do dispositivo. Backup manual em **Ajustes →
Exportar (JSON)**. Identificação padrão: **iniciais + leito** (nome completo é
opcional e desligado por padrão). Trava por PIN opcional (dissuasão).

## Stack

Vite • React • TypeScript • Tailwind v4 • Dexie (IndexedDB) • vite-plugin-pwa •
@anthropic-ai/sdk (função serverless na Vercel)
