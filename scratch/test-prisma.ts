import { prisma } from '../packages/backend/src/lib/prisma';

async function test() {
    console.log('Testing Prisma fields...');
    try {
        // Just checking if properties exist on the delegate
        const count = await prisma.payrollTransfer.count();
        console.log('PayrollTransfer count:', count);
        
        const reportCount = await prisma.payrollReport.count();
        console.log('PayrollReport count:', reportCount);
        
        console.log('Fields exist in types (verified by build).');
    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
