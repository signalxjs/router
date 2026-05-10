import { defineLibConfig } from '@sigx/vite/lib';

export default defineLibConfig({
    entry: 'src/index.ts',
    external: ['sigx', 'sigx/jsx-runtime', 'sigx/jsx-dev-runtime'],
    jsx: true
});
