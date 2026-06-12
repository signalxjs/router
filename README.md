<div align="center">

# @sigx/router

**Type-safe router for [SignalX](https://sigx.dev/core/).**

[![npm](https://img.shields.io/npm/v/@sigx/router.svg?label=@sigx/router&color=blue)](https://www.npmjs.com/package/@sigx/router)
[![license](https://img.shields.io/npm/l/@sigx/router.svg)](./LICENSE)
[![ci](https://github.com/signalxjs/router/actions/workflows/ci.yml/badge.svg)](https://github.com/signalxjs/router/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/@sigx/router.svg)](https://www.typescriptlang.org/)

</div>

> 🚧 SignalX is in early public release (`0.6.x`). The API surface is small and stabilising — feedback is very welcome.

## 📚 Documentation

Full guides, API reference and live examples → **<https://sigx.dev/router/>**

## Install

```bash
npm install @sigx/router sigx
```

> `@sigx/router` declares `sigx` and the core packages (`@sigx/reactivity`,
> `@sigx/runtime-core`, `@sigx/runtime-dom`) as peer dependencies (`>=0.6.0 <0.7.0`)
> so your app holds a single copy of the reactivity engine. With a package manager
> that auto-installs peers (npm 7+, or pnpm with `auto-install-peers` — the pnpm 8+
> default), the command above is all you need; otherwise add the core packages
> explicitly:
>
> ```bash
> npm install @sigx/router sigx @sigx/reactivity @sigx/runtime-core @sigx/runtime-dom
> ```

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

## Part of SignalX

- [SignalX core](https://sigx.dev/core/) — `reactivity`, `runtime-core`, `runtime-dom`, `server-renderer`, `vite`, `sigx`
- [`@sigx/store`](https://sigx.dev/store/) — state management
- [`@sigx/ssg`](https://sigx.dev/ssg/) — static-site generator (`@sigx/ssr-islands`, `@sigx/ssg-theme-daisyui`)
- [`@sigx/cli`](https://sigx.dev/cli/) — sigx CLI plugin host
- [Lynx](https://sigx.dev/lynx/) — native runtime + modules
- [Full documentation](https://sigx.dev/) — all of SignalX

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). PRs welcome.

## License

MIT © Andreas Ekdahl
