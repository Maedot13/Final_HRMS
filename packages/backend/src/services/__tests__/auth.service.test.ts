
import { prismaMock } from '../../lib/prisma-mock';
import * as authService from '../auth.service';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should login user with valid credentials', async () => {
            const mockUser = {
                id: 1,
                employeeId: 'EMP001',
                passwordHash: await bcrypt.hash('Password123!', 10),
                role: UserRole.EMPLOYEE,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Mock finding user
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

            // Mock finding employee (login usually fetches employee details too)
            prismaMock.employee.findUnique.mockResolvedValue({
                id: 1,
                userId: 1,
                employeeId: 'EMP001',
                name: 'John Doe',
                department: 'Engineering',
                // other fields...
            } as any);

            // We might need to mock token generation if it's not mocked automatically?
            // But token util is likely imported in auth.service. 
            // If auth.service imports token util, we might need to mock that too if we want to isolate.
            // However, usually we can rely on real utility if it satisfies the test.
            // Let's assume real token utility works fine for now or if we need to mock it.
            // Looking at the implementation plan, it didn't explicitly mock token util, so let's try without first.

            const result = await authService.login({
                employeeId: 'EMP001',
                password: 'Password123!',
            });

            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.employeeId).toBe('EMP001');
        });

        it('should throw error for invalid credentials', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            await expect(
                authService.login({
                    employeeId: 'INVALID',
                    password: 'wrong',
                })
            ).rejects.toThrow(); // Expect any error, specific message might vary
        });

        it('should throw error for inactive user', async () => {
            const mockUser = {
                id: 1,
                employeeId: 'EMP001',
                passwordHash: await bcrypt.hash('Password123!', 10),
                role: UserRole.EMPLOYEE,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

            await expect(
                authService.login({
                    employeeId: 'EMP001',
                    password: 'Password123!',
                })
            ).rejects.toThrow('Account is deactivated');
        });
    });
});
