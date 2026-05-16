const http = require('http');

async function test() {
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId: 'SUPER-ADMIN-001', password: 'SuperAdmin@1234' })
  });
  
  const loginData = await loginRes.json();
  const token = loginData.data?.token || loginData.token;
  
  if (!token) {
    console.log("Failed to get token", loginData);
    return;
  }
  
  const campusesRes = await fetch('http://localhost:3000/api/v1/campuses', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log("Campuses Response Status:", campusesRes.status);
  const campusesData = await campusesRes.json();
  console.log("Campuses Data length:", campusesData.data?.length);
  console.log("Campuses Data:", JSON.stringify(campusesData, null, 2));
}

test();
