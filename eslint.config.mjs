import neostandard, { plugins } from 'neostandard'

export default [
  ...neostandard({
    ignores: [
      '**/node_modules/**',
      '**/generated/*.ts',
      'dist/**',
      'lib/**'
    ],
    ts: true
  }),
  plugins.promise.configs['flat/recommended']
]
