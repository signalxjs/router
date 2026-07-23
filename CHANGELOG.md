# Changelog

All notable changes to `@sigx/router`. The package also keeps a per-package `packages/router/CHANGELOG.md`.

## [Unreleased]

## 0.10.0 — 2026-07-23

- **Aligned with SignalX core 0.13.** Core peer ranges (`@sigx/reactivity`, `@sigx/runtime-core`, `@sigx/runtime-dom`, `sigx`) move from `^0.12.0` to `^0.13.0`, sourced from the `catalog:` block in `pnpm-workspace.yaml` (rewritten to the concrete `^0.13.0` range on `pnpm pack`/`publish`), and the router is rebuilt and validated against core `0.13.0`. Retargeting the single-minor core range is a **breaking packaging change** — hence the minor bump. **No public API change**: the 0.12→0.13 window is additive for the router's core surface. ([#73](https://github.com/signalxjs/router/pull/73))
- Fixed: `<Link>` no longer drops the `class` and `style` props. They were never declared on `LinkProps`, and the render hard-assigned `class` from the active-class list alone — so `<Link to="/" class="btn btn-ghost">` rendered as `<a class="router-link-active">`, silently unstyling every link in an app. Consumer classes now come first, with `router-link-active` / `router-link-exact-active` appended, and `style` passes through. ([#63](https://github.com/signalxjs/router/issues/63))

## 0.9.0 — 2026-07-18

- Aligned with SignalX core 0.12: core peer ranges moved from `>=0.10.0 <0.11.0` to `^0.12.0`, rebuilt and validated against core `0.12.0`. Core version is now a pnpm catalog (`catalog:` block in `pnpm-workspace.yaml`, rewritten to a concrete range on publish). No public API change. ([#60](https://github.com/signalxjs/router/issues/60))
- Fixed: the literal root route `'/'` now outranks wildcard catch-alls (`'/*rest'`) and optional-param routes for the URL `/`, so apps with a catch-all 404 route no longer render it on their home page. ([#58](https://github.com/signalxjs/router/issues/58))
- Navigation guards now pass core's `asyncAdvice` option through `runWithContext`, re-attributing core's dev-only async-callback warning: an async guard gets router-specific advice ("resolve injectables at the top of the guard, before awaiting") instead of remediation aimed at an API the guard author never called. Wired as a no-op against core 0.10; now live with the move to core 0.12, which carries `RunWithContextOptions` (added in signalxjs/core#292 for signalxjs/core#276). ([#56](https://github.com/signalxjs/router/issues/56))

## 0.8.0 — 2026-07-16

- Aligned with SignalX core 0.10: core peer ranges (`@sigx/reactivity`, `@sigx/runtime-core`, `@sigx/runtime-dom`, `sigx`) moved to `>=0.10.0 <0.11.0`, rebuilt against core `0.10.0`. **No public API change** — none of core's 0.8/0.9/0.10 removals (`useAsync`, `<Suspense>`, `<ErrorBoundary>`, `throwOnError`, `app.config.errorHandler`, `registerPendingPromise`) are part of the router's surface. Unblocks `@sigx/ssg` and `@sigx/ssg-theme-daisyui`, which could not move to core 0.10 while the router's peer capped it below 0.8. ([#51](https://github.com/signalxjs/router/issues/51))
- Fixed: the `<RouterView>` warning for a non-`ComponentFactory` route component no longer advises wrapping in `<Suspense>`, which core 0.9 removed — it now points at `<Defer fallback={…}>`. ([#51](https://github.com/signalxjs/router/issues/51))
- Bundle-size budget raised 15 KB → 16 KB. The router's own code is unchanged; core 0.10 adds ~840 B through the surface the router imports (14.62 KB → 15.46 KB brotlied, deps included). ([#51](https://github.com/signalxjs/router/issues/51))

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
