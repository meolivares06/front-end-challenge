# Bitácora de decisões

Registro cronológico de como o projeto foi construído: o contexto de cada etapa, a decisão tomada, o que foi descartado e como verificar. Serve de roteiro para apresentar a solução.

| # | Sessão | Commits |
|---|---|---|
| 1 | [Leitura do desafio e impedimentos](#1-leitura-do-desafio-e-impedimentos) | — |
| 2 | [Configuração inicial](#2-configuração-inicial) | `99fd442` `dd0ea93` |
| 3 | [API intermediária (BFF)](#3-api-intermediária-bff) | `9eb8a06` `3eca6ad` |
| 4 | [Feature de faixas e interface](#4-feature-de-faixas-e-interface) | `4a880af` `327e3e8` `4111dee` `e69121e` |
| 5 | [Aliases de import](#5-aliases-de-import) | `ed974ef` |
| 6 | [Store: separação de responsabilidades](#6-store-separação-de-responsabilidades) | `ce573de` |
| 7 | [TypeScript estrito](#7-typescript-estrito) | `b444ce3` |
| 8 | [Imutabilidade e regra de negócio pura](#8-imutabilidade-e-regra-de-negócio-pura) | `0d9f0dd` |
| 9 | [Proteção contra violações de arquitetura](#9-proteção-contra-violações-de-arquitetura) | `7e16657` |

---

## 1. Leitura do desafio e impedimentos

**Contexto.** O enunciado pede vários dados por faixa, entre eles a prévia de áudio e a disponibilidade no Brasil, numa página pública. Antes de codar, conferi a documentação atual da Spotify Web API.

**Impedimentos encontrados**

| Impedimento | Fonte | Impacto |
|---|---|---|
| `available_markets` removido em Development Mode (fev/2026) | [Guia de migração](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) | Não dá para ler a lista de países da faixa |
| `preview_url` nulo para apps criados após nov/2024 | Comunicado do Spotify | O player pode não ter o que tocar |
| Endpoint em lote `GET /tracks` removido em Dev Mode | Guia de migração | Uma busca por ISRC |
| Dev Mode exige Premium do dono do app | Guia de migração | Sem Premium, a integração fica indisponível |
| Client Secret não pode ir para um frontend público | Fluxo Client Credentials | É preciso um intermediário |

**Decisão.** Não travar no impedimento: resolver o que é técnico, degradar com elegância o que depende do Spotify e **documentar tudo** (README e PR).

---

## 2. Configuração inicial

**Decisões**

- **Monorepo simples** com `api/` e `frontend/`, sem workspaces nem `libs/`. São duas aplicações pequenas, e ferramentas de monorepo seriam sobreengenharia.
- **Angular 21**, a versão LTS ativa. A 22 é `latest`, mas não LTS, e o enunciado pede LTS.
- **Standalone + signals + zoneless**, os padrões atuais do Angular, com menos código e detecção de mudanças previsível.
- **SCSS puro, sem biblioteca de componentes.** O design é autoral e o bundle fica leve (~55 kB transferidos).
- **Fontes empacotadas** (`@fontsource`) em vez do Google Fonts: o build não depende de rede e não envia dados de visitantes a terceiros.
- **Proxy do dev server** (`proxy.conf.json`): `/api` → `localhost:3000`, sem CORS.
- **`.npmrc` com `legacy-peer-deps=true`** contorna um bug do npm 10.9 (`Cannot read properties of null (reading 'edgesOut')`) ao resolver os peers do Vitest 4.
- **Fluxo de git:** branch `feat/isrc-tracks` e commits atômicos em [Conventional Commits](https://www.conventionalcommits.org/).

**Descartado:** Angular Material, porque deixaria o visual genérico, e Nx/pnpm workspaces, por ser desproporcional ao escopo.

---

## 3. API intermediária (BFF)

**Contexto.** O token do Spotify exige o Client Secret.

**Decisão.** Um BFF mínimo em Express com três responsabilidades, cada uma em seu módulo:

```
spotify/token.service.js    obtém o token e o reaproveita até expirar (margem de 60 s)
spotify/spotify.client.js   busca por ISRC (q=isrc:XXX, market opcional)
tracks/track.service.js     regra: busca no BR; se não vier, busca sem mercado
tracks/track.mapper.js      devolve só os campos que a tela usa
tracks/track.routes.js      HTTP: 200 / 400 ISRC inválido / 404 / 503 Spotify fora
```

- **Injeção de dependências por fábrica** (`createTokenService(config, fetchFn)`): nos testes troca-se só o `fetch`, sem bibliotecas de mock.
- **`app.js` separado de `server.js`**: o app é testado com supertest sem abrir porta.
- **Disponibilidade no BR:** a busca com `market=BR` devolve `is_playable`, que substitui `available_markets`.

**Verificar:** `cd api && npm test`.

---

## 4. Feature de faixas e interface

**Decisões de produto**

- Ordenação alfabética com `Intl.Collator('pt-BR')`, que ignora acentos e caixa ("Água" vem antes de "Bloco").
- Duração `mm:ss` em um pipe (`shared/pipes/duration.pipe.ts`).
- A data respeita a precisão do Spotify (ano, mês ou dia).
- **Dois tipos de falha, tratados de forma diferente:**
  - ISRC inexistente (404) gera um aviso informativo com a lista dos ISRCs, e a página segue.
  - Qualquer outra falha mostra o **alerta de integração indisponível** com "Tentar de novo", como pede o enunciado.
- Sem `preview_url`, o botão fica desabilitado com explicação, e a página mostra um aviso.
- Um único `<audio>` para a página: tocar uma prévia pausa a anterior.

**Decisões de interface.** Visual familiar ao público de apps de música: tema escuro e capas em destaque. É uma grade no desktop e uma lista compacta no celular.

| Movimento | Técnica | Por quê |
|---|---|---|
| Entrada dos cards em cascata | CSS `animation-delay` por índice | Dá ritmo ao carregamento |
| Reordenação A–Z ↔ Z–A | View Transitions API | Os cards deslizam até a nova posição, então a mudança é compreensível |
| Progresso da prévia | `transform: scaleX` | Barato para o navegador |
| Todos | `prefers-reduced-motion` | Acessibilidade |

**Verificar:** `cd frontend && npm test` e `npm start`.

---

## 5. Aliases de import

**Contexto.** Caminhos como `../../../../shared/pipes/duration.pipe` quebram ao mover arquivos e escondem a dependência.

**Decisão.** Aliases no `tsconfig.json`: `@shared/*`, `@features/*` e `@testing/*`.

**Regra.** Alias para **cruzar fronteiras**; caminho relativo **dentro da mesma feature**. Assim a feature se move ou se renomeia como uma unidade.

---

## 6. Store: separação de responsabilidades

**Contexto.** A página carregava os dados, guardava o estado e renderizava: três motivos para mudar.

**Decisão.**

```
TracksPageComponent ──▶ TracksStore ──▶ TrackApiService ──HTTP──▶ API
  apresentação           estado/ações     só requisições
```

| Princípio | Como aparece |
|---|---|
| **S**: responsabilidade única | API = requisições; Store = estado; Página = apresentação |
| **O**: aberto/fechado | Novos derivados (`computed`) entram no store sem tocar na página |
| **D**: inversão de dependência | A página depende do store (abstração da feature), não do HTTP |

- O estado fica em signals privados, expostos com `asReadonly()`. **Só as ações `load()` e `toggleDirection()` mudam o estado.**
- O store é provido na página (`providers: [TracksStore]`): o estado vive e morre com ela, sem estado global desnecessário.
- A View Transition ficou no componente, porque é apresentação e não dado.

**Evidência.** O teste de integração da página passou **sem alteração** depois do refactor: o comportamento foi preservado. O store ganhou testes unitários próprios, com a API mockada.

---

## 7. TypeScript estrito

**Referência.** [Como eu configuro um projeto greenfield em Angular – Parte 1](https://medium.com/@ortegavan/como-eu-configuro-um-projeto-greenfield-em-angular-parte-1-0b2142436c8f).

**O que foi adotado do artigo**

| Opção | O que evita |
|---|---|
| `noUncheckedIndexedAccess` | `array[0]` passa a ser `T \| undefined`, o caso real de `images[0]` do Spotify |
| `exactOptionalPropertyTypes` | Confundir "propriedade ausente" com "`undefined` explícito" |
| `verbatimModuleSyntax` | Imports de tipo viram `import type` e somem do bundle |
| Sem `baseUrl` | Desnecessário com `moduleResolution: bundler`; vira erro no TypeScript 7 |

**O que foi descartado do artigo, e por quê**

- Monorepo com pnpm workspaces e `libs/`: é para muitas apps e domínios, e aqui há uma feature.
- Pasta `plataforma/` (sessão, telemetria): não há autenticação nem estado transversal.
- Fixar o TypeScript 6: o Angular 21 já fixa a própria versão (5.9).

**Equivalência com nossa estrutura**

| Artigo | Aqui |
|---|---|
| `feature-*` | `pages/` |
| `ui-*` | `components/` |
| `data/` | `services/` + `store/` |
| `domain-logic/` | `models/` + `utils/` |
| `shared/` | `shared/` |

---

## 8. Imutabilidade e regra de negócio pura

- `Track` e `TracksResult` passaram a ter propriedades `readonly`, e o store guarda arrays `readonly`. **O compilador impede** alterar o estado fora das ações do store.
- A regra "disponível no BR" saiu do serviço da API para uma função pura (`api/src/tracks/brazil-availability.js`). Ela tem nome de regra de negócio e é testada sem mocks.

---

## 9. Proteção contra violações de arquitetura

**Contexto.** Até aqui as camadas dependiam de disciplina e code review. O artigo aponta essa lacuna e propõe resolvê-la na parte 2.

**Decisão.** ESLint (`angular-eslint` 21) com `no-restricted-imports` **por camada**. Um import proibido quebra `npm run lint`.

| Camada | Não pode importar | Motivo |
|---|---|---|
| `pages/`, `components/` | `*-api.service`, `@angular/common/http` | Dados só pelo store |
| `store/` | `components/`, `pages/` | O estado não conhece a apresentação |
| `services/` | `store/`, `components/`, `pages/` | Requisição não conhece estado |
| `models/`, `utils/`, `shared/utils/` | `@angular/*`, `rxjs` | Lógica pura, testável em Node |
| `shared/` | `@features/*` | Shared é vocabulário comum |
| qualquer feature | `../../../` ou mais | Sair da feature exige alias |

**Detalhe técnico.** No flat config do ESLint, a mesma regra declarada em dois blocos **não se soma**: o último vence. Por isso cada camada declara a lista completa de padrões. Os testes (`*.spec.ts`) ficam fora, porque precisam montar o cenário (ex.: `provideHttpClient`).

**Prova executável.** `npm run lint:boundaries` simula um import proibido para cada fronteira e falha se algum passar:

```
✔ bloqueado  componente não acessa o serviço de requisições
✔ bloqueado  componente não usa HttpClient diretamente
✔ bloqueado  store não depende de componentes
✔ bloqueado  serviço não depende do store
✔ bloqueado  utils são lógica pura, sem Angular
✔ bloqueado  shared não depende de features
✔ bloqueado  sair da feature exige alias

Todas as 7 fronteiras estão protegidas.
```

Exemplo real de violação barrada:

```
src/app/features/tracks/components/track-card/track-card.component.ts
  1:1  error  '../../services/track-api.service' import is restricted from being used by a pattern.
              Componentes acessam dados só pelo store da feature (features/<feature>/store)
```

**Próximo passo natural.** Rodar `npm run lint`, `npm run lint:boundaries` e `npm test` num pipeline de CI (GitHub Actions) para cada PR.
