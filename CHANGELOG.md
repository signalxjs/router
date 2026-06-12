# Changelog

All notable changes to `@sigx/router`. The package also keeps a per-package `packages/router/CHANGELOG.md`.

## [Unreleased]

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
