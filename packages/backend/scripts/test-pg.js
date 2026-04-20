
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_o4yBeulSs9MK@ep-noisy-darkness-aio1cn7i.us-east-1.aws.neon.tech/neondb?sslmode=require",
  });

  try {
    console.log('Attempting to connect with pg library (DIRECT)...');
    await client.connect();
    console.log('Connected successful!');
    const res = await client.query('SELECT 1 as result');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection failed with pg (DIRECT):');
    console.error(err);
  }
}

testConnection();
