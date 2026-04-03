import crypto from 'crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const generateInitialPassword = (employeeId: string): string => {
    const randomSuffix = crypto.randomInt(1000, 9999); // 4 digits e.g. 8392
    
    // Combine: ID-RANDOM to match the specific requirement: [EmployeeID]-[RandomNumber]
    return `${employeeId}-${randomSuffix}`;
};

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (plain: string, hashed: string): Promise<boolean> => {
    return bcrypt.compare(plain, hashed);
};
