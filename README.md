<div align="center">

# @sigx/router

**Type-safe router for [SignalX](https://github.com/signalxjs/core).**

[![npm](https://img.shields.io/npm/v/@sigx/router.svg?label=@sigx/router&color=blue)](https://www.npmjs.com/package/@sigx/router)
[![license](https://img.shields.io/npm/l/@sigx/router.svg)](./LICENSE)
[![ci](https://github.com/signalxjs/router/actions/workflows/ci.yml/badge.svg)](https://github.com/signalxjs/router/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/@sigx/router.svg)](https://www.typescriptlang.org/)

</div>

> 🚧 SignalX is in early public release (`0.4.x`). The API surface is small and stabilising — feedback is very welcome.

## Install

```bash
npm install @sigx/router sigx
```

## Quick start

```tsx
import { component, render } from 'sigx';
import {
  createRouter,
  createWebHistory,
  RouterView,
  Link,
} from '@sigx/router';

const Home = component(() => () => <h1>Home</h1>);
const About = component(() => () => <h1>About</h1>);

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});

const App = component(() => () => (
  <>
    <nav>
      <Link to="/">Home</Link> · <Link to="/about">About</Link>
    </nav>
    <RouterView />
  </>
));

const app = defineApp(<App />);
app.use(router);
app.mount('#app');
```

## Features

- **History modes** — `createWebHistory`, `createHashHistory`, `createMemoryHistory`.
- **Hooks** — `useRoute`, `useRouter`, `useParams`, `useQuery`, `useNavigate`.
- **Guards** — global `beforeEach` / `afterEach` and per-route `beforeEnter`.
- **Lazy routes** — code-split via dynamic `import()`.
- **Nested routes** — child `RouterView` for layout composition.
- **Scroll restoration** — saved + restored across history navigation.
- **SSR support** — works with `@sigx/server-renderer` for server-rendered apps.
- **Redirects** — declarative `redirect: '/path'` on routes.

## Companion repos

- [`signalxjs/core`](https://github.com/signalxjs/core) — `reactivity`, `runtime-core`, `runtime-dom`, `server-renderer`, `vite`, `sigx`
- [`signalxjs/store`](https://github.com/signalxjs/store) — `@sigx/store`
- [`signalxjs/ssg`](https://github.com/signalxjs/ssg) — `@sigx/ssg`, `@sigx/ssr-islands`, `@sigx/ssg-theme-daisyui`
- [`signalxjs/cli`](https://github.com/signalxjs/cli) — `@sigx/cli` (sigx-cli plugin host)
- [`signalxjs/lynx`](https://github.com/signalxjs/lynx) — Lynx native runtime + modules
- [`signalxjs/docs`](https://github.com/signalxjs/docs) — Docs site

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). PRs welcome.

## License

MIT © Andreas Ekdahl
