#!/usr/bin/env node

/**
 * Secret Generator for HRMS Backend
 * 
 * This script generates cryptographically secure secrets for JWT tokens.
 * Run this script and copy the output to your .env file.
 * 
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('\n=== HRMS Secret Generator ===\n');
console.log('⚠️  IMPORTANT: Never commit these secrets to version control!\n');

// Generate JWT Secret (64 bytes = 128 hex characters)
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET="' + jwtSecret + '"');

// Generate JWT Refresh Secret (64 bytes = 128 hex characters)
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_REFRESH_SECRET="' + jwtRefreshSecret + '"');

console.log('\n✅ Secrets generated successfully!');
console.log('\n📋 Next Steps:');
console.log('1. Copy the above secrets to your .env file');
console.log('2. Never commit .env to version control');
console.log('3. Use different secrets for development, staging, and production');
console.log('4. Rotate secrets regularly (every 90 days recommended)');
console.log('5. Store production secrets in a secure vault (AWS Secrets Manager, etc.)\n');
