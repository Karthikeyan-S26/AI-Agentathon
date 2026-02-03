# 🚀 Quick Start Guide - Multi-Agent System

## Step 1: Install Dependencies

The Multi-Agent System is already integrated into your project. No additional dependencies needed!

## Step 2: Set Up Environment Variables

Create or update your `.env` file:

```env
# Primary API Keys
VITE_NUMVERIFY_API_KEY=your_numverify_api_key
VITE_ABSTRACT_API_KEY=your_abstract_api_key
VITE_WHATSAPP_API_KEY=your_whatsapp_api_key

# Backup API Keys (Optional but recommended)
VITE_NUMVERIFY_BACKUP_KEY=your_backup_numverify_key
VITE_ABSTRACT_BACKUP_KEY=your_backup_abstract_key
VITE_WHATSAPP_BACKUP_KEY=your_backup_whatsapp_key
```

## Step 3: Run the Quick Test

Test the system is working:

```typescript
import { quickTest } from '@/agents/quickTest';

// Run the test
await quickTest();
```

Or in your browser console:

```javascript
import('@/agents/quickTest').then(m => m.quickTest());
```

## Step 4: Use in Your App

The system is already integrated! Just use your existing validation form:

```typescript
import { useValidation } from '@/hooks/useValidation';

function MyComponent() {
  const { validate, result, logs, agentStatuses } = useValidation();
  
  const handleSubmit = async (phoneNumber: string) => {
    await validate(phoneNumber, '+1');
  };
  
  return (
    <div>
      {/* Your existing UI components will automatically use the MAS */}
      <AgentStatusPanel statuses={agentStatuses} />
      <AgentTerminal logs={logs} />
      <ValidationResults result={result} />
    </div>
  );
}
```

## Step 5: Advanced Usage (Optional)

### Direct API Usage

```typescript
import { validatePhoneNumber } from '@/agents';

const result = await validatePhoneNumber('+14155552671', {
  country: 'US',
  prioritizeSpeed: false,
  apiKeys: {
    numverify: 'your_key',
    abstract: 'your_key',
    whatsapp: 'your_key'
  }
});

console.log(result.confidence.score); // 95
```

### Custom Supervisor

```typescript
import { createMultiAgentSystem } from '@/agents';

const supervisor = createMultiAgentSystem({
  numverifyKey: process.env.VITE_NUMVERIFY_API_KEY,
  abstractKey: process.env.VITE_ABSTRACT_API_KEY,
  whatsappKey: process.env.VITE_WHATSAPP_API_KEY,
  enableLogging: true,
  maxExecutionTime: 30000 // 30 seconds
});

const result = await supervisor.validate({
  phoneNumber: '+919876543210',
  country: 'IN',
  userPreferences: {
    prioritizeSpeed: false,
    maxCost: 0.01
  }
});

// Access observability
console.log(supervisor.getChainOfThought());
console.log(supervisor.getChainOfExecution());
```

## 🎯 What You Get

✅ **5 Intelligent Agents** working together
✅ **Automatic retry** with exponential backoff
✅ **Cost optimization** through smart planning
✅ **Confidence scoring** (0-100) with reasoning
✅ **Full observability** (Chain of Thought + Execution)
✅ **Self-healing** with backup API keys
✅ **WhatsApp intelligence** (business/personal detection)
✅ **Cross-validation** for high-risk countries

## 📊 Expected Output

```
🚀 Starting validation for: +14155552671
════════════════════════════════════════════════════════

  PHASE 1: STRATEGIC PLANNING
────────────────────────────────────────────────────────
🧠 [DECISION] Analyzing phone number input...
🧠 [DECISION] Detected country: US
🧠 [DECISION] Risk level: LOW
⚡ [DECISION] Creating execution plan...
📋 Execution Plan:
   1. validation → validate_with_numverify
   2. whatsapp → check_whatsapp_existence
   3. confidence → calculate_confidence_score
   Risk Level: LOW
   Estimated Cost: $0.0025

  PHASE 2: PHONE VALIDATION
────────────────────────────────────────────────────────
⚡ [VALIDATION] Calling NumVerify API...
⚡ [VALIDATION] NumVerify data retrieved successfully
✅ Validation complete: VALID
   Country: United States (US)
   Carrier: AT&T
   Line Type: mobile

  PHASE 3: WHATSAPP INTELLIGENCE
────────────────────────────────────────────────────────
⚡ [WHATSAPP] Querying WhatsApp API...
✅ WhatsApp check: EXISTS
   Verified: Yes
   Business: No

  PHASE 4: CONFIDENCE ANALYSIS
────────────────────────────────────────────────────────
🧠 [CONFIDENCE] Aggregating validation results...
🧠 [CONFIDENCE] Cross-checking data sources...
✅ Confidence Score: 100/100
   Reasoning: High confidence validation, WhatsApp verification adds confidence.
   💡 Recommendations:
      - Data validated across multiple sources
      - WhatsApp account verified - increases confidence

════════════════════════════════════════════════════════
✅ VALIDATION COMPLETE in 856ms
   Final Score: 100/100
   Recommendation: PROCEED - High confidence in validation results
════════════════════════════════════════════════════════
```

## 🔧 Troubleshooting

### Issue: API Keys Not Working

**Solution**: Make sure your environment variables are prefixed with `VITE_`:
```env
VITE_NUMVERIFY_API_KEY=your_key  # ✅ Correct
NUMVERIFY_API_KEY=your_key       # ❌ Wrong
```

### Issue: TypeScript Errors

**Solution**: The types are already defined. Import from `@/agents`:
```typescript
import type { ValidationResult } from '@/agents';
```

### Issue: Agents Not Updating in UI

**Solution**: The `useValidation` hook is already integrated. Make sure you're using:
```typescript
const { validate, agentStatuses, logs } = useValidation();
```

## 📚 Learn More

- **Full Documentation**: [src/agents/README.md](./README.md)
- **Flow Visualization**: [src/agents/FLOW_VISUALIZATION.md](./FLOW_VISUALIZATION.md)
- **Implementation Details**: [AGENTS_IMPLEMENTATION.md](../../AGENTS_IMPLEMENTATION.md)
- **Usage Examples**: [src/agents/examples.ts](./examples.ts)

## 🎉 You're Ready!

The Multi-Agent System is now fully integrated and ready to use. Just start your development server and use the validation form as usual. The agents will work behind the scenes to provide intelligent, reliable phone validation!

```bash
npm run dev
# or
bun dev
```

Visit your app and try validating a phone number. Watch the agents work in real-time! 🚀
