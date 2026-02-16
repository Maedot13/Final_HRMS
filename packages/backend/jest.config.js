module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    clearMocks: true,
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    setupFilesAfterEnv: ['<rootDir>/src/lib/prisma-mock.ts'],
    transformIgnorePatterns: [
        "node_modules/(?!(express-request-id)/)"
    ],
};
