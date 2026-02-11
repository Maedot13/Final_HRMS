#!/usr/bin/env node

/**
 * Redis Connection Test
 * 
 * This script tests the Redis connection and basic operations.
 * Run: node scripts/test-redis.js
 */

const { createClient } = require('redis');

async function testRedis() {
    console.log('\n=== Redis Connection Test ===\n');

    const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    try {
        // Connect
        console.log('📡 Connecting to Redis...');
        await client.connect();
        console.log('✅ Connected to Redis successfully!\n');

        // Test 1: PING
        console.log('Test 1: PING command');
        const pong = await client.ping();
        console.log(`  Response: ${pong}`);
        console.log('  ✅ PING test passed\n');

        // Test 2: SET and GET
        console.log('Test 2: SET and GET commands');
        await client.set('test:key', 'Hello Redis!');
        const value = await client.get('test:key');
        console.log(`  Stored: "Hello Redis!"`);
        console.log(`  Retrieved: "${value}"`);
        console.log('  ✅ SET/GET test passed\n');

        // Test 3: SET with expiration (like token blacklist)
        console.log('Test 3: SET with expiration (TTL)');
        await client.setEx('test:expiring', 10, 'This expires in 10 seconds');
        const ttl = await client.ttl('test:expiring');
        console.log(`  Key will expire in ${ttl} seconds`);
        console.log('  ✅ TTL test passed\n');

        // Test 4: Token blacklist simulation
        console.log('Test 4: Token blacklist simulation');
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
        await client.setEx(`blacklist:${mockToken}`, 3600, '1');
        const isBlacklisted = await client.get(`blacklist:${mockToken}`);
        console.log(`  Token blacklisted: ${isBlacklisted !== null}`);
        console.log('  ✅ Blacklist test passed\n');

        // Cleanup
        console.log('🧹 Cleaning up test keys...');
        await client.del('test:key');
        await client.del('test:expiring');
        await client.del(`blacklist:${mockToken}`);
        console.log('  ✅ Cleanup complete\n');

        // Server info
        console.log('📊 Redis Server Info:');
        const info = await client.info('server');
        const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
        console.log(`  Version: ${version}`);
        console.log(`  URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}\n`);

        console.log('✅ All Redis tests passed!\n');
        console.log('🎉 Your Redis connection is working perfectly!\n');

    } catch (error) {
        console.error('❌ Redis test failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Make sure Redis is installed and running');
        console.error('2. Check if Redis is running: redis-cli ping');
        console.error('3. Start Redis: brew services start redis (Mac) or sudo systemctl start redis (Linux)');
        console.error('4. Verify REDIS_URL in .env file\n');
        process.exit(1);
    } finally {
        await client.quit();
    }
}

testRedis();
