import typescript from '@rollup/plugin-typescript';
import sourceMaps from 'rollup-plugin-sourcemaps';

const pkg = require('./package.json');
const libraryName = 'validatedChangeset';

export default {
  input: 'dist/es/index.js',
  output: [
    {
      file: pkg.main,
      name: libraryName,
      format: 'umd',
      sourcemap: true,
      globals: {
        '@ungap/structured-clone': 'structuredClone' // Define a global name
      }
    },
    { file: pkg.module, format: 'es', sourcemap: true }
  ],
  external: ['@ungap/structured-clone'],
  plugins: [typescript(), sourceMaps()]
};
