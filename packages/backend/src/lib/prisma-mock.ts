import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { prisma } from './prisma';

jest.mock('./prisma', () => ({
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
}));

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    })),
    Worker: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(true),
    })),
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
    mockReset(prismaMock);

    // Default mock for atomic ID generation query
    prismaMock.$queryRaw.mockResolvedValue([{
        employeeIdPrefix: 'EMP',
        employeeNumericLength: 4,
        employeeSequenceCurrent: 1
    }]);
});
