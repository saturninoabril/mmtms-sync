import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  outDir: 'dist',
  target: 'node22',
  platform: 'node',
  bundle: true,
  minify: false,
  treeshake: true,
  external: [
    // Don't bundle native Node.js modules
    'fs',
    'path',
    'crypto',
    'os',
    'util'
  ]
});
