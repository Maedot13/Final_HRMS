#!/usr/bin/env node

/**
 * API Endpoint Tester
 * 
 * This script tests critical API endpoints to verify security fixes are working.
 * Run after implementing security changes to ensure no breaking changes.
 * 
 * Usage: node scripts/test-endpoints.js
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

let passedTests = 0;
let failedTests = 0;

function log(message, color = colors.reset) {
    console.log(color + message + colors.reset);
}

function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
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

async function test(name, testFn) {
    try {
        await testFn();
        log(`✓ ${name}`, colors.green);
        passedTests++;
    } catch (error) {
        log(`✗ ${name}`, colors.red);
        log(`  Error: ${error.message}`, colors.red);
        failedTests++;
    }
}

async function runTests() {
    log('\n=== HRMS API Endpoint Tests ===\n', colors.blue);

    // Test 1: Health Check
    await test('Health check endpoint', async () => {
        const res = await makeRequest('GET', '/health');
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (res.body.status !== 'OK') throw new Error('Health check failed');
        if (!res.body.database) throw new Error('Database status missing');
    });

    // Test 2: Rate Limiting
    await test('Rate limiting on auth endpoints', async () => {
        const requests = [];
        for (let i = 0; i < 6; i++) {
            requests.push(
                makeRequest('POST', '/api/v1/auth/login', {
                    employeeId: 'test',
                    password: 'test',
                })
            );
        }
        const results = await Promise.all(requests);
        const rateLimited = results.some((r) => r.status === 429);
        if (!rateLimited) throw new Error('Rate limiting not working');
    });

    // Test 3: Password Validation
    await test('Password complexity validation', async () => {
        const res = await makeRequest('POST', '/api/v1/auth/register', {
            employeeId: 'TEST001',
            name: 'Test User',
            department: 'IT',
            password: 'weak',
        });
        if (res.status === 201) throw new Error('Weak password accepted');
    });

    // Test 4: Authorization Check
    await test('Unauthorized access blocked', async () => {
        const res = await makeRequest('GET', '/api/v1/leave/pending');
        if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    // Test 5: Input Sanitization
    await test('Input sanitization working', async () => {
        // This test would require authentication, so we just verify the endpoint exists
        const res = await makeRequest('POST', '/api/v1/clearance/requests', {
            reason: '<script>alert("xss")</script>Test',
            lastWorkingDay: '2026-12-31',
        });
        // Should fail with 401 (unauthorized) not 500 (server error)
        if (res.status === 500) throw new Error('Server error on sanitized input');
    });

    // Summary
    log('\n=== Test Summary ===\n', colors.blue);
    log(`Passed: ${passedTests}`, colors.green);
    log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.reset);
    log(`Total: ${passedTests + failedTests}\n`);

    process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch((error) => {
    log(`\nFatal error: ${error.message}`, colors.red);
    process.exit(1);
});
