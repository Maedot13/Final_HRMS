const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
require('dotenv').config();

neonConfig.webSocketConstructor = ws;

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT * FROM "Campus"');
    console.log("Campuses:", res.rows);
    
    const userRes = await pool.query('SELECT id, role, "employeeId", "campusId", scope FROM "User" WHERE role IN (\'ADMIN\', \'HR_OFFICER\', \'SUPER_ADMIN\')');
    console.log("Admins/HRs:", userRes.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
