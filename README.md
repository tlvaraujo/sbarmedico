# SBAR Médico

PWA _mobile-first_ para **passagem de plantão (SBAR)** de médicos de enfermaria.
A médica envia o **prontuário bruto** (foto, galeria, arquivo ou texto colado) e o
Claude devolve um **rascunho de SBAR editável** — nunca inventa, usa só o que está no
prontuário, remove dados identificáveis e respeita os limites de cada seção. O
documento final vira **PDF**, gerado e guardado **100% no aparelho** (IndexedDB).

> O app entrega **rascunhos para revisão** — a médica confere e ajusta tudo antes de
> usar. Não toma decisões clínicas.

## Fluxo (3 telas)

1. **Entrada** — Leito → Identificação (só iniciais, aviso de LGPD) → Proporcionalidade
   terapêutica → Prontuário (câmera, galeria, arquivo `PDF/DOCX/TXT` ou colar texto,
   vários de uma vez). Botão **Gerar SBAR**.
2. **Revisar** — o rascunho S / B / A / R vem preenchido e **editável**, junto com
   leito/identificação/proporcionalidade. Botão **Gerar documento** (salva na Biblioteca).
3. **Biblioteca** (home) — lista dos SBARs (leito · iniciais · data/hora); **baixar PDF
   individual** ou **todos em um PDF (lote)**; excluir; **+ Novo SBAR**.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173 (UI; a geração precisa da função /api)
```

Para exercitar a geração de SBAR localmente é preciso rodar a função serverless com a
chave configurada:

```bash
npm i -g vercel
vercel dev         # sobe o app + /api/generate lendo o .env
```

## Verificação

```bash
npm run test         # Vitest (pdf, intake, anonimização)
npm run typecheck    # checagem de tipos (TS strict)
npm run build        # build de produção (PWA) → dist/
```

## Deploy na Vercel

A geração do SBAR usa uma função serverless (`api/generate.ts`) que fala com o Claude
usando a **chave guardada no servidor** — por isso o app roda na **Vercel** (um host
estático como o GitHub Pages não executa a função).

1. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório `sbarmedico`.
2. Framework detectado: **Vite** (deixe o padrão; a pasta `api/` vira função automaticamente).
3. **Environment Variables**:
   - `ANTHROPIC_API_KEY` = sua chave `sk-ant-…` (obrigatória).
   - Opcional: `SBAR_MODEL=claude-sonnet-5` para menor custo/latência (padrão: `claude-opus-4-8`).
4. **Deploy**. Use a URL da Vercel no celular e **instale** o app (Adicionar à tela inicial).

Cada `git push` na branch **main** dispara um novo deploy automático.

## Privacidade / LGPD

- **Identificação por iniciais.** A tela de entrada avisa para nunca digitar nome
  completo, CPF ou nº de prontuário. Textos colados/`.txt`/`.docx` ainda passam por uma
  anonimização automática (CPF, telefone, e-mail, CEP, cartão SUS, nº de registro) antes
  de irem para a IA; o modelo também é instruído a remover dados identificáveis.
- **Fotos e PDFs não são anonimizados no cliente** — a IA usa apenas iniciais no
  resultado, mas confira sempre o rascunho.
- **Os documentos ficam só neste aparelho** (IndexedDB). Não há nuvem nem conta. Use o
  **Download em lote** para guardar/transferir um backup em PDF.
- A API da Anthropic **não treina** com os dados enviados.

## Stack

Vite • React • TypeScript • Tailwind v4 • Dexie (IndexedDB) • vite-plugin-pwa •
jsPDF + mammoth (sob demanda) • @anthropic-ai/sdk (função serverless na Vercel)
