import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

const prisma = new PrismaClient();

// Configuration
const RETENTION_MONTHS = 12; // Keep logs for 1 year in active DB
const BATCH_SIZE = 1000;
const ARCHIVE_DIR = path.join(__dirname, '../../archives/audit_logs');

/**
 * Ensures the archive directory exists.
 */
const ensureArchiveDir = () => {
    if (!fs.existsSync(ARCHIVE_DIR)) {
        fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
};

/**
 * Archives logs older than the retention period.
 */
const archiveAuditLogs = async () => {
    console.log(`Starting audit log archiving process...`);
    ensureArchiveDir();

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - RETENTION_MONTHS);

    console.log(`Cutoff date for archiving: ${cutoffDate.toISOString()}`);

    try {
        // Count total logs to archive
        const totalLogsToArchive = await prisma.auditLog.count({
            where: { timestamp: { lt: cutoffDate } }
        });

        if (totalLogsToArchive === 0) {
            console.log('No logs found for archiving.');
            return;
        }

        console.log(`Found ${totalLogsToArchive} logs to archive.`);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFilename = `audit_logs_${timestamp}.json.gz`;
        const archiveFilePath = path.join(ARCHIVE_DIR, archiveFilename);

        const writeStream = fs.createWriteStream(archiveFilePath);
        const gzip = zlib.createGzip();

        gzip.pipe(writeStream);

        gzip.write('[\n');

        let totalArchived = 0;
        let isFirst = true;

        // Fetch and write in batches to avoid memory issues
        while (totalArchived < totalLogsToArchive) {
            const logs = await prisma.auditLog.findMany({
                where: { timestamp: { lt: cutoffDate } },
                orderBy: { timestamp: 'asc' },
                take: BATCH_SIZE,
                // We use totalArchived as skip/cursor, or just delete as we go.
                // It's safer to fetch them all first, export, then delete.
                skip: totalArchived
            });

            if (logs.length === 0) break;

            for (const log of logs) {
                if (!isFirst) {
                    gzip.write(',\n');
                }
                gzip.write(JSON.stringify(log));
                isFirst = false;
            }

            totalArchived += logs.length;
            console.log(`Exported ${totalArchived}/${totalLogsToArchive}`);
        }

        gzip.write('\n]');
        gzip.end();

        // Wait for finish
        await new Promise<void>((resolve, reject) => {
            writeStream.on('finish', () => resolve());
            writeStream.on('error', reject);
        });

        console.log(`Successfully exported to ${archiveFilePath}`);

        // 2. Delete the archived logs from the database
        console.log('Deleting archived logs from database...');

        // Delete in batches or one big query if safe
        const deleteResult = await prisma.auditLog.deleteMany({
            where: { timestamp: { lt: cutoffDate } }
        });

        console.log(`Deleted ${deleteResult.count} logs from the database.`);
        console.log('Archiving process completed.');

    } catch (error) {
        console.error('Error during audit log archiving:', error);
    } finally {
        await prisma.$disconnect();
    }
};

// Execute if run directly
if (require.main === module) {
    archiveAuditLogs().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { archiveAuditLogs };
