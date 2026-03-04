import { Prisma, PrismaClient } from '@prisma/client';

export async function generateNextEmployeeId(campusId: number, tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">): Promise<string> {
    type CampusIncrementResult = {
        employeeIdPrefix: string;
        employeeNumericLength: number;
        employeeSequenceCurrent: number;
    };

    // Fast-fail check outside the raw query if needed, but the raw query handles not found.
    const result = await tx.$queryRaw<CampusIncrementResult[]>`
        UPDATE "Campus"
        SET "employeeSequenceCurrent" = "employeeSequenceCurrent" + 1,
            "isPatternLocked" = true
        WHERE "id" = ${campusId}
        RETURNING "employeeIdPrefix", "employeeNumericLength", "employeeSequenceCurrent"
    `;

    if (!result || result.length === 0) {
        throw new Error('Campus not found or invalid configuration.');
    }

    const { employeeIdPrefix, employeeNumericLength, employeeSequenceCurrent } = result[0];

    const paddedSequence = employeeSequenceCurrent.toString().padStart(employeeNumericLength, '0');

    if (paddedSequence.length > employeeNumericLength) {
        throw new Error(`Employee ID sequence overflow for campus prefix ${employeeIdPrefix}. Maximum length reached.`);
    }

    return `${employeeIdPrefix}${paddedSequence}`;
}
