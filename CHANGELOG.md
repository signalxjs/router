# Changelog

All notable changes to `@sigx/router`. The package also keeps a per-package `packages/router/CHANGELOG.md`.

## [Unreleased]

## 0.7.0 — 2026-06-15

- Aligned with SignalX core 0.7: core peer ranges (`@sigx/reactivity`, `@sigx/runtime-core`, `@sigx/runtime-dom`, `sigx`) moved to `>=0.7.0 <0.8.0`, rebuilt against core `0.7.0`. No public API change (the router already uses the namespaced `Define.*` types core 0.7 keeps). ([#43](https://github.com/signalxjs/router/issues/43))
- Fixed: `<Link>` with no children no longer throws under core 0.7's new slot semantics (`@sigx/runtime-core` #123) — it now renders an empty anchor. ([#43](https://github.com/signalxjs/router/issues/43))

## 0.6.1 — 2026-06-12

- Navigation guards now run inside the app's DI context (`app.runWithContext`, `@sigx/runtime-core` >= 0.6.1), so DI factories called from `beforeEach` / `beforeResolve` / `beforeEnter` / `afterEach` resolve the same app-scoped instances components receive. ([#33](https://github.com/signalxjs/router/issues/33))

## 0.6.0 — 2026-06-12

- Navigation guards now run on the initial route resolution (`beforeEach`, `beforeEnter`, `beforeResolve`, redirects, `afterEach`), on both server and client. `router.isReady()` resolves once the initial navigation completes. ([#32](https://github.com/signalxjs/router/issues/32))
- **Breaking (packaging):** core packages (`@sigx/reactivity`, `@sigx/runtime-core`, `@sigx/runtime-dom`) moved from `dependencies` to `peerDependencies` at `>=0.6.0 <0.7.0`; `sigx` peer range updated from `^0.4.3` to `>=0.6.0 <0.7.0`. Prevents duplicate reactivity engines (silent dead UI) and `ERESOLVE` failures when used with `sigx@0.6.x`. ([#31](https://github.com/signalxjs/router/issues/31))

## 0.4.5 — 2026-05-12

- Bump core peer/dependency ranges to `^0.4.3` and rebuild against core `0.4.3`. No router API changes.

## 0.4.4 — 2026-05-11

- `RouterLink` now renders `href` with the configured base ([#6](https://github.com/signalxjs/router/pull/6)).

## 0.4.3 — 2026-05-10

- First release published via GitHub Actions with npm provenance attestation. Functionally identical to `0.4.2`.

## 0.4.2 — 2026-05-10

- Initial release of `signalxjs/router`. Source extracted from the `viewti/lynx` incubation repo.
- `@sigx/router` 0.4.1 (published from a transitional location with the wrong `repository` URL) is **deprecated** on npm. Use `0.4.2+` from this repo.
