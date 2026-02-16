
import { createTransporter } from '../config/mail';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
    try {
        const transporter = await createTransporter();
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"HR System" <noreply@hrms.university.edu>',
            to: options.to,
            subject: options.subject,
            html: options.html,
        });

        console.log(`Email sent: ${info.messageId}`);
        // Preview only available when sending through an Ethereal account
        if (nodemailer.getTestMessageUrl(info)) {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to prevent blocking main flow, but log it
    }
};

import nodemailer from 'nodemailer';
