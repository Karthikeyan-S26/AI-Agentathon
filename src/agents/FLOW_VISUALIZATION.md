# Multi-Agent System - Agent Flow Visualization

## 🔄 Complete Execution Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                │
│                  validate('+14155552671')                          │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                       🎯 SUPERVISOR                                 │
│                   (Orchestrator Master)                             │
│  • Creates session ID                                               │
│  • Initializes all agents                                           │
│  • Manages execution flow                                           │
│  • Collects Chain of Thought/Execution                             │
└────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   PHASE 1: PLAN   │
                    └─────────┬─────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    🧠 DECISION AGENT                                │
│                 (Strategic Orchestrator)                            │
│                                                                     │
│  INPUT: Phone number, country                                       │
│                                                                     │
│  THINK:                                                             │
│    • Detect country code                                            │
│    • Analyze risk level                                             │
│    • Check landline probability                                     │
│    • Calculate cost optimization                                    │
│                                                                     │
│  DECIDE:                                                            │
│    ├─ High Risk (NG, PK, IN)?                                      │
│    │  └─> Use BOTH NumVerify + Abstract                            │
│    ├─ Landline Likely?                                             │
│    │  └─> SKIP WhatsApp check                                      │
│    └─ Mobile + Low Risk?                                           │
│       └─> Use NumVerify + WhatsApp                                 │
│                                                                     │
│  OUTPUT: ExecutionPlan                                              │
│    • Steps: [validate, whatsapp?, confidence]                      │
│    • Risk Level: low/medium/high                                    │
│    • Estimated Cost: $0.0025                                        │
│    • Skip WhatsApp: true/false                                      │
│    • Reasoning: ["High-risk country...", ...]                      │
└────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴───────────┐
                    │   PHASE 2: VALIDATE │
                    └─────────┬───────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                   ✅ VALIDATION AGENT                               │
│                 (Technical Data Extractor)                          │
│                       ReAct Pattern                                 │
│                                                                     │
│  INPUT: Phone number, tools: ['numverify', 'abstract']             │
│                                                                     │
│  REASON:                                                            │
│    • Determine which APIs to call                                   │
│    • Parse phone number format                                      │
│    • Plan API call sequence                                         │
│                                                                     │
│  ACT:                                                               │
│    Step 1: Call NumVerify API                                       │
│    ┌──────────────────────────────────┐                            │
│    │ GET numverify.com/validate       │                            │
│    │ Response: {                      │                            │
│    │   valid: true,                   │                            │
│    │   carrier: "AT&T",               │                            │
│    │   line_type: "mobile",           │                            │
│    │   country_code: "US"             │                            │
│    │ }                                │                            │
│    └──────────────────────────────────┘                            │
│         │                                                           │
│         ├─ Success? ✓                                               │
│         └─ Continue                                                 │
│                                                                     │
│    Step 2: Call Abstract API (if high-risk)                        │
│    ┌──────────────────────────────────┐                            │
│    │ GET abstractapi.com/validate     │                            │
│    │ Response: {                      │                            │
│    │   valid: true,                   │                            │
│    │   carrier: "AT&T Mobility",      │                            │
│    │   type: "mobile"                 │                            │
│    │ }                                │                            │
│    └──────────────────────────────────┘                            │
│         │                                                           │
│         ├─ Success? ✓                                               │
│         └─ Aggregate results                                        │
│                                                                     │
│  OBSERVE:                                                           │
│    • Both APIs agree on carrier                                     │
│    • Line type confirmed as mobile                                  │
│    • No conflicts detected                                          │
│                                                                     │
│  OUTPUT: ValidationData                                             │
│    • valid: true                                                    │
│    • carrier: "AT&T"                                                │
│    • lineType: "mobile"                                             │
│    • country: "US"                                                  │
│    • source: "both"                                                 │
└────────────────────────────────────────────────────────────────────┘
            │                              │
            │                              │ (If API fails)
            │                              ▼
            │               ┌────────────────────────────┐
            │               │    🔄 RETRY AGENT          │
            │               │  (Resilience Engineer)     │
            │               │                            │
            │               │  Attempt 1: Wait 2s        │
            │               │  Attempt 2: Wait 4s + swap │
            │               │  Attempt 3: Wait 8s        │
            │               │                            │
            │               │  • Exponential backoff     │
            │               │  • Switch to backup key    │
            │               │  • Track retry count       │
            │               └────────────────────────────┘
            │                              │
            └──────────────┬───────────────┘
                           │ (Success or Failure)
                           ▼
              ┌─────────────────────────┐
              │  PHASE 3: WHATSAPP      │
              │  (Conditional)          │
              └─────────┬───────────────┘
                        ▼
┌────────────────────────────────────────────────────────────────────┐
│                   💬 WHATSAPP AGENT                                 │
│                (Intelligence Gatherer)                              │
│                     ReAct Pattern                                   │
│                                                                     │
│  CONDITION: IF lineType == 'mobile' AND NOT skipWhatsApp           │
│                                                                     │
│  REASON:                                                            │
│    • Number is mobile - likely on WhatsApp                          │
│    • Check existence first                                          │
│    • Gather metadata if exists                                      │
│                                                                     │
│  ACT:                                                               │
│    ┌──────────────────────────────────┐                            │
│    │ POST whatsapp.com/check          │                            │
│    │ Response: {                      │                            │
│    │   exists: true,                  │                            │
│    │   verified: true,                │                            │
│    │   business: false,               │                            │
│    │   profile_pic: true              │                            │
│    │ }                                │                            │
│    └──────────────────────────────────┘                            │
│                                                                     │
│  OBSERVE:                                                           │
│    • Number exists on WhatsApp ✓                                    │
│    • Verified account ✓                                             │
│    • Not a business account                                         │
│                                                                     │
│  OUTPUT: WhatsAppData                                               │
│    • exists: true                                                   │
│    • verified: true                                                 │
│    • businessAccount: false                                         │
└────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │  PHASE 4: SCORING  │
                    └─────────┬──────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                   📊 CONFIDENCE AGENT                               │
│                   (Quality Controller)                              │
│                Aggregator/Evaluator Pattern                         │
│                                                                     │
│  INPUT:                                                             │
│    • ValidationData (from Validation Agent)                         │
│    • WhatsAppData (from WhatsApp Agent)                             │
│    • RetryContext (from Retry Agent)                                │
│    • ExecutionPlan (from Decision Agent)                            │
│                                                                     │
│  ANALYZE:                                                           │
│                                                                     │
│    1. Validation Quality Check                                      │
│       ├─ Valid? ✓                                                   │
│       ├─ Line type known? ✓                                         │
│       └─ Deduction: 0                                               │
│                                                                     │
│    2. Carrier Data Cross-Check                                      │
│       ├─ NumVerify: "AT&T"                                          │
│       ├─ Abstract: "AT&T Mobility"                                  │
│       ├─ Match? ✓ (similar enough)                                  │
│       └─ Deduction: 0                                               │
│                                                                     │
│    3. Retry Analysis                                                │
│       ├─ Retries: 0                                                 │
│       └─ Deduction: 0                                               │
│                                                                     │
│    4. WhatsApp Cross-Validation                                     │
│       ├─ Exists? ✓                                                  │
│       ├─ Verified? ✓                                                │
│       ├─ Business? ✗                                                │
│       └─ Bonus: +5 (verified) = +5                                  │
│                                                                     │
│    5. Risk Assessment                                               │
│       ├─ Risk Level: low                                            │
│       ├─ Validation: single-source (OK for low-risk)               │
│       └─ Deduction: 0                                               │
│                                                                     │
│  CALCULATE:                                                         │
│    Base Score:           100                                        │
│    - Carrier Conflict:    -0                                        │
│    - Retry Penalty:       -0                                        │
│    + WhatsApp Bonus:      +5                                        │
│    ─────────────────────────                                        │
│    Final Score:           105 → capped at 100                       │
│                                                                     │
│  REASONING:                                                         │
│    "High confidence validation, WhatsApp verification adds          │
│     confidence, data validated across multiple sources."            │
│                                                                     │
│  OUTPUT: ConfidenceScore                                            │
│    • score: 100                                                     │
│    • reasoning: "High confidence..."                                │
│    • discrepancies: []                                              │
│    • recommendations: [                                             │
│        "Data validated across multiple sources",                    │
│        "WhatsApp account verified - increases confidence"           │
│      ]                                                              │
│    • breakdown: {                                                   │
│        baseScore: 100,                                              │
│        carrierDeduction: 0,                                         │
│        retryDeduction: 0,                                           │
│        whatsappBonus: 5                                             │
│      }                                                              │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                      🎯 SUPERVISOR                                  │
│                  (Aggregates Final Result)                          │
│                                                                     │
│  COLLECT:                                                           │
│    • ValidationData from Validation Agent                           │
│    • WhatsAppData from WhatsApp Agent                               │
│    • ConfidenceScore from Confidence Agent                          │
│    • ExecutionPlan from Decision Agent                              │
│    • All agent states and logs                                      │
│                                                                     │
│  COMPILE:                                                           │
│    Chain of Thought: [                                              │
│      "[decision] Analyzing phone number...",                        │
│      "[decision] Detected country: US",                             │
│      "[validation] Calling NumVerify API...",                       │
│      "[validation] Data retrieved successfully",                    │
│      "[whatsapp] Number exists on WhatsApp",                        │
│      "[confidence] Cross-checking data sources..."                  │
│    ]                                                                │
│                                                                     │
│    Chain of Execution: [                                            │
│      "Decision Agent: Created 3-step plan",                         │
│      "Validation Agent: Retrieved data from numverify",             │
│      "WhatsApp Agent: Found",                                       │
│      "Confidence Agent: Score 100/100"                              │
│    ]                                                                │
│                                                                     │
│  OUTPUT: ValidationResult                                           │
│    • phoneNumber: "+14155552671"                                    │
│    • validation: { valid, carrier, lineType, ... }                  │
│    • whatsapp: { exists, verified, ... }                            │
│    • confidence: { score: 100, reasoning, ... }                     │
│    • executionPlan: { steps, cost, ... }                            │
│    • totalExecutionTime: 856ms                                      │
│    • chainOfThought: [...]                                          │
│    • chainOfExecution: [...]                                        │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   RETURN TO UI   │
                    │                 │
                    │  • Display       │
                    │    results       │
                    │  • Show logs     │
                    │  • Update        │
                    │    agents        │
                    └─────────────────┘
```

## 🎭 Agent Communication

```
Decision Agent
      │
      │ ExecutionPlan
      ▼
Validation Agent ◄────► Retry Agent
      │                     │
      │ ValidationData      │ RetryContext
      ▼                     ▼
WhatsApp Agent ◄────────► Retry Agent
      │
      │ WhatsAppData
      ▼
Confidence Agent
      │
      │ ConfidenceScore
      ▼
  Supervisor
      │
      │ ValidationResult
      ▼
     UI
```

## 🧩 Data Flow

```
Phone Number
    │
    ├─→ Decision Agent
    │       └─→ ExecutionPlan
    │
    ├─→ Validation Agent
    │       ├─→ NumVerify API
    │       ├─→ Abstract API
    │       └─→ ValidationData
    │
    ├─→ WhatsApp Agent
    │       ├─→ WhatsApp API
    │       └─→ WhatsAppData
    │
    └─→ Confidence Agent
            ├─→ ValidationData
            ├─→ WhatsAppData
            ├─→ RetryContext
            └─→ ConfidenceScore
                    │
                    └─→ Final Result
```

## 🔄 Retry Flow

```
API Call Fails (401/403/429/timeout)
        │
        ▼
Retry Agent Activated
        │
        ├─→ Attempt 1 (2s backoff)
        │   ├─ Use primary key
        │   └─ Fails? → Continue
        │
        ├─→ Attempt 2 (4s backoff)
        │   ├─ Switch to BACKUP key
        │   └─ Fails? → Continue
        │
        └─→ Attempt 3 (8s backoff)
            ├─ Use backup key
            └─ Fails? → System Failure
```

## 📊 Confidence Scoring Flow

```
Base Score: 100
    │
    ├─→ Check validation success
    │   └─ Failed? -15
    │
    ├─→ Check carrier conflicts
    │   └─ Conflict? -20
    │
    ├─→ Count retry attempts
    │   └─ Each retry: -10
    │
    ├─→ Check WhatsApp verification
    │   ├─ Verified? +5
    │   └─ Business? +3
    │
    ├─→ Check WhatsApp skipped
    │   └─ Skipped? -5
    │
    └─→ Final Score (0-100)
```
