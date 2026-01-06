# Bug Solutions

This document tracks common issues and their solutions for the Crockd Forecasting application.

## Common Issues

### Xero OAuth Issues

#### Token Refresh Failures
**Symptom:** "Not connected to Xero" error after being previously connected.

**Solution:**
1. Check that `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` are correctly set
2. Verify the refresh token hasn't expired (30 days without use)
3. Reconnect by going to Settings > Xero Connection > Connect

#### Redirect URI Mismatch
**Symptom:** OAuth error during callback with "redirect_uri_mismatch"

**Solution:**
1. Ensure `XERO_REDIRECT_URI` matches exactly what's configured in Xero Developer Portal
2. For local development, use `http://localhost:3000/api/xero/callback`
3. For production, update to your actual domain

### Database Issues

#### Prisma Client Not Generated
**Symptom:** "Cannot find module '@prisma/client'" or type errors

**Solution:**
```bash
npx prisma generate
```

#### Migration Pending
**Symptom:** Database queries fail with schema mismatch errors

**Solution:**
```bash
npx prisma migrate dev
# or for production
npx prisma migrate deploy
```

### Build Issues

#### TypeScript Errors
**Symptom:** Build fails with type errors

**Solution:**
1. Run `npm run build` locally to check for errors
2. Ensure all dependencies are installed: `npm install`
3. Check for missing type definitions

### AI Assistant Issues

#### OpenAI API Key Missing
**Symptom:** AI chat returns error messages

**Solution:**
1. Ensure `OPENAI_API_KEY` is set in environment variables
2. Verify the API key is valid and has sufficient credits

#### Tool Execution Failures
**Symptom:** AI returns "Error executing [tool name]"

**Solution:**
1. Check that Xero is connected and synced
2. Verify the database has transaction data
3. Check server logs for specific error details

## Performance Optimization

### Slow Sync
**Issue:** Initial Xero sync takes too long

**Mitigation:**
- Use incremental sync after initial import
- Consider reducing history depth for initial development
- Monitor rate limits (60 requests/minute for Xero)

### Large Table Rendering
**Issue:** Financial statements page slow with many accounts

**Mitigation:**
- Virtualize tables using TanStack Virtual
- Paginate large result sets
- Cache forecast outputs in database
