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
| 10 | [Decisão: ESLint agora, Sheriff depois](#10-decisão-eslint-agora-sheriff-depois) | — |
| 11 | [Política de cobertura](#11-política-de-cobertura) | `e4f0ca7` `996414c` |
| 12 | [Integração contínua (GitHub Actions)](#12-integração-contínua-github-actions) | `e9db712` |
| 13 | [Parte 3 do artigo e conferência com a doc do Angular](#13-parte-3-do-artigo-e-conferência-com-a-doc-do-angular) | `e9d43fd` |
| 14 | [Governança de IA](#14-governança-de-ia) | `a5365e3` `ea3c902` `0ede5fd` |
| 15 | [Skills do Angular e convenção de nomes](#15-skills-do-angular-e-convenção-de-nomes) | `2bb31b4` `d93bde5` |
| 16 | [Modo mock até a conta Premium](#16-modo-mock-até-a-conta-premium) | `dd4ea24` `8800c54` `d9e4ce6` |
| 17 | [Testes E2E](#17-testes-e2e) | ver abaixo |

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

**Contexto.** Até aqui as camadas dependiam de disciplina e code review. A parte 1 do artigo aponta essa lacuna, e a [parte 2](https://medium.com/@ortegavan/como-eu-configuro-um-projeto-greenfield-em-angular-parte-2-03b918a8d914) a resolve com Sheriff (ver a seção 10).

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

**Próximo passo.** Executar essas verificações automaticamente em cada PR (seção 12).

---

## 10. Decisão: ESLint agora, Sheriff depois

**Contexto.** A [parte 2 do artigo](https://medium.com/@ortegavan/como-eu-configuro-um-projeto-greenfield-em-angular-parte-2-03b918a8d914) protege as fronteiras com o **Sheriff** (`@softarc/sheriff-core` + `@softarc/eslint-plugin-sheriff`). Ele define módulos por pasta com **tags** (`type:feature`, `type:data`, `domain:<nome>`…) e regras de dependência entre tags (`depRules`). Também verifica **encapsulamento**: cada módulo só é consumido pelo seu ponto de entrada.

**Comparação**

| Critério | ESLint `no-restricted-imports` (atual) | Sheriff |
|---|---|---|
| Base da verificação | Texto do import (regex) | Grafo real de imports resolvidos |
| Depende de convenção de nome | Sim: o serviço precisa se chamar `*-api.service` | Não: a regra é por pasta/tag |
| Isolamento entre features | Não coberto (há uma só feature) | `domain:*` → `sameTag` |
| Encapsulamento (ponto de entrada) | Não | Sim |
| Ferramentas e configuração novas | Nenhuma além do ESLint | `sheriff.config.ts` + plugin |
| Legibilidade das regras | Uma tabela em `eslint.config.js` | Tags e `depRules` |

**Decisão.** Manter ESLint com `no-restricted-imports` enquanto houver **uma única feature**. As regras atuais cobrem todas as fronteiras que existem hoje, e `npm run lint:boundaries` as prova.

**Limitações aceitas, de forma consciente**

- A regra "componente não acessa serviço de requisição" depende do sufixo `-api.service`. Um `spotify.gateway.ts` escaparia. A mitigação é a convenção de nomes documentada aqui e revisada no PR.
- Não há verificação de encapsulamento, porque não usamos barrels (`index.ts`). Hoje isso é intencional: só há fronteiras entre camadas, não entre módulos publicados.

**Gatilho para migrar.** Quando entrar a **segunda feature** (ex.: `artists/`), ou quando uma feature precisar consumir outra, migrar para Sheriff com:

```ts
// sheriff.config.ts (esboço)
modules: {
  'src/app/features/<domain>/pages':      ['domain:<domain>', 'type:feature'],
  'src/app/features/<domain>/components': ['domain:<domain>', 'type:ui'],
  'src/app/features/<domain>/store':      ['domain:<domain>', 'type:state'],
  'src/app/features/<domain>/services':   ['domain:<domain>', 'type:data'],
  'src/app/features/<domain>/utils':      ['domain:<domain>', 'type:domain-logic'],
  'src/app/shared/<name>':                ['domain:shared', 'type:util'],
},
depRules: {
  'domain:*': [sameTag, 'domain:shared'],
  'type:feature': ['type:ui', 'type:state', 'type:domain-logic', 'type:util'],
  'type:ui': ['type:domain-logic', 'type:util'],
  'type:state': ['type:data', 'type:domain-logic', 'type:util'],
  'type:data': ['type:domain-logic', 'type:util'],
  'type:domain-logic': ['type:util'],
  'type:util': noDependencies,
}
```

A migração mantém o passo "Fronteiras de arquitetura" do CI; só troca o comando (`sheriff verify`).

**Outros pontos da parte 2 que não se aplicam**

- TypeScript 6 e pnpm: o Angular 21 fixa a própria versão do TypeScript, e usamos npm.
- `main.ts` temporário na raiz: o autor ainda não tinha aplicação; nós temos.

---

## 11. Política de cobertura

**Referência.** A parte 2 do artigo propõe **90% só na lógica de domínio**, sem exigência para as telas: cobertura é ferramenta, não meta.

**Decisão**

| Projeto | Arquivos com limite de 90% (por arquivo) | Fora do limite |
|---|---|---|
| frontend | `features/*/utils`, `features/*/models`, `features/*/store`, `shared/pipes`, `shared/utils` | componentes e páginas, cobertos pelo teste de integração da página |
| api | `brazil-availability`, `track.mapper`, `track.service`, `token.service` | `server.js` (composição) e rotas, cobertas pelo teste de integração HTTP |

- O limite vale **por arquivo** (`perFile: true`): um arquivo bem testado não esconde outro sem teste.
- Frontend: configuração `coverage` do builder `@angular/build:unit-test` (`npm run test:coverage`).
- API: `vitest.config.js` (`npm run test:coverage`).

**Evidência de que funciona.** Ao ligar o limite, ele **reprovou de imediato** dois arquivos reais:

```
ERROR: Coverage for lines (0%) does not meet global threshold (90%) for src/app/shared/utils/view-transition.ts
ERROR: Coverage for branches (55.55%) does not meet global threshold (90%) for src/tracks/track.mapper.js
```

Os testes criados cobrem os casos que faltavam: movimento reduzido e navegador sem suporte a View Transitions; faixa sem álbum, sem imagem, sem prévia ou sem link.

**Resultado atual**

| Projeto | Testes | Statements | Branches | Functions | Lines |
|---|---|---|---|---|---|
| frontend | 20 | 100% | 97,7% | 100% | 100% |
| api | 18 | 96,2% | 100% | 100% | 95,8% |

---

## 12. Integração contínua (GitHub Actions)

**Arquivo.** `.github/workflows/ci.yml`

**Quando roda.** Em todo `pull_request` e em `push` na `main`. Um novo push na mesma branch **cancela** a execução anterior (`concurrency`). O token do workflow tem permissão só de leitura (`permissions: contents: read`).

**Estrutura.** Dois jobs **em paralelo**, cada um no seu diretório (`defaults.run.working-directory`):

```
ci
├── frontend (Angular)                      ├── api (BFF)
│   1. checkout                             │   1. checkout
│   2. Node 22 + cache do npm               │   2. Node 22 + cache do npm
│   3. npm ci                               │   3. npm ci
│   4. Fronteiras de arquitetura            │   4. Testes + cobertura (≥ 90%)
│   5. Lint                                 │   5. Artefato: coverage-api
│   6. Testes + cobertura (≥ 90%)           │
│   7. Build de produção                    │
│   8. Artefato: coverage-frontend          │
```

**Decisões**

| Decisão | Motivo |
|---|---|
| **Fronteiras em passo separado do lint** (ideia da parte 2) | No PR, "violou a arquitetura" fica distinto de "erro de estilo" |
| Ordem: fronteiras → lint → testes → build | Falha primeiro o que é mais barato e mais estrutural |
| `npm ci` com o lockfile | Instalação reprodutível; falha se o `package-lock.json` divergir |
| Cache do npm por projeto (`cache-dependency-path`) | Cada lockfile tem o seu cache |
| Jobs paralelos por projeto | Frontend e API são independentes; o feedback chega mais rápido |
| Relatório de cobertura como artefato, mesmo em falha (`if: always()`) | Dá para baixar o `lcov` e ver o que ficou sem teste |
| Node 22 | A mesma versão do desenvolvimento local |
| Sem segredos do Spotify no CI | Os testes simulam só a borda (`fetch`/HTTP), então não dependem do Spotify nem do Premium |

**Validação local.** Antes do commit, o pipeline foi reproduzido numa cópia limpa do repositório (sem `node_modules`), com os mesmos comandos:

```
api       npm ci → test:coverage                 18 testes ✔  cobertura ✔
frontend  npm ci → lint:boundaries                7/7 fronteiras protegidas ✔
                 → lint                           All files pass linting ✔
                 → test:coverage                  20 testes ✔  cobertura ✔
                 → build                          bundle gerado ✔
```

**Como reproduzir localmente.** São os mesmos comandos do CI:

```bash
cd api && npm ci && npm run test:coverage
cd frontend && npm ci && npm run lint:boundaries && npm run lint && npm run test:coverage && npm run build
```

**Para ativar no GitHub.** Basta o arquivo estar no repositório: no fork, a aba **Actions** passa a mostrar o workflow `ci` em cada PR. Opcionalmente, em *Settings → Branches*, marcar os jobs `Frontend (Angular)` e `API (BFF)` como **checks obrigatórios** para o merge.

---

## 13. Parte 3 do artigo e conferência com a doc do Angular

**Referência.** [Parte 3](https://medium.com/@ortegavan/como-eu-configuro-um-projeto-greenfield-em-angular-parte-3-74b1e26c6f35): cria a aplicação real, liga o Sheriff a ela e adiciona um `AGENTS.md`.

**O que já fazíamos igual (validação):** standalone, `OnPush`, zoneless e signals no lugar de `BehaviorSubject`. Também corrigimos as violações de `verbatimModuleSyntax` do código gerado com `import type`, em vez de desligar a opção, exatamente como o autor fez, e já usávamos as regras de acessibilidade de templates.

**Adotado**

- `AGENTS.md`, mas só depois de conferir a doc oficial do Angular, o que mudou o plano (seção 14).
- Ignores globais no ESLint (`node_modules`, `dist`, `.angular`, `coverage`).

**Descartado**

- Workspace pnpm com `apps/`: temos uma app só.
- SSR: os dados vêm do BFF a cada carga, e não há conteúdo estático que valha prerenderizar.
- CSS no lugar de SCSS: é preferência do autor, não melhoria.

**Correções que vieram da conferência com as regras oficiais** (`e9d43fd`)

- `NgOptimizedImage` nas capas, mais `preconnect` para `i.scdn.co`.
- O AXE encontrou `label-content-name-mismatch` (WCAG 2.5.3): o `aria-label` do botão de ordenação não continha o texto visível. Agora o botão usa o próprio texto + `aria-pressed`. Resultado: 0 violações AXE (WCAG 2.0/2.1 A e AA) em desktop e mobile, nos estados de sucesso e de erro.

---

## 14. Governança de IA

Documento completo: **[docs/GOVERNANCA-IA.md](GOVERNANCA-IA.md)**.

**Resumo da decisão**

- Duas fontes de contexto, cada uma com um dono: `frontend/AGENTS.md` **gerado pelo Angular CLI 21** (boas práticas oficiais, sem edição) e `AGENTS.md` na raiz, **escrito à mão**, só com o que é específico do projeto (53 linhas).
- `CLAUDE.md` com `@AGENTS.md` e `@frontend/AGENTS.md`, porque o Claude Code lê `CLAUDE.md`.
- Servidor MCP do Angular CLI em `.mcp.json`, **somente leitura** e com a versão fixada em 21. Verificado: encontra o workspace.
- As regras críticas não dependem do texto: são garantidas por lint, TypeScript estrito, cobertura, AXE e CI.

**Por que gerar em vez de copiar.** O angular.dev já documenta a v22 (onde `OnPush` é padrão e não deve ser declarado), enquanto o projeto é v21. O arquivo gerado pelo CLI do projeto acompanha a versão instalada.

---

## 15. Skills do Angular e convenção de nomes

**Contexto.** A doc de IA do Angular também oferece *agent skills* (`npx skills add https://github.com/angular/skills`). Ao analisá-las, apareceram duas coisas: elas descrevem a **v22**, e a referência de nomes revelou uma inconsistência nossa (o `app.ts` gerado pelo CLI, sem sufixo, convivia com os nossos `*.component.ts`).

**Decisões**

1. **Skills não adotadas:** recomendam APIs que não existem na v21 (`@Service()`, Signal Forms). As boas práticas da nossa versão já vêm do arquivo gerado pelo CLI 21 e do MCP fixado na 21. Reavaliar na migração para a v22.
2. **Manter o estilo de nomes com sufixo de tipo**, configurado no `angular.json` (`type` / `typeSeparator` nos schematics), como o guia de estilo permite.
3. **Corrigir a inconsistência:** `app.ts` → `app.component.ts` (`AppComponent`).

**Verificar:** `npx ng g c x --dry-run` gera `x.component.ts`; build, testes, lint e fronteiras passam.

Detalhes: [GOVERNANCA-IA.md §4.1 e §4.2](GOVERNANCA-IA.md#41-por-que-não-usamos-as-skills-oficiais-angularskills).

---

## 16. Modo mock até a conta Premium

**Contexto.** A integração real depende de uma conta Spotify **Premium** dona do app (exigência do Development Mode desde fev/2026, seção 1). Até essa configuração chegar, a página não teria dados para mostrar, e o restante do trabalho (interface, estados, arquitetura) não poderia ser demonstrado.

**Decisão.** Um **modo mock no BFF**, não no frontend.

```
                        ┌─ SPOTIFY_MODE=live ─▶ spotify.client.js ──▶ api.spotify.com
track.service.js ──────┤
 (mesma regra do BR,    └─ SPOTIFY_MODE=mock ─▶ mock-spotify.client.js ──▶ catálogo fictício
  mesmo mapper)                                                         + capas SVG / prévias WAV
```

**Por que no BFF**

| Critério | Mock no BFF (escolhido) | Mock no frontend (interceptor ou fixtures) |
|---|---|---|
| Código exercitado na demo | Serviço, regra do BR, mapper, rotas e HTTP reais; só a última borda é trocada | A API inteira fica de fora |
| Frontend | **Zero mudança** para trocar de modo | Precisa de flag de build ou de ambiente |
| Troca para dados reais | Uma variável de ambiente, sem rebuild | Novo build |
| Risco de ir para produção por engano | Baixo: o modo aparece no log, no `/api/health` e na tela | Fixtures ficam no bundle |

**Princípios aplicados**

- **Substituição de Liskov / inversão de dependência:** o cliente mock implementa o mesmo contrato do real (`findTrackByIsrc(isrc, market)`). O `track.service.js` não sabe qual recebe, e a escolha acontece em um único lugar (`server.js`, a composição).
- **Sem `if (mock)` espalhado:** nenhum serviço, regra ou componente testa o modo. Novos cenários entram no catálogo.
- **Transparência:** o modo nunca é silencioso.
  - A API responde `X-Data-Source: mock` em todas as respostas, e o `/api/health` informa `dataSource`.
  - O log de inicialização avisa *"⚠ Modo MOCK: dados fictícios"*.
  - A página mostra *"Modo demonstração: dados fictícios"*. O frontend só **lê** o cabeçalho: não decide nada.
- **Dados honestos:** os ISRCs são os do contrato; títulos, artistas e álbuns são **inventados** e não imitam gravações reais.

**Catálogo pensado para cobrir todos os estados da tela**

| ISRC | Cenário |
|---|---|
| `BR1SP1200071`, `BXKZM1900345`, `NO1R42511410` | Disponível no BR, sem prévia |
| `BRC310600002`, `BR1SP1200070`, `BXKZM1900338` | Disponível no BR, **com prévia tocável** |
| `BR1SP1500002` | `is_playable: false` no mercado BR |
| `NO1R42509310`, `QZNJX2081700` | Ausente no mercado BR (indisponível) |
| `QZNJX2078148` | Não encontrado (404) |
| `BRC310600002` / `QZNJX2081700` | Data com precisão de ano / mês |

**Recursos gerados pela própria API (sem rede, sem arquivos binários no repositório)**

- Capas em **SVG**, com cor e composição derivadas do hash do ISRC: sempre a mesma por faixa.
- Prévias em **WAV** (8 s, arpejo pentatônico também derivado do ISRC), servidas em `/api/mock/previews/:isrc.wav`. Elas demonstram o player funcionando, o que o Spotify real não permite hoje, porque `preview_url` vem nulo.

**Configuração** (`api/.env`): `SPOTIFY_MODE=mock|live`; `SPOTIFY_MOCK_SCENARIO=down` para simular a queda; `SPOTIFY_MOCK_LATENCY_MS` para ver o carregamento. Sem `SPOTIFY_MODE`, o padrão é `live` com credenciais e `mock` sem elas.

**Verificação**

- `api`: 29 testes. Os do mock passam pelo **mesmo** serviço e mapper do modo real e cobrem cabeçalho, os três casos de disponibilidade, 404, queda simulada, latência, SVG e WAV válidos. O mock entrou na política de cobertura de 90%.
- `frontend`: 23 testes, entre eles leitura do cabeçalho, `source` no store e o aviso aparecendo **só** em modo mock.
- **Ponta a ponta real** (build de produção + API em modo mock, sem rotas simuladas no navegador): a prévia toca (barra de progresso e `aria-pressed=true`), o cenário `down` mostra o alerta, e o AXE dá 0 violações em desktop e mobile nos dois cenários.

**Na apresentação.** O impedimento (Premium) é externo e foi comunicado. O mock não esconde o problema: deixa o produto demonstrável sem mentir sobre os dados, e a troca para o real é uma variável de ambiente, não uma refatoração.

---

## 17. Testes E2E

**Contexto.** Unitários e integração provam as peças. Faltava provar que **a tela que o usuário vê** cumpre o enunciado, num navegador real, em desktop e celular. O modo mock (seção 16) tornou isso possível sem credenciais e com dados determinísticos.

**Decisão.** Playwright (`@playwright/test` 1.56) em `frontend/e2e/`, rodando contra o **stack real**:

```
Chromium ──▶ ng serve (proxy /api) ──▶ API em modo mock ──▶ catálogo fictício
```

- O `webServer` do `playwright.config.ts` sobe a API (`SPOTIFY_MODE=mock`, latência 0) e o `ng serve`. Um único comando: `npm run e2e`.
- **Nada é simulado no navegador**, exceto a queda da integração: um `page.route` responde 503, como a API faria com o Spotify fora.
- Dois projetos: **desktop** (Desktop Chrome) e **mobile** (Pixel 7, com touch).
- **Page Object** (`tracks.page.ts`): os testes falam a língua da tela (`tracks.card('Golden Hour Drive')`), e os seletores ficam num lugar só. A busca é por papel e nome acessível (`getByRole`), o que também valida a acessibilidade.
- Arquivos `*.e2e.ts`, para não se misturarem com os `*.spec.ts` do Vitest.

**Cenários (9 × 2 dispositivos = 18 testes)**

| Requisito do enunciado | Teste |
|---|---|
| Exibir as faixas; ISRC sem dados | Lista 9 faixas, aviso de demonstração, `QZNJX2078148` não encontrado |
| Ordenação alfabética por título | A–Z conferida com `Intl.Collator('pt-BR')`; o botão inverte para Z–A |
| Thumb, data, título, artistas, duração mm:ss, link | Card completo + regex `mm:ss` em todos os cards |
| Disponível no BR | Disponível, `is_playable: false` e ausente no mercado BR |
| Player com prévia | Toca (`aria-pressed=true` + barra de progresso) e pausa; desabilitado sem áudio |
| Alerta se a integração cair | 503 → alerta → "Tentar de novo" → faixas carregadas |
| Responsiva | Sem rolagem horizontal, nos dois dispositivos |
| Acessibilidade (regra oficial do Angular) | AXE WCAG 2.0/2.1 A e AA: 0 violações |

**Achado durante a implementação (vale contar na apresentação).** Na primeira execução, o AXE reprovou o contraste de vários textos. Investigando, as cores medidas (`#313336`, `#464749`) não existem na paleta: o AXE estava medindo **no meio da animação de entrada** (fade-in). Cheguei a subir o token `--text-faint`, mas a medição mostrou que não era necessário (4,9:1 sobre a superfície de hover) e **reverti**. A correção certa foi no teste: `waitForAnimations()` espera as animações terminarem antes de medir, como o usuário vê a página.

**Estabilidade.** 18/18 em três execuções seguidas, duas delas com `CI=1` (servidores novos a cada vez, sem reaproveitar).

**No CI.** Job `e2e` com `needs: [frontend, api]`: só roda se as verificações rápidas passarem, porque é o passo mais caro. Instala o Chromium com `playwright install --with-deps`. Em caso de falha, publica o relatório HTML, os traces e as screenshots como artefato (7 dias). No CI há 1 retry e `forbidOnly`, para um `test.only` esquecido não passar.

