## O que foi feito

Página pública em Angular 21 (LTS) que consulta os 10 ISRCs do contrato na Spotify Web API e exibe capa, data de lançamento, título, artistas, duração (mm:ss), prévia de áudio, link para o Spotify e disponibilidade no BR, ordenados por título.

- `api/`: BFF mínimo em Express que protege o Client Secret (fluxo Client Credentials com cache de token).
- `frontend/`: vertical slice `features/tracks` + `shared`; standalone components, signals e zoneless.
- Separação de responsabilidades: `TracksStore` (estado e ações) → `TrackApiService` (requisições). A página só conversa com o store.
- Alerta com "Tentar de novo" quando a integração está indisponível; aviso separado para ISRCs não encontrados.
- Responsiva (grade → lista no celular) com transições que respeitam `prefers-reduced-motion`.

## Pontos de atenção (limitações atuais da API do Spotify)

- `available_markets` foi removido em Development Mode (fev/2026) → disponibilidade no BR via `market=BR` + `is_playable`.
- `preview_url` vem `null` para apps novos → o player existe e funciona com URL; sem ela, o botão fica desabilitado e explicado.
- Sem endpoint em lote → uma busca por ISRC, em paralelo.

Detalhes e links na seção **Decisões técnicas e limitações** do README.

## Como testar

```bash
cd api && cp .env.example .env && npm install && npm test && npm start
cd frontend && npm install && npm test && npm start   # http://localhost:4200
```

Para ver o alerta de indisponibilidade, basta parar a API e clicar em "Tentar de novo".

## Próximos passos (próxima iteração)

- Camada de cache no store/API se a lista de ISRCs crescer.
- Deploy da API + frontend (ex.: Vercel/Render) para a página ficar pública.
- Testes E2E (Playwright).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
