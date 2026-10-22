# Faixas por ISRC · Spotify Web API

Página pública que consulta **10 ISRCs** informados por um produtor na Spotify Web API e mostra, **ordenados por título (A–Z)**:

| Requisito | Onde está |
|---|---|
| Thumb do álbum | `track-card` (capa 300px, `loading="lazy"`) |
| Data de lançamento | respeita a precisão do Spotify (`ano`, `mês` ou `dia`) |
| Título e lista de artistas | `track-card` |
| Duração em `mm:ss` | `shared/pipes/duration.pipe.ts` |
| Player com prévia | `audio-preview` (um único `<audio>` para a página) |
| Link para o Spotify | botão "Spotify" em cada faixa |
| Disponível no BR | selo verde/vermelho em cada faixa |
| Alerta se a integração cair | `app-alert` com botão "Tentar de novo" |

Nada é armazenado: cada carregamento consulta o Spotify.

## Arquitetura

```
.
├── api/        BFF mínimo (Node 22 + Express) — guarda as credenciais do Spotify
└── frontend/   Angular 21 (LTS) — standalone, signals, zoneless, SCSS puro
```

**Por que um BFF?** A busca no Spotify exige um token do fluxo *Client Credentials*, que usa o **Client Secret**. Colocar o secret no Angular o expõe a qualquer visitante da página pública (ele fica no bundle). A API faz três coisas e nada mais: obtém o token (com cache até expirar), busca o ISRC e devolve só os campos que a tela usa.

```
Angular ──GET /api/tracks/:isrc──▶ API ──client credentials──▶ accounts.spotify.com
                                       └─GET /search?q=isrc:…&market=BR──▶ api.spotify.com
```

### Frontend (vertical slice)

```
src/app/
├── features/tracks/          # tudo da funcionalidade "faixas" fica junto
│   ├── components/           # track-card, audio-preview, track-skeleton
│   ├── models/               # Track, SortDirection
│   ├── pages/tracks-page/    # orquestra estado: loading | ready | error
│   ├── services/             # TrackApiService (HTTP), AudioPreviewService
│   └── utils/                # lista de ISRCs, ordenação, formatação de data
└── shared/                   # reutilizável entre features
    ├── components/alert/
    ├── icons/
    ├── pipes/duration.pipe.ts
    └── utils/view-transition.ts
```

### API

```
api/src/
├── spotify/   token.service.js, spotify.client.js, spotify-error.js
├── tracks/    track.service.js (regra do BR), track.mapper.js, track.routes.js
├── app.js     monta o Express (testável sem subir servidor)
└── server.js  composição das dependências
```

Endpoints: `GET /api/tracks/:isrc` → `200` faixa · `400` ISRC inválido · `404` não encontrada · `503` Spotify indisponível. `GET /api/health`.

## Como rodar

Pré-requisitos: **Node 22+** e um app no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

```bash
# 1) API
cd api
cp .env.example .env        # preencha SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET
npm install
npm start                   # http://localhost:3000

# 2) Frontend (outro terminal)
cd frontend
npm install
npm start                   # http://localhost:4200 (proxy /api → :3000)
```

> Os dois projetos têm `.npmrc` com `legacy-peer-deps=true` para contornar um bug do npm 10.9 na resolução de peers do Vitest 4.

## Testes

```bash
cd api && npm test          # unitários (token, regra BR) + integração HTTP com supertest
cd frontend && npm test     # unitários (pipe, ordenação, datas) + integração (página + HTTP simulado)
```

Nos testes de integração só a borda externa é simulada (o `fetch` para o Spotify na API; o backend via `HttpTestingController` no Angular). O resto roda de verdade.

## Decisões técnicas e limitações da API do Spotify

Durante o desenvolvimento, o enunciado esbarrou em mudanças recentes da Spotify Web API. Registro aqui o que encontrei e o que decidi:

1. **`available_markets` foi removido em Development Mode** ([guia de migração de fev/2026](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)).
   **Decisão:** buscar com `market=BR`. Se a faixa vem com `is_playable !== false`, ela está disponível no BR. Se não vem, busco sem mercado: se existir, está **indisponível no BR**; se não, é **não encontrada**.
2. **`preview_url` vem `null` para apps criados após nov/2024** (descontinuação anunciada pelo Spotify).
   **Decisão:** o player está implementado e funciona quando há URL. Quando não há, o botão fica desabilitado com uma explicação, e a página mostra um aviso apontando para o link do Spotify.
3. **Endpoint em lote `GET /tracks` não existe mais em Development Mode, e a busca tem limite menor.**
   **Decisão:** uma busca `q=isrc:XXX` por ISRC, disparadas em paralelo pelo frontend (`forkJoin`).
4. **Development Mode exige Spotify Premium do dono do app.** Sem isso a API responde erro, e a página mostra o alerta de integração indisponível.
5. **ISRC inexistente ≠ integração fora.** Um `404` aparece como aviso com os ISRCs não encontrados. Qualquer outro erro mostra o alerta de indisponibilidade com "Tentar de novo".

Com *Extended Quota Mode*, os itens 1 e 3 deixam de valer, e daria para voltar a usar `available_markets` e o endpoint em lote.

## Interface

- Visual familiar de app de música: tema escuro, capas em destaque, selo de disponibilidade.
- **Responsiva:** grade de cards no desktop/tablet e lista compacta no celular.
- **Transições:** entrada em cascata dos cards, reordenação A–Z/Z–A animada com a *View Transitions API* (com fallback quando não há suporte) e barra de progresso da prévia. Tudo é desligado com `prefers-reduced-motion`.
- Acessibilidade: `lang="pt-BR"`, foco visível, `aria-label` nos controles, alerta com `role="alert"`.
