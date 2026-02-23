/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript' },
          target: 'es2022',
        },
        module: { type: 'es6' },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@rajkumarganesan93/domain$': '<rootDir>/../../packages/domain/src/index.ts',
    '^@rajkumarganesan93/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@rajkumarganesan93/api$': '<rootDir>/../../packages/api/src/index.ts',
    '^@rajkumarganesan93/application$': '<rootDir>/../../packages/application/src/index.ts',
    '^@rajkumarganesan93/infrastructure$': '<rootDir>/../../packages/infrastructure/src/index.ts',
    '^@rajkumarganesan93/integrations$': '<rootDir>/../../packages/integrations/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
};
