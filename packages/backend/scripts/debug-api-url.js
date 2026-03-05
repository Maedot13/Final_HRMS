require('dotenv').config();

console.log('--- HRMS API Environment Debug ---');

const apiEnvVars = [
    'API_URL',
    'BASE_URL',
    'PORT',
    'NODE_ENV',
    'CORS_ORIGIN',
    'DATABASE_URL',
    'REDIS_URL'
];

apiEnvVars.forEach(key => {
    let val = process.env[key];
    if (val === undefined) {
        val = '\x1b[33m(undefined)\x1b[0m';
    } else if (val === '') {
        val = '\x1b[31m(empty string)\x1b[0m';
    } else if (key.includes('URL') || key.includes('ORIGIN')) {
        // Basic sanity check for URLs
        if (!val.startsWith('http') && !val.startsWith('redis') && !val.startsWith('postgresql')) {
            val = `\x1b[31m${val}\x1b[0m (Warning: Might be missing protocol)`;
        } else if (val.includes('://') && val.split('://')[1].trim() === '') {
            val = `\x1b[31m${val}\x1b[0m (Warning: Malformed URL, missing hostname)`;
        } else {
            val = `\x1b[32m${val}\x1b[0m`;
        }
    } else {
        val = `\x1b[32m${val}\x1b[0m`;
    }

    // Mask passwords in DATABASE_URL
    if (key === 'DATABASE_URL' && typeof process.env[key] === 'string') {
        try {
            const parsed = new URL(process.env[key]);
            if (parsed.password) {
                parsed.password = '****';
                val = `\x1b[32m${parsed.toString()}\x1b[0m`;
            }
        } catch (e) { }
    }

    console.log(`${key.padEnd(15)}: ${val}`);
});

console.log('\n--- Script URL Resolution Test ---');
let defaultBase = process.env.API_URL || 'http://localhost:5000';
console.log(`Fallback BASE_URL: ${defaultBase}`);
try {
    const testUrl = new URL('/health', defaultBase);
    console.log(`Resolution Output: \x1b[32m${testUrl.href}\x1b[0m`);
    console.log('Result: \x1b[32mOK\x1b[0m');
} catch (e) {
    console.log(`Resolution Error : \x1b[31m${e.message}\x1b[0m`);
    console.log('Result: \x1b[31mFAILED - This will cause "Invalid URI" or "Invalid URL" errors\x1b[0m');
}
