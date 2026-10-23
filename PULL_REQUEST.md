## O que foi feito

Página pública em Angular 21 (LTS) que consulta os 10 ISRCs do contrato na Spotify Web API e exibe capa, data de lançamento, título, artistas, duração (mm:ss), prévia de áudio, link para o Spotify e disponibilidade no BR, ordenados por título.

- `api/`: BFF mínimo em Express que protege o Client Secret (fluxo Client Credentials com cache de token).
- `frontend/`: vertical slice `features/tracks` + `shared`; standalone components, signals e zoneless.
- Estado com **NgRx Signal Store** e inversão de dependência por `InjectionToken`: a página injeta `TRACKS_STORE`, o store injeta `TRACKS_REPOSITORY`; só `provideTracksFeature()` conhece as implementações, e o lint impede o atalho.
- Alerta com "Tentar de novo" quando a integração está indisponível; aviso separado para ISRCs não encontrados.
- Responsiva (grade → lista no celular) com transições que respeitam `prefers-reduced-motion`.

- Fronteiras de arquitetura protegidas por ESLint (`npm run lint`), com prova executável (`npm run lint:boundaries`).
- TypeScript estrito ampliado e modelos `readonly`.
- CI no GitHub Actions (`.github/workflows/ci.yml`): fronteiras, lint, testes com cobertura e build, em passos separados.
- Cobertura mínima de 90% por arquivo na lógica pura (frontend e API).
- Decisões registradas passo a passo em `docs/BITACORA.md`, incluindo o porquê de ESLint em vez de Sheriff por enquanto.

- Governança de IA: `AGENTS.md` do projeto + boas práticas oficiais geradas pelo Angular CLI, MCP do Angular em modo somente leitura (`docs/GOVERNANCA-IA.md`).
- Conferência com as regras oficiais do Angular: `NgOptimizedImage` adotado e 0 violações AXE.

- **Modo mock** no BFF enquanto a conta Premium não é configurada: mesmo contrato do Spotify, catálogo fictício que cobre todos os estados da tela, prévias de áudio tocáveis e simulação de queda. Troca para dados reais só com variável de ambiente.

- **Testes E2E** com Playwright (desktop e mobile) contra a API em modo mock, incluindo AXE e prévia de áudio tocando; job próprio no CI.

## Pontos de atenção (limitações atuais da API do Spotify)

- `available_markets` foi removido em Development Mode (fev/2026) → disponibilidade no BR via `market=BR` + `is_playable`.
- `preview_url` vem `null` para apps novos → o player existe e funciona com URL; sem ela, o botão fica desabilitado e explicado.
- Sem endpoint em lote → uma busca por ISRC, em paralelo.

Detalhes e links na seção **Decisões técnicas e limitações** do README.

## Como testar

Não precisa de credenciais: sem elas, a API sobe em **modo mock** (dados fictícios, aviso visível na tela).

```bash
cd api && cp .env.example .env && npm install && npm test && npm start
cd frontend && npm install && npm test && npm start   # http://localhost:4200
```

- Alerta de integração indisponível: `SPOTIFY_MOCK_SCENARIO=down` no `api/.env` e reiniciar a API (ou simplesmente parar a API e clicar em "Tentar de novo").
- Spotify real: `SPOTIFY_MODE=live` + credenciais (exige Premium na conta dona do app).

## Próximos passos (próxima iteração)

- Camada de cache no store/API se a lista de ISRCs crescer.
- Deploy da API + frontend (ex.: Vercel/Render) para a página ficar pública.
- Migrar as fronteiras para Sheriff quando houver uma segunda feature (gatilho documentado na bitácora).
- Hooks de Git como camada local de verificação: Husky + lint-staged no `pre-commit` (ESLint e Prettier só nos arquivos alterados) e commitlint no `commit-msg` (Conventional Commits). Complementa o CI, que continua sendo a autoridade, porque um hook pode ser pulado com `--no-verify`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
