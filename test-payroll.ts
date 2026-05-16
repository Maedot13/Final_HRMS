import { getLeavePayrollTransfers } from './packages/backend/src/services/payroll.service';
getLeavePayrollTransfers().then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);
