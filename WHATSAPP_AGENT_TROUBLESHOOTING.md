# WhatsApp Agent Troubleshooting Guide

## Issue: WhatsApp Agent Not Working

### Root Cause
The WhatsApp agent requires Twilio API credentials to function properly. The system was missing the Twilio configuration in the API setup.

### What Was Fixed

1. **Updated APIConfig Interface** ([src/agents/types.ts](src/agents/types.ts))
   - Added `twilio` object with `accountSid`, `authToken`, and `phoneNumber` fields

2. **Updated Factory Function** ([src/agents/index.ts](src/agents/index.ts))
   - Added Twilio credential parameters to `createMultiAgentSystem()`
   - Passes credentials to Supervisor's API config

3. **Updated Hook** ([src/hooks/useValidation.ts](src/hooks/useValidation.ts))
   - Reads Twilio credentials from environment variables
   - Passes them to the multi-agent system

4. **Fixed CSS Import Order** ([src/index.css](src/index.css))
   - Moved `@import` before `@tailwind` directives
   - Resolved Vite build warning

### Required Environment Variables

Create or update your `.env` file with these variables:

```env
# Phone Validation APIs
VITE_NUMVERIFY_API_KEY=ed705840f4a6385021f9820ed9307ee2
VITE_ABSTRACT_API_KEY=fde8ee2d736b486d95feb679212bbcf3

# Twilio Configuration (REQUIRED for WhatsApp)
VITE_TWILIO_ACCOUNT_SID=ACc96686...
VITE_TWILIO_AUTH_TOKEN=fdcd7c9a...
VITE_TWILIO_PHONE_NUMBER=whatsapp:+14155238886
```

⚠️ **IMPORTANT**: Replace the placeholder values with your actual Twilio credentials.

### How to Get Twilio Credentials

1. **Sign up at Twilio**: https://www.twilio.com/
2. **Navigate to Console**: https://console.twilio.com/
3. **Find Account SID and Auth Token** in the dashboard
4. **Get a WhatsApp-enabled number**:
   - Go to "Messaging" → "Try it out" → "Send a WhatsApp message"
   - Use the Twilio Sandbox number: `whatsapp:+14155238886`
   - Or provision your own WhatsApp Business number

### Testing the Fix

1. **Verify .env file exists** with all required variables
2. **Restart the dev server**:
   ```bash
   npm run dev
   ```
3. **Open the app**: http://localhost:8080
4. **Validate a mobile phone number** (e.g., +918123456789)
5. **Check the WhatsApp Agent status** in the Agent Terminal

### Expected Behavior

When working correctly:
- WhatsApp Agent should show "active" status
- Terminal should log: "Checking WhatsApp with rate limiting..."
- Results should show WhatsApp presence status
- Business account detection should display if confidence > 60%

### Common Issues

#### 1. "Twilio authentication failed"
**Cause**: Invalid or missing Twilio credentials  
**Fix**: Double-check `VITE_TWILIO_ACCOUNT_SID` and `VITE_TWILIO_AUTH_TOKEN` in .env

#### 2. WhatsApp check shows "unchecked" or "skipped"
**Cause**: Phone number is not mobile type  
**Expected**: WhatsApp agent only runs for mobile numbers

#### 3. Rate limit errors (429)
**Cause**: Too many requests to Twilio API  
**Fix**: Wait 1 minute between validation requests (rate limit: ~50 req/min)

#### 4. Environment variables not loaded
**Cause**: Vite doesn't hot-reload .env changes  
**Fix**: Restart the dev server after modifying .env

### Verification Checklist

- [ ] .env file exists in project root
- [ ] All VITE_TWILIO_* variables are set
- [ ] Dev server restarted after .env changes
- [ ] No TypeScript compilation errors
- [ ] Browser console shows no API errors
- [ ] WhatsApp Agent appears in Agent Terminal
- [ ] Mobile numbers trigger WhatsApp check

### Debug Mode

To see detailed WhatsApp agent logs:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter by "WhatsApp" or "Twilio"
4. Look for:
   ```
   ✅ WhatsApp check: EXISTS / NOT FOUND
      Business: Yes/No
      Business Confidence: XX%
   ```

### API Cost Per Validation

- NumVerify: $0.001
- Twilio Lookup v2: $0.005
- **Total: ~$0.011** per validation

### Additional Resources

- [Twilio Lookup API Docs](https://www.twilio.com/docs/lookup/v2-api)
- [WhatsApp Integration Guide](./WHATSAPP_INTEGRATION.md)
- [Agent System Architecture](./AGENTS_IMPLEMENTATION.md)

---

**Status**: ✅ Fixed  
**Date**: February 4, 2026  
**Version**: 1.0.1
