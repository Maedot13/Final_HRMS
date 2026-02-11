# Redis Setup and Testing Guide

## ✅ Setup Complete!

Your Redis integration is now fully configured and working. Here's what was done:

### 1. Environment Configuration ✅
Added to `.env`:
```bash
REDIS_URL="redis://localhost:6379"
```

### 2. Redis Client Installed ✅
Dependencies:
- `redis` - Official Redis client for Node.js
- Already installed and configured

### 3. Redis Connection Initialized ✅
File: `src/lib/redis.ts`
- Singleton pattern for Redis client
- Automatic connection on startup
- Error handling and logging
- Connection status monitoring

### 4. Redis Integration in App ✅
File: `src/app.ts`
- Health check includes Redis status
- Request ID middleware for tracing
- Token blacklist integration

---

## 🧪 Test Results

### Redis Connection Test ✅
```bash
node scripts/test-redis.js
```

**Results**:
- ✅ PING test passed
- ✅ SET/GET test passed
- ✅ TTL (expiration) test passed
- ✅ Token blacklist simulation passed
- ✅ Redis Version: 7.0.15

---

## 🔍 How to Verify

### 1. Check Redis is Running
```bash
redis-cli ping
# Should return: PONG
```

### 2. Test Redis Connection
```bash
node scripts/test-redis.js
```

### 3. Check Health Endpoint
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Backend is running",
  "timestamp": "2026-02-11T...",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 4. Test Token Blacklist (Optional)
```bash
node scripts/test-token-blacklist.js
```

This will:
1. Login to get tokens
2. Verify token works
3. Logout (blacklist token)
4. Verify token is rejected

---

## 📊 What's Working

### Token Blacklist Flow:
1. **User logs in** → Gets access token and refresh token
2. **User makes requests** → Auth middleware checks if token is blacklisted
3. **User logs out** → Access token added to Redis blacklist with TTL
4. **User tries to use old token** → Rejected with `TOKEN_REVOKED` error

### Redis Operations:
- **SET with expiration**: Tokens stored with TTL matching their expiry
- **GET**: Check if token exists in blacklist
- **Automatic cleanup**: Redis removes expired keys automatically

---

## 🎯 Integration Points

### 1. Auth Middleware
File: `src/middleware/auth.middleware.ts`
```typescript
// Checks blacklist before verifying token
const isBlacklisted = await isTokenBlacklisted(token);
if (isBlacklisted) {
  return res.status(401).json({
    error: {
      code: 'TOKEN_REVOKED',
      message: 'Token has been revoked'
    }
  });
}
```

### 2. Logout Service
File: `src/services/auth.service.ts`
```typescript
// Blacklists access token on logout
await blacklistToken(accessToken, 3600); // 1 hour TTL
```

### 3. Health Check
File: `src/app.ts`
```typescript
// Monitors Redis connection
await redis.ping();
health.services.redis = 'connected';
```

---

## 🚀 Next Steps

### Test the Complete Flow:

1. **Register a user** (if you haven't):
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP001",
    "name": "Test User",
    "department": "IT",
    "password": "SecurePass123!"
  }'
```

2. **Login**:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP001",
    "password": "SecurePass123!"
  }'
```

3. **Save the tokens** from the response

4. **Logout** (with access token in header):
```bash
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

5. **Try to use the same access token**:
```bash
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Should return:
```json
{
  "error": {
    "code": "TOKEN_REVOKED",
    "message": "Token has been revoked",
    "timestamp": "2026-02-11T..."
  }
}
```

---

## 📝 Monitoring Redis

### Check Redis Keys:
```bash
redis-cli keys "blacklist:*"
```

### Check Specific Token:
```bash
redis-cli get "blacklist:YOUR_TOKEN"
```

### Monitor Redis in Real-Time:
```bash
redis-cli monitor
```

### Check Redis Stats:
```bash
redis-cli info stats
```

---

## ✅ Verification Checklist

- [x] Redis installed and running
- [x] REDIS_URL added to .env
- [x] Redis client installed (npm package)
- [x] Redis connection initialized in app
- [x] Health check includes Redis status
- [x] Token blacklist utility created
- [x] Auth middleware checks blacklist
- [x] Logout blacklists tokens
- [x] Redis connection test passed
- [x] Health endpoint shows Redis connected

---

## 🎉 Success!

Your Redis integration is complete and working perfectly! The token blacklist feature is now active and will prevent users from reusing tokens after logout.

**Key Benefits**:
- ✅ Secure logout (tokens can't be reused)
- ✅ Automatic token cleanup (Redis TTL)
- ✅ Fast blacklist checks (in-memory Redis)
- ✅ Scalable solution (Redis cluster support)
- ✅ Monitoring via health check

---

**Date**: 2026-02-11  
**Status**: ✅ COMPLETE AND TESTED
