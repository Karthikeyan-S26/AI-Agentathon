# IntelliValidate Pro

## Multi-Agent Phone Validation System

A production-ready phone validation system powered by a sophisticated Multi-Agent System (MAS) architecture. Built with TypeScript, React, and modern agent-based patterns for intelligent phone number validation, carrier detection, and WhatsApp verification.

## Project Overview

**Repository**: https://github.com/Karthikeyan-S26/AI-Agentathon

## Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js 18+ and npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Git for version control

### Local Development

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

```bash
# Clone the repository
git clone https://github.com/Karthikeyan-S26/AI-Agentathon.git
cd AI-Agentathon

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys

# Start development server
npm run dev
```

The app will be available at http://localhost:8080

### Environment Configuration

Create a `.env` file with the following:

```env
VITE_NUMVERIFY_API_KEY=your_numverify_key
VITE_ABSTRACT_API_KEY=your_abstract_key
VITE_WHATSAPP_API_KEY=your_whatsapp_key
```

**Note**: Demo keys are included for testing. For production, obtain real API keys from:
- NumVerify: https://numverify.com/
- Abstract API: https://www.abstractapi.com/
- WhatsApp Business API: https://business.whatsapp.com/

## Technology Stack

### Core Technologies
- **Vite** - Lightning-fast build tool
- **TypeScript** - Type-safe development
- **React 18** - Modern UI framework
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Premium component library

### Multi-Agent System
- **Decision Agent** - Plan-and-Execute pattern
- **Validation Agent** - ReAct pattern with dual-API support
- **WhatsApp Agent** - ReAct pattern for social verification
- **Retry Agent** - Exponential backoff with failover
- **Confidence Agent** - Aggregator/Evaluator pattern
- **Supervisor** - Master orchestration layer

## Architecture

### Agent Patterns

1. **ReAct Pattern** (Reason + Act)
   - Validation Agent: Analyzes number patterns
   - WhatsApp Agent: Intelligent social verification

2. **Plan-and-Execute Pattern**
   - Decision Agent: Strategic planning before execution
   - Risk assessment and cost optimization

3. **Aggregator/Evaluator Pattern**
   - Confidence Agent: Cross-validates all data sources
   - 0-100 scoring with detailed reasoning

### System Flow

```
User Input → Decision Agent → Validation Agent → WhatsApp Agent → Confidence Agent → Results
                    ↓              ↓                  ↓                ↓
                Planning     Dual APIs         Social Check      Scoring
                    ↓              ↓                  ↓                ↓
                          Retry Agent (if needed)
```

## Features

✅ **Intelligent Carrier Detection** - Pattern-based analysis for global carriers
✅ **Multi-API Validation** - NumVerify + Abstract API with automatic failover
✅ **WhatsApp Verification** - Business account detection
✅ **Real-time Agent Status** - Visual feedback for all agent activities
✅ **Chain of Thought Logging** - Complete reasoning trace
✅ **Chain of Execution** - Action audit trail
✅ **Demo Mode** - Works offline with mock data
✅ **Cost Optimization** - Smart API selection
✅ **Confidence Scoring** - 0-100 score with breakdown

## Testing

### Unit Tests
```bash
npm run test
```

### Interactive Test Page
Open http://localhost:8080/test-agents.html for a full demo with:
- Real-time agent status cards
- Chain of Thought visualization
- Chain of Execution logging
- Statistics tracking

### Test Numbers
- **India**: +91-893-953-3725 (Vodafone Idea)
- **Dominican Republic**: 809-820-5027 (Claro)
- **US**: +1-415-555-0123 (AT&T)
- **UK**: +44-7912-345678 (Vodafone UK)

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel --prod
```

### Deploy to Netlify
```bash
netlify deploy --prod
```

## Documentation

- [Multi-Agent System Overview](src/agents/README.md)
- [Quick Start Guide](src/agents/QUICK_START.md)
- [Flow Visualization](src/agents/FLOW_VISUALIZATION.md)
- [Implementation Details](AGENTS_IMPLEMENTATION.md)

## Project Structure

```
src/
├── agents/                  # Multi-Agent System
│   ├── core/               # Base agent class
│   ├── decision/           # Decision agent
│   ├── validation/         # Validation agent
│   ├── whatsapp/          # WhatsApp agent
│   ├── retry/             # Retry agent
│   ├── confidence/        # Confidence agent
│   ├── supervisor/        # Orchestration layer
│   └── observability/     # Logging system
├── components/            # React components
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
└── types/                 # TypeScript definitions
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Author

Karthikeyan S - [GitHub](https://github.com/Karthikeyan-S26)

## Acknowledgments

Built with modern agent-based architecture patterns and production-ready engineering practices.
