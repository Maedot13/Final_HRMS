
import { PrismaClient } from '@prisma/client';
import * as authService from '../src/services/auth.service';
import * as employeeService from '../src/services/employee.service';
import { UserRole } from '@hrms/types';

const prisma = new PrismaClient();

async function getScriptCreatorContext() {
    const campus = await prisma.campus.findFirst({ where: { isActive: true }, orderBy: { code: 'asc' } });
    if (!campus) throw new Error('No active campus found. Run seed first.');
    return { userId: 0, role: 'ADMIN' as any, scope: 'UNIVERSITY' as any, campusId: campus.id, employeeId: 'SYSTEM' };
}

async function main() {
    console.log('🚀 Starting Employee API Verification...');
    const creatorContext = await getScriptCreatorContext();

    const testEmpId = 'EMP_API_TEST_001';

    // 1. Cleanup
    const existingEmp = await prisma.employee.findUnique({ where: { employeeId: testEmpId } });
    if (existingEmp) {
        await prisma.refreshToken.deleteMany({ where: { userId: existingEmp.userId } });
        await prisma.employee.delete({ where: { id: existingEmp.id } });
        await prisma.user.delete({ where: { id: existingEmp.userId } });
    }

    // 2. Setup: Create Employee
    console.log('👤 Creating Test Employee...');
    const registerRes = await authService.register({
        name: 'API Test User',
        email: 'emp_api_test@example.com',
        employeeId: testEmpId,
        department: 'HR',
        password: 'Password123!',
        role: UserRole.EMPLOYEE,
        campusId: creatorContext.campusId
    }, creatorContext);

    const employeeId = (registerRes.user as any).employee.id;
    console.log(`✅ Created Employee ID: ${employeeId}`);

    // 3. Test Service Logic directly (Unit level check)
    console.log('🔍 Testing Service: getEmployeeById...');
    const fetchedEmployee = await employeeService.getEmployeeById(employeeId);

    if (!fetchedEmployee) throw new Error('Service failed to fetch employee');
    if (fetchedEmployee.employeeId !== testEmpId) throw new Error('Fetched wrong employee');
    console.log('✅ Service fetch successful');

    // 4. Test Update
    console.log('✏️ Testing Service: updateEmployee...');
    const updated = await employeeService.updateEmployee(employeeId, { position: 'Senior Tester' });
    if (updated.position !== 'Senior Tester') throw new Error('Update failed');
    console.log('✅ Service update successful');

    // Cleanup
    await prisma.refreshToken.deleteMany({ where: { userId: registerRes.user.id } });
    await prisma.employee.delete({ where: { userId: registerRes.user.id } });
    await prisma.user.delete({ where: { id: registerRes.user.id } });

    console.log('🎉 Employee Service Verification Passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
