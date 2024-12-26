import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { dts } from "rollup-plugin-dts";

const ts = typescript();

export default [{
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      name:"karel"
    },
    
    plugins: [
        commonjs(),
        nodeResolve(),
        ts
    ]
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es',
      name:"karel"
    },
    
    plugins: [
        commonjs(),
        nodeResolve(),
        ts,
    ]
  },
  {
    // path to your declaration files root
    input: './dist/built/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'cjs' }],
    plugins: [dts()],
  }

];