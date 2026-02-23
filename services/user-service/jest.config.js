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
    '^@cargoez2/domain$': '<rootDir>/../../packages/domain/src/index.ts',
    '^@cargoez2/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@cargoez2/api$': '<rootDir>/../../packages/api/src/index.ts',
    '^@cargoez2/application$': '<rootDir>/../../packages/application/src/index.ts',
    '^@cargoez2/infrastructure$': '<rootDir>/../../packages/infrastructure/src/index.ts',
    '^@cargoez2/integrations$': '<rootDir>/../../packages/integrations/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
};
