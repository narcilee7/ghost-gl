module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library|ghost-gl-core|ghost-gl-adapter-core)/)',
  ],
  moduleNameMapper: {
    '^ghost-gl-core$': '<rootDir>/../core/src/index.ts',
    '^ghost-gl-adapter-core$': '<rootDir>/../adapter-core/src/index.ts',
  },
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
}
