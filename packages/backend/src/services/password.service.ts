import { comparePassword, hashPassword } from '../utils/password';
import { prisma } from '../lib/prisma';

export const changePassword = async (userId: number, currentPassword: string, newPassword: string): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new Error('User not found');
    }

    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Incorrect current password');
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: userId },
        data: {
            passwordHash: newPasswordHash,
            mustChangePassword: false
        }
    });

    // We do NOT invalidate refresh tokens here because the user is already logged in 
    // and this is merely a forced profile completion step, not a security compromise.
};
