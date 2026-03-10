import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { templates } from '../utils/emailTemplates';

// Create a single transporter instance
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendWelcomeEmail = async (data: {
    to: string;
    name: string;
    employeeId: string;
    tempPassword: string;
}) => {
    // If SMTP is not configured, just log it (useful for local dev without mailtrap)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('SMTP credentials not configured. Skipping welcome email. Temp Password is:', {
            employeeId: data.employeeId,
            tempPassword: data.tempPassword
        });
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"BDU HR System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: data.to,
            subject: 'Welcome to BDU HRMS — Your Login Credentials',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0056b3;">Welcome, ${data.name}!</h2>
                    <p>Your HRMS account has been created successfully.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Employee ID:</strong> ${data.employeeId}</p>
                        <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${data.tempPassword}</code></p>
                    </div>
                    <p style="color: #dc3545; font-weight: bold;">
                        ⚠️ You must change your password immediately upon your first login.
                    </p>
                    <p>Please log in to the HRMS portal to complete your profile.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #666;">
                        This is an automated message from the BDU Human Resource Management System. Please do not reply.
                    </p>
                </div>
            `,
        });

        logger.info(`Welcome email sent successfully to ${data.to}`, { messageId: info.messageId });
    } catch (error) {
        logger.error('Failed to send welcome email', { error, to: data.to });
        // Don't throw the error - we don't want to fail the registration if email fails
        // but we DO log it as an error.
    }
};

export const sendPasswordResetEmail = async (data: {
    to: string;
    name: string;
    employeeId: string;
    tempPassword: string;
}) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn(`[DEV] SMTP not configured — Password reset for ${data.employeeId}. Temp password: ${data.tempPassword}`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"BDU HR System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: data.to,
            subject: 'BDU HRMS — Your Password Has Been Reset',
            html: templates.passwordReset(data.name, data.employeeId, data.tempPassword),
        });
        logger.info(`Password reset email sent successfully to ${data.to}`, { messageId: info.messageId });
    } catch (error) {
        logger.error('Failed to send password reset email', { error, to: data.to });
    }
};

export const sendEmail = async (data: { to: string; subject: string; html: string }) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('SMTP credentials not configured. Skipping generic email:', { to: data.to, subject: data.subject });
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"BDU HR System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: data.to,
            subject: data.subject,
            html: data.html,
        });
        logger.info(`Generic email sent successfully to ${data.to}`, { messageId: info.messageId });
    } catch (error) {
        logger.error('Failed to send generic email', { error, to: data.to, subject: data.subject });
    }
};
