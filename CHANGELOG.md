# Changelog

## [1.2.0](https://github.com/Jaimeneira9/Summoners_Fantasy/compare/v1.1.0...v1.2.0) (2026-03-28)


### Features

* add auto-deploy workflow to Hetzner VPS on push to main ([712f5b1](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/712f5b1453cc377c4de5b1469f38c8a4366167b2))
* add auto-deploy workflow to Hetzner VPS on push to main ([a1aebed](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/a1aebed2252d7303d02828787bc2314e9db1bfd6))
* apply 5-tier pricing model to players based on avg_points_baseline ([c7a076e](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/c7a076e72595809b4b30bd46ef1a3cfa737c00c7))
* apply 5-tier pricing model to players based on avg_points_baseline ([81675c5](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/81675c5c7b48e53609e692faf74c429e74d33168))
* LEC teams standings page ([5c6a940](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/5c6a9404b17e80dd20b5f7c649905785e7b8e097))
* market peer offers UI, standings refactor, player stats page ([f03c50b](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/f03c50b290de829454f7111f033ff6eb1438f3f1))
* peer offers — manager-to-manager transfers ([6d109b9](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/6d109b9152946938faf0d5fd275e157bcbc20f7e))
* price fluctuation after series ingestion ([1f813f8](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/1f813f8e314848ce457be0085f054d032e0c1d54))
* scoring rebalance, ActionPopup UI, pipeline validation and tier analysis ([c619592](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/c619592b5f8d066880f5b3b58b1835e363b61337))
* scoring router rewrite with detailed leaderboard endpoint ([bd3ab54](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/bd3ab54ff400180e35d136be6f39e03d58c81e5d))
* set release clause on player acquisition ([df5b7a3](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/df5b7a3ca42f76d4bd87f51f77855924c0576fce))


### Bug Fixes

* actualizar tests damage_share → dpm en scoring_router y series_ingest ([b132b74](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/b132b7413f871b219cb99e941cc31141a342d2f1))
* agregar dpm al tipo de stats en frontend ([5f9e836](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/5f9e8361bad686515468d21c463423a44a6af2c9))
* align CI to Python 3.11 and suppress asyncio deprecation warning ([b48ffc3](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/b48ffc35d93ac6334ad60de6934da210f10b6141))
* auth pages dark theme rebrand ([8a8941a](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/8a8941a27d8a3b24d3ae5a1d3b54dd9185abf015))
* case-insensitive team name lookup in teams standings ([bbb02d0](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/bbb02d0cb167ae04f610537e028841d8025a7062))
* case-insensitive team name lookup in teams standings ([c008551](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/c0085513a8d9969a06b8bfbfc0171ef5a9684420))
* corregir errores de lint — Link undefined, unused vars ([eb4d84f](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/eb4d84f50b0efa22ed3c749d4f65cfa57d97ea8c))
* corregir import roto GAME_LENGTH_NORMALIZATION_THRESHOLD_MIN en tests ([eb2bc8e](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/eb2bc8ee71369a2ac1365dc0c26bd008df5c402d))
* fix price updater test mocks to work with Python 3.12 ([5d0baaf](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/5d0baafa9e70de2d4fd1fa9b0ff34e7c414fe855))
* modal background now uses dark theme var(--bg-panel) ([0ef787b](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/0ef787b900bb138cd0a009a79f76a792f0fdd30c))
* modal background now uses dark theme var(--bg-panel) ([c74869b](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/c74869b2e66df7c5c64f862058447295c731ebc5))
* pin ssh-action to immutable SHA to prevent supply chain attack ([b18e3fe](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/b18e3fe4156cb8c58650297e410f5867419cc859))
* resolve ESLint errors blocking Vercel build ([e6088f0](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/e6088f0f36d93e97e844c93abc14862f95c4bb32))
* update gol.gg matchlist regex and score parser for Spring 2026 f… ([ee858dd](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/ee858dd86fb8a99c4e0d77e0570152c3eedb0b8c))
* update gol.gg matchlist regex and score parser for Spring 2026 format ([e0d3bfe](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/e0d3bfe56058b7a9b2dc5db5e0ce97d98a32b389))
* use shell form in Dockerfile CMD to expand $PORT ([a678c9e](https://github.com/Jaimeneira9/Summoners_Fantasy/commit/a678c9e19cde28bef090ef7c698083fe29f1cee4))

## [1.1.0](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/compare/v1.0.0...v1.1.0) (2026-03-24)


### Features

* precios dinámicos, cláusulas de rescisión y explorador de jugadores ([5e1ac26](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/5e1ac26638c76332840a66209c41d496c7135260))
* sistema de precios dinámicos, cláusulas de rescisión y explorador de jugadores ([8ac7835](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/8ac78357d515db85f8197287cef11ee0ab623796))


### Bug Fixes

* actualizar tests de scoring con nuevos pesos del engine ([06aa7d6](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/06aa7d6f8c034e05e55953888f7a91e67f98e309))
* corregir imports rotos tras refactor de pricing y PlayerStatsModal ([39f44e3](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/39f44e36033be84448814f12e780a792c3e356f1))
* operaciones de presupuesto atómicas via RPC para prevenir race conditions ([e46326c](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/e46326c93ae9c9337dbe1db623ab9607fdc3591f))
* prevenir IDOR cross-liga en activate_clause ([72f2d5f](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/72f2d5f19ea1bd2694bae2def4ac66276c7af0ef))

## 1.0.0 (2026-03-23)


### Features

* add agent skills (supabase, vercel, fastapi, web-design) ([05e8709](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/05e8709ef788ca52fb045e39a6b837703eb84604))
* **db:** migraciones para soporte de series y stats extendidas ([5c5f3a5](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/5c5f3a5527a57f57df194214a0c750f9b6b699c0))
* initial commit — LOLFantasy LEC fantasy platform ([52284c4](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/52284c47b88b6c3b4530bfa5d374deec646301e8))
* pipeline gol.gg, UI light theme y schema de series ([867cfea](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/867cfea3499520d7e666ac1272c741b9931d2fdf))
* **pipeline:** implementar scraper gol.gg y orquestador de series ([5a48e32](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/5a48e325f9e98de8575521f96055c654ceb08363))
* sistema de perfiles, mejoras UI y fixes ([01927cf](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/01927cfcc7c7cdfc792837e4f9968610bc7d8984))
* sistema de perfiles, mejoras UI y fixes de stats ([a29ab19](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/a29ab19422411fe7cd25d5792d0b89b8d394ccc2))
* UI redesign Paper B Premium + backend improvements + CI ([e57ed7d](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/e57ed7dd69a7b99e0a6cf8cd43cbe508e53fceea))
* UI redesign Paper B Premium + backend improvements + CI ([2b93d7e](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/2b93d7e78f8ff6c69c07f464369b991c1063d143))
* **ui:** layout por liga con tabs y loading states ([4d5f8e5](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/4d5f8e5654355d4cbe72e28de28efba89243455c))
* **ui:** migrar de dark theme (neon azul) a light theme cream/púrpura/gold ([baf66e2](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/baf66e2e92ae3ff95bff22d12970bfeef56034f2))
* **ui:** nuevos componentes y actualización de existentes con light theme ([11b19cc](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/11b19cc51f985c8eccfcc909421eb25e928bdb5e))


### Bug Fixes

* agregar tabla profiles a los tipos de Supabase ([3fabef1](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/3fabef1b326720a966831e1d725e4b4306347378))
* **backend:** CORS desde env vars, fixes en scoring engine y routers ([7fc5f52](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/7fc5f5206483b9cd0a55caa98d0df0773218339d))
* corregir fallos de CI (ESLint unused vars + tests backend) ([6efc318](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/6efc318832e98e2235ed5a2c955336a5caad42fa))
* eliminar variable USERNAME_REGEX no utilizada en onboarding ([d714301](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/d71430101bc69f66e12375edb28d58e0c5e25843))
* resolver conflicto release-please workflow (master → main) ([c892e23](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/c892e23d542e66f413cdcf8e5d7051cb65145656))
* type error initialTab en market page ([46dacbb](https://github.com/Jaimeneira9/Fantasy-League-of-Legends/commit/46dacbbb11f804e4725d48c27e92cfe36fd6f6c4))
