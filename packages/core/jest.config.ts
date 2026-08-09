/* eslint-disable */
export default {
  displayName: 'core',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(\\.pnpm|@preact/signals-core))'],
  testPathIgnorePatterns: [
    '/node_modules/',
    ...(process.env.SKIP_PERF
      ? ['/performance/', 'performance\\.spec\\.ts$', 'benchmarks\\.spec\\.ts$', '\\.perf\\.spec\\.ts$']
      : []),
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/core',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
