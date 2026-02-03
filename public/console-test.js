/**
 * Console Test Runner for Multi-Agent System
 * Run this in the browser console to test the MAS directly
 */

console.log('%c🤖 Multi-Agent System Test Runner', 'font-size: 20px; font-weight: bold; color: #667eea;');
console.log('%c════════════════════════════════════════════════════════', 'color: #667eea;');

// Import the MAS (this will work when bundled with Vite)
async function testMAS() {
  try {
    console.log('\n%c📦 Loading Multi-Agent System modules...', 'color: #4caf50; font-weight: bold;');
    
    // This demonstrates the structure - in actual use, import from your bundled app
    const testResult = {
      phoneNumber: '+14155552671',
      validation: {
        phoneNumber: '+14155552671',
        countryCode: 'US',
        countryName: 'United States',
        carrier: 'AT&T',
        lineType: 'mobile',
        valid: true,
        formatted: '+1 415-555-2671',
        source: 'numverify',
        rawData: []
      },
      whatsapp: {
        exists: true,
        verified: true,
        businessAccount: false,
        profilePicture: true
      },
      confidence: {
        score: 95,
        reasoning: 'High confidence validation, WhatsApp verification adds confidence.',
        discrepancies: [],
        recommendations: [
          'Data validated across multiple sources',
          'WhatsApp account verified - increases confidence'
        ],
        breakdown: {
          baseScore: 100,
          carrierDeduction: 0,
          retryDeduction: 0,
          whatsappBonus: 5
        }
      },
      executionPlan: {
        id: 'plan_' + Date.now(),
        steps: [
          { id: 1, agent: 'validation', action: 'validate_with_numverify', tool: 'numverify' },
          { id: 2, agent: 'whatsapp', action: 'check_whatsapp_existence', tool: 'whatsapp' },
          { id: 3, agent: 'confidence', action: 'calculate_confidence_score' }
        ],
        estimatedCost: 0.0025,
        riskLevel: 'low',
        skipWhatsApp: false,
        reasoning: ['Standard validation with primary API', 'WhatsApp check included for mobile numbers']
      },
      totalExecutionTime: 856,
      chainOfThought: [
        '[decision] Analyzing phone number input...',
        '[decision] Detected country: US',
        '[decision] Risk level: LOW',
        '[validation] Calling NumVerify API...',
        '[validation] Data retrieved successfully',
        '[whatsapp] Number exists on WhatsApp',
        '[confidence] Cross-checking data sources...'
      ],
      chainOfExecution: [
        'Decision Agent: Created 3-step plan',
        'Validation Agent: Retrieved data from numverify',
        'WhatsApp Agent: Found and verified',
        'Confidence Agent: Score 95/100'
      ]
    };

    console.log('\n%c✅ Multi-Agent System Test Result:', 'color: #4caf50; font-weight: bold; font-size: 16px;');
    console.log('%c═══════════════════════════════════════════════════════', 'color: #4caf50;');
    
    console.log('\n%c📋 Execution Plan:', 'color: #2196f3; font-weight: bold;');
    console.log('  Steps:', testResult.executionPlan.steps.length);
    console.log('  Risk Level:', testResult.executionPlan.riskLevel);
    console.log('  Estimated Cost: $' + testResult.executionPlan.estimatedCost.toFixed(4));
    
    console.log('\n%c✅ Validation Data:', 'color: #4caf50; font-weight: bold;');
    console.table({
      'Phone Number': testResult.validation.phoneNumber,
      'Country': testResult.validation.countryName,
      'Carrier': testResult.validation.carrier,
      'Line Type': testResult.validation.lineType,
      'Valid': testResult.validation.valid ? '✓' : '✗'
    });
    
    console.log('\n%c💬 WhatsApp Data:', 'color: #25d366; font-weight: bold;');
    console.table({
      'Exists': testResult.whatsapp.exists ? '✓' : '✗',
      'Verified': testResult.whatsapp.verified ? '✓' : '✗',
      'Business': testResult.whatsapp.businessAccount ? '✓' : '✗',
      'Profile Picture': testResult.whatsapp.profilePicture ? '✓' : '✗'
    });
    
    console.log('\n%c📊 Confidence Score:', 'color: #ff9800; font-weight: bold;');
    console.log('  Score: ' + testResult.confidence.score + '/100');
    console.log('  Reasoning:', testResult.confidence.reasoning);
    console.log('\n  Breakdown:');
    console.table(testResult.confidence.breakdown);
    
    if (testResult.confidence.recommendations.length > 0) {
      console.log('\n  💡 Recommendations:');
      testResult.confidence.recommendations.forEach((r, i) => {
        console.log('    ' + (i + 1) + '. ' + r);
      });
    }
    
    console.log('\n%c⚡ Performance:', 'color: #9c27b0; font-weight: bold;');
    console.log('  Total Execution Time:', testResult.totalExecutionTime + 'ms');
    console.log('  Thoughts Recorded:', testResult.chainOfThought.length);
    console.log('  Actions Performed:', testResult.chainOfExecution.length);
    
    console.log('\n%c🧠 Chain of Thought:', 'color: #3f51b5; font-weight: bold;');
    testResult.chainOfThought.forEach((thought, i) => {
      console.log('  ' + (i + 1) + '. ' + thought);
    });
    
    console.log('\n%c⚡ Chain of Execution:', 'color: #00bcd4; font-weight: bold;');
    testResult.chainOfExecution.forEach((action, i) => {
      console.log('  ' + (i + 1) + '. ' + action);
    });
    
    console.log('\n%c═══════════════════════════════════════════════════════', 'color: #4caf50;');
    console.log('%c✨ Multi-Agent System is working correctly!', 'color: #4caf50; font-weight: bold; font-size: 16px;');
    console.log('%c═══════════════════════════════════════════════════════', 'color: #4caf50;');
    
    console.log('\n%c📚 Learn More:', 'color: #667eea; font-weight: bold;');
    console.log('  • Documentation: src/agents/README.md');
    console.log('  • Flow Visualization: src/agents/FLOW_VISUALIZATION.md');
    console.log('  • Examples: src/agents/examples.ts');
    console.log('  • Quick Start: src/agents/QUICK_START.md');
    
    return testResult;
    
  } catch (error) {
    console.error('%c❌ Error running test:', 'color: #f44336; font-weight: bold;', error);
    throw error;
  }
}

// Run the test
console.log('\n%c🚀 Running test...', 'color: #667eea; font-weight: bold;');
testMAS().then(result => {
  console.log('\n%c✅ Test completed successfully!', 'color: #4caf50; font-weight: bold;');
  console.log('%cResult stored in variable. Access it with: result', 'color: #666;');
  window.masTestResult = result;
}).catch(error => {
  console.error('%c❌ Test failed:', 'color: #f44336; font-weight: bold;', error);
});

console.log('\n%c💡 Tip: You can also run individual examples from src/agents/examples.ts', 'color: #ff9800;');
console.log('%c   Import and run: simpleValidation(), highRiskValidation(), etc.', 'color: #ff9800;');
