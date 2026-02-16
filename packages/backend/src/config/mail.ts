
import nodemailer from 'nodemailer';

// Create a transporter using environment variables or fall back to Ethereal for testing
export const createTransporter = async () => {
    // For development/testing without real SMTP credentials
    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
        const testAccount = await nodemailer.createTestAccount();
        console.log('Ethereal Email Test Account:', testAccount.user);

        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }

    // Production or constrained environment configuration
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};
