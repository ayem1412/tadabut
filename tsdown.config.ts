import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.ts',
  },
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  dts: true,
  exports: true,
  publint: true,
  attw: {
    profile: 'esm-only',
    level: 'error',
  },
});
