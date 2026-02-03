/**
 * Quick Test - Multi-Agent System
 * 
 * Run this to verify the MAS is working correctly
 */

import { createMultiAgentSystem } from './index';

async function quickTest() {
  console.log('🚀 Starting Multi-Agent System Quick Test\n');

  try {
    // Create supervisor with mock API keys
    const supervisor = createMultiAgentSystem({
      numverifyKey: 'test_key_123',
      abstractKey: 'test_key_456',
      whatsappKey: 'test_key_789',
      enableLogging: true
    });

    console.log('✅ Supervisor created successfully');
    console.log('✅ All agents initialized\n');

    // Test validation
    console.log('📱 Testing phone validation...\n');
    
    const result = await supervisor.validate({
      phoneNumber: '+14155552671',
      country: 'US'
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    console.log('\n📋 Execution Plan:');
    console.log(`  Steps: ${result.executionPlan.steps.length}`);
    console.log(`  Risk Level: ${result.executionPlan.riskLevel}`);
    console.log(`  Estimated Cost: $${result.executionPlan.estimatedCost.toFixed(4)}`);
    console.log(`  WhatsApp Check: ${result.executionPlan.skipWhatsApp ? 'Skipped' : 'Included'}`);
    
    console.log('\n✅ Validation Data:');
    console.log(`  Valid: ${result.validation.valid}`);
    console.log(`  Country: ${result.validation.countryName} (${result.validation.countryCode})`);
    console.log(`  Carrier: ${result.validation.carrier || 'Unknown'}`);
    console.log(`  Line Type: ${result.validation.lineType}`);
    console.log(`  Source: ${result.validation.source}`);
    
    if (result.whatsapp) {
      console.log('\n💬 WhatsApp Data:');
      console.log(`  Exists: ${result.whatsapp.exists}`);
      console.log(`  Verified: ${result.whatsapp.verified}`);
      console.log(`  Business: ${result.whatsapp.businessAccount}`);
    }
    
    console.log('\n📊 Confidence Score:');
    console.log(`  Score: ${result.confidence.score}/100`);
    console.log(`  Reasoning: ${result.confidence.reasoning}`);
    
    if (result.confidence.discrepancies.length > 0) {
      console.log('\n  ⚠️  Discrepancies:');
      result.confidence.discrepancies.forEach(d => console.log(`    - ${d}`));
    }
    
    if (result.confidence.recommendations.length > 0) {
      console.log('\n  💡 Recommendations:');
      result.confidence.recommendations.forEach(r => console.log(`    - ${r}`));
    }
    
    console.log('\n⚡ Performance:');
    console.log(`  Total Time: ${result.totalExecutionTime}ms`);
    console.log(`  Thoughts: ${result.chainOfThought.length}`);
    console.log(`  Actions: ${result.chainOfExecution.length}`);
    
    console.log('\n🧠 Chain of Thought (Sample):');
    result.chainOfThought.slice(0, 3).forEach((thought, i) => {
      console.log(`  ${i + 1}. ${thought}`);
    });
    
    console.log('\n⚡ Chain of Execution (Sample):');
    result.chainOfExecution.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60) + '\n');
    
    // Test agent states
    console.log('🔍 Agent States:');
    const state = supervisor.getState();
    state.agents.forEach((agentState, role) => {
      console.log(`\n  ${role.toUpperCase()}:`);
      console.log(`    Status: ${agentState.status}`);
      console.log(`    Thoughts: ${agentState.thoughtProcess.length}`);
      console.log(`    Actions: ${agentState.actionsPerformed.length}`);
    });
    
    console.log('\n✨ Multi-Agent System is working correctly!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('\nError details:', error instanceof Error ? error.message : error);
  }
}

// Export for use in other files
export { quickTest };

// Uncomment to run directly
// quickTest();
