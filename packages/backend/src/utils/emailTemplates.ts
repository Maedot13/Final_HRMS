
export const getEmailTemplate = (title: string, content: string): string => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .header { background-color: #007bff; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>${title}</h2>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>This is an automated message from the University HR Management System.</p>
        </div>
    </div>
</body>
</html>
    `;
};

export const templates = {
    leaveRequestCreated: (name: string, type: string, startDate: string, endDate: string) =>
        getEmailTemplate(
            'New Leave Request',
            `<p>Hello,</p>
             <p>${name} has submitted a new <strong>${type}</strong> leave request.</p>
             <p><strong>Duration:</strong> ${startDate} to ${endDate}</p>
             <p>Please log in to the HR Portal to review this request.</p>`
        ),

    leaveRequestStatusUpdate: (status: string, reason: string) =>
        getEmailTemplate(
            `Leave Request ${status}`,
            `<p>Hello,</p>
             <p>Your leave request has been <strong>${status}</strong>.</p>
             ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
             <p>Please log in to the HR Portal for more details.</p>`
        ),

    recruitmentApplicationReceived: (name: string, position: string) =>
        getEmailTemplate(
            'Application Received',
            `<p>Dear ${name},</p>
             <p>Thank you for applying for the position of <strong>${position}</strong>.</p>
             <p>We have received your application and will review it shortly.</p>`
        ),

    sabbaticalRequestStatusUpdate: (status: string, reason?: string) =>
        getEmailTemplate(
            `Sabbatical Request ${status}`,
            `<p>Hello,</p>
             <p>Your sabbatical request has been <strong>${status}</strong>.</p>
             ${reason ? `<p><strong>Comment:</strong> ${reason}</p>` : ''}
             <p>Please log in to the HR Portal for more details.</p>`
        ),

    clearanceCompleted: (name: string) =>
        getEmailTemplate(
            'Clearance Process Completed',
            `<p>Dear ${name},</p>
             <p>Congratulations! Your clearance process has been successfully completed.</p>
             <p>All departments have approved your clearance, and your final payroll transfer has been initiated.</p>
             <p>We wish you all the best in your future endeavors.</p>`
        ),
};
