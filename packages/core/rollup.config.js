const typescript = require('@rollup/plugin-typescript');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');
const postcss = require('rollup-plugin-postcss');

const packageJson = require('./package.json');

const production = !process.env.ROLLUP_WATCH;

module.exports = {
  input: 'src/index.ts',
  output: [
    {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true,
    },
  ],
  external: [
    // No external dependencies for core
  ],
  plugins: [
    nodeResolve({
      browser: true,
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
      rootDir: './src',
      exclude: ['**/*.spec.ts', '**/*.test.ts'],
    }),
    postcss({
      extract: 'styles.css',
      minimize: production,
      sourceMap: true,
    }),
    production && terser(),
  ],
};
