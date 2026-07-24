# SBAR Médico

PWA _local-first_ para **passagem de plantão (SBAR)** de médicos de enfermaria.
Mobile-first, offline e com os **dados 100% no aparelho** (IndexedDB) — sem nuvem,
sem servidor e sem IA externa. A geração do SBAR é determinística (estrutura +
montagem de texto); o app entrega **rascunhos para revisão** e não toma decisões
clínicas.

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

Vite • React • TypeScript • Tailwind v4 • Dexie (IndexedDB) • vite-plugin-pwa
