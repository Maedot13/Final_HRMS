#!/usr/bin/env node

/**
 * Token Blacklist Integration Test
 * 
 * This script tests the complete token blacklist flow:
 * 1. Login to get tokens
 * 2. Verify access with token
 * 3. Logout (blacklist token)
 * 4. Verify token is rejected
 * 
 * Usage: node scripts/test-token-blacklist.js
 */

const http = require('http');
require('dotenv').config();

// Default to localhost:5000 if not specified
let BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Ensure the URL is valid, otherwise node's URL parser will throw an error
try {
    // Check if it's missing a protocol
    if (!BASE_URL.startsWith('http')) {
        BASE_URL = `http://${BASE_URL}`;
    }
    const parsedUrl = new URL(BASE_URL);
    if (!parsedUrl.hostname) {
        throw new Error('Missing hostname');
    }
} catch (e) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Invalid API_URL environment variable: "${process.env.API_URL}"`);
    console.error(`\x1b[31m[ERROR]\x1b[0m Please ensure API_URL is a valid URL (e.g., http://localhost:5000)`);
    process.exit(1);
}

// Simple request wrapper
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        let url;
        try {
            url = new URL(path, BASE_URL);
        } catch (e) {
            return reject(new Error(`Invalid URL construction: path="${path}", BASE_URL="${BASE_URL}". Error: ${e.message}`));
        }
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null,
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body,
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testTokenBlacklist() {
    console.log('\n=== Token Blacklist Integration Test ===\n');

    try {
        // Step 1: Login
        console.log('Step 1: Login to get tokens');
        const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
            employeeId: 'EMP001',
            password: 'SecurePass123!',
        });

        if (loginRes.status !== 200) {
            console.log('  ⚠️  Login failed (expected if user doesn\'t exist)');
            console.log('  This test requires a valid user account');
            console.log('  Please register a user first or use existing credentials\n');
            return;
        }

        const { token: accessToken, refreshToken } = loginRes.body;
        console.log('  ✅ Login successful');
        console.log(`  Access Token: ${accessToken.substring(0, 20)}...`);
        console.log(`  Refresh Token: ${refreshToken.substring(0, 20)}...\n`);

        // Step 2: Verify access with token
        console.log('Step 2: Verify access with token');
        const verifyRes = await makeRequest('GET', '/api/v1/auth/me', null, {
            Authorization: `Bearer ${accessToken}`,
        });

        if (verifyRes.status === 200) {
            console.log('  ✅ Token is valid');
            console.log(`  User: ${verifyRes.body.employeeId}\n`);
        } else {
            console.log('  ❌ Token verification failed');
            return;
        }

        // Step 3: Logout (blacklist token)
        console.log('Step 3: Logout (blacklist token)');
        const logoutRes = await makeRequest(
            'POST',
            '/api/v1/auth/logout',
            { refreshToken },
            { Authorization: `Bearer ${accessToken}` }
        );

        if (logoutRes.status === 200) {
            console.log('  ✅ Logout successful');
            console.log('  Token should now be blacklisted\n');
        } else {
            console.log('  ❌ Logout failed');
            return;
        }

        // Step 4: Try to use blacklisted token
        console.log('Step 4: Verify token is rejected');
        const rejectedRes = await makeRequest('GET', '/api/v1/auth/me', null, {
            Authorization: `Bearer ${accessToken}`,
        });

        if (rejectedRes.status === 401 && rejectedRes.body?.error?.code === 'TOKEN_REVOKED') {
            console.log('  ✅ Token correctly rejected!');
            console.log(`  Error Code: ${rejectedRes.body.error.code}`);
            console.log(`  Message: ${rejectedRes.body.error.message}\n`);
            console.log('🎉 Token Blacklist is working perfectly!\n');
        } else {
            console.log('  ❌ Token was not rejected as expected');
            console.log(`  Status: ${rejectedRes.status}`);
            console.log(`  Response:`, rejectedRes.body);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\nMake sure:');
        console.error('1. Server is running (npm run dev)');
        console.error('2. Redis is running (redis-cli ping)');
        console.error('3. You have a valid user account\n');
    }
}

testTokenBlacklist();
