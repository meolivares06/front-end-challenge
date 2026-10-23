# Faixas por ISRC · Spotify Web API

> 🧭 **Chegou agora?** Comece por [docs/ARQUITETURA.md](docs/ARQUITETURA.md): como o projeto está organizado e como criar uma feature.
>
> 📓 O passo a passo das decisões está em [docs/BITACORA.md](docs/BITACORA.md). O uso de IA no projeto está em [docs/GOVERNANCA-IA.md](docs/GOVERNANCA-IA.md).

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
│   ├── models/               # Track, SortDirection, Value Object Isrc (validação ISO 3901)
│   ├── pages/tracks-page/    # apresentação: lê o store e repassa ações
│   ├── services/             # TrackApiService (só requisições HTTP), AudioPreviewService
│   ├── ports/                # contratos: TRACKS_STORE e TRACKS_REPOSITORY (InjectionToken)
│   ├── store/                # TracksSignalStore (NgRx Signal Store): implementa TRACKS_STORE
│   └── tracks.providers.ts   # provideTracksFeature(): liga portas → implementações
│   └── utils/                # lista de ISRCs, ordenação, formatação de data
└── shared/                   # reutilizável entre features
    ├── components/alert/
    ├── icons/
    ├── pipes/duration.pipe.ts
    └── utils/view-transition.ts
```

Fluxo de dados (cada peça com uma responsabilidade):

```
TracksPageComponent ──inject(TRACKS_STORE)──▶ TracksSignalStore ──inject(TRACKS_REPOSITORY)──▶ TrackApiService ──HTTP──▶ API
                     (porta)                                       (porta)
```

- **TrackApiService:** só sabe fazer requisições e traduzir erros HTTP (`404` → não encontrada, resto → integração indisponível).
- **TracksSignalStore** (NgRx Signal Store): guarda o estado (`status`, faixas, ISRCs não encontrados, direção, origem dos dados), expõe signals somente leitura e as ações `load()` (via `rxMethod` + `switchMap`: um novo load cancela o anterior) e `toggleDirection()`.
- **Inversão de dependência:** a página injeta a porta `TRACKS_STORE` e o store injeta a porta `TRACKS_REPOSITORY`, ambas `InjectionToken`. Só `provideTracksFeature()` conhece as implementações. Ela é provida na página, então o estado vive e morre com a tela, e o ESLint impede importar implementações fora dela.
- **Componentes:** não conhecem HTTP nem a implementação do store; dependem só da porta.

Aliases no `tsconfig.json`: `@shared/*`, `@features/*` e `@testing/*` para imports entre fronteiras. Dentro da mesma feature os imports seguem relativos.

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

Pré-requisito: **Node 22+**. Para dados reais, também um app no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), com Premium na conta dona do app.

```bash
# 1) API
cd api
cp .env.example .env        # SPOTIFY_MODE=mock já vem configurado
npm install
npm start                   # http://localhost:3000

# 2) Frontend (outro terminal)
cd frontend
npm install
npm start                   # http://localhost:4200 (proxy /api → :3000)
```

### Modo mock (demonstração) e modo live

Enquanto a conta Premium não é configurada, a API roda em **modo mock**: responde no mesmo formato do Spotify com um catálogo **fictício** para os 10 ISRCs do contrato, e a página mostra o aviso *"Modo demonstração: dados fictícios"*.

| Variável (`api/.env`) | Valores | Efeito |
|---|---|---|
| `SPOTIFY_MODE` | `mock` \| `live` | Origem dos dados. Sem a variável: `live` se houver credenciais, `mock` caso contrário |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | credenciais do app | Obrigatórias em `live` |
| `SPOTIFY_MOCK_SCENARIO` | `ok` \| `down` | `down` simula o Spotify fora do ar (demonstra o alerta de integração indisponível) |
| `SPOTIFY_MOCK_LATENCY_MS` | número (padrão 400) | Latência simulada, para ver o carregamento |

Para usar o Spotify real: `SPOTIFY_MODE=live`, preencher as credenciais e reiniciar a API. **Nada muda no frontend.**

O catálogo do mock cobre de propósito todos os estados da tela: disponível no BR (com e sem prévia), `is_playable: false`, ausente no mercado BR, ISRC não encontrado e datas com precisão de ano ou mês. As capas (SVG) e as prévias de áudio (WAV) são geradas pela própria API.

> Os dois projetos têm `.npmrc` com `legacy-peer-deps=true` para contornar um bug do npm 10.9 na resolução de peers do Vitest 4.

## Qualidade e fronteiras de arquitetura

```bash
cd frontend
npm run lint                # ESLint (angular-eslint) + regras de fronteira entre camadas
npm run lint:boundaries     # prova: simula um import proibido por fronteira e exige o bloqueio
```

As camadas da feature só podem depender em um sentido (`pages/components → store → services → models/utils`), e `shared` não conhece features. Detalhes em [docs/BITACORA.md](docs/BITACORA.md#9-proteção-contra-violações-de-arquitetura).

TypeScript em modo estrito ampliado: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e `verbatimModuleSyntax`.

## Testes E2E

```bash
cd api && npm install           # a API precisa das dependências instaladas
cd frontend
npx playwright install chromium # uma vez
npm run e2e                     # sobe a API (mock) e o ng serve sozinho
npm run e2e:ui                  # modo interativo
```

São 9 cenários rodando em **desktop** e **mobile** (Pixel 7) contra o stack real: navegador → `ng serve` → API em modo mock. Só a queda da integração é simulada no navegador. Detalhes em [docs/BITACORA.md](docs/BITACORA.md#17-testes-e2e).

## Integração contínua

`.github/workflows/ci.yml` roda em cada PR:

- **frontend:** fronteiras de arquitetura, lint, testes com cobertura e build.
- **api:** testes com cobertura.
- **e2e:** Playwright em desktop e mobile, só depois que os dois anteriores passam.

Cada verificação é um passo separado, e os relatórios de cobertura ficam como artefatos. Detalhes em [docs/BITACORA.md](docs/BITACORA.md#12-integração-contínua-github-actions).

## Testes

```bash
cd api && npm test               # unitários (token, regra BR, mapper) + integração HTTP com supertest
cd frontend && npm test          # unitários (pipe, ordenação, datas, store) + integração (página + HTTP simulado)
npm run test:coverage            # em cada projeto: exige 90% por arquivo na lógica pura
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
