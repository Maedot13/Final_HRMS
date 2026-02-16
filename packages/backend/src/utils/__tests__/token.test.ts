
import { generateToken, verifyToken } from '../token';
import { UserRole } from '@hrms/types';

describe('Token Utility', () => {
    const mockPayload = {
        userId: 1,
        employeeId: 'EMP001',
        role: UserRole.EMPLOYEE,
    };

    describe('generateToken', () => {
        it('should generate valid JWT token', () => {
            const token = generateToken(mockPayload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });
    });

    describe('verifyToken', () => {
        it('should verify valid token', () => {
            const token = generateToken(mockPayload);
            const decoded = verifyToken(token);

            expect(decoded.userId).toBe(mockPayload.userId);
            expect(decoded.employeeId).toBe(mockPayload.employeeId);
            expect(decoded.role).toBe(mockPayload.role);
        });

        it('should throw error for invalid token', () => {
            expect(() => verifyToken('invalid.token.here')).toThrow();
        });
    });
});
