# Secret Rotation Guide

## Overview
This guide outlines the process for rotating JWT secrets in the HRMS application.

## When to Rotate Secrets

- **Immediately**: If secrets are compromised or exposed
- **Regularly**: Every 90 days as a security best practice
- **After incidents**: Following any security incident
- **Before production**: When deploying to production for the first time

## Rotation Process

### 1. Generate New Secrets

```bash
node scripts/generate-secrets.js
```

### 2. Update Environment Variables

**Development/Staging:**
```bash
# Update .env file with new secrets
JWT_SECRET="<new_secret>"
JWT_REFRESH_SECRET="<new_refresh_secret>"
```

**Production:**
Use your secret management service (AWS Secrets Manager, HashiCorp Vault, etc.)

### 3. Graceful Rotation Strategy

To avoid invalidating all existing tokens immediately:

1. **Dual Secret Support** (Recommended for production):
   - Add support for both old and new secrets temporarily
   - Verify tokens with both secrets
   - Issue new tokens with new secret
   - After token expiry period (7 days for refresh tokens), remove old secret

2. **Immediate Rotation** (Simpler, but logs out all users):
   - Update secrets
   - Restart application
   - All users must re-authenticate

### 4. Restart Application

```bash
# Development
npm run dev

# Production
pm2 restart hrms-backend
# or
systemctl restart hrms-backend
```

### 5. Verify Rotation

```bash
# Test authentication with new secrets
node scripts/test-endpoints.js
```

### 6. Revoke Old Secrets

- Remove old secrets from environment
- Update secret management service
- Document rotation in audit log

## Emergency Rotation

If secrets are compromised:

1. **Immediately** generate and deploy new secrets
2. Invalidate all existing refresh tokens in database
3. Force all users to re-authenticate
4. Investigate the compromise
5. Update incident response documentation

## Automation (Recommended for Production)

Consider automating secret rotation:

```bash
# Cron job example (every 90 days)
0 0 1 */3 * /path/to/rotate-secrets.sh
```

## Checklist

- [ ] New secrets generated
- [ ] Secrets updated in environment
- [ ] Application restarted
- [ ] Authentication tested
- [ ] Old secrets removed
- [ ] Rotation documented
- [ ] Team notified (for production)

## Security Notes

- Never commit secrets to version control
- Use different secrets for each environment
- Store production secrets in secure vault
- Limit access to production secrets
- Enable audit logging for secret access
- Use strong secrets (minimum 64 bytes)
