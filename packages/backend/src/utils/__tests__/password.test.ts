
import { hashPassword, comparePassword } from '../password';

describe('Password Utility', () => {
    describe('hashPassword', () => {
        it('should hash password successfully', async () => {
            const password = 'Password123!';
            const hash = await hashPassword(password);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash.length).toBeGreaterThan(0);
        });

        it('should generate different hashes for same password', async () => {
            const password = 'Password123!';
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('comparePassword', () => {
        it('should return true for matching password', async () => {
            const password = 'Password123!';
            const hash = await hashPassword(password);
            const result = await comparePassword(password, hash);

            expect(result).toBe(true);
        });

        it('should return false for non-matching password', async () => {
            const password = 'Password123!';
            const hash = await hashPassword(password);
            const result = await comparePassword('WrongPassword', hash);

            expect(result).toBe(false);
        });
    });
});
