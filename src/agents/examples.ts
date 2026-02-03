/**
 * Multi-Agent System Demo
 * 
 * Example usage of the phone validation MAS
 */

import { 
  createMultiAgentSystem, 
  validatePhoneNumber,
  Supervisor 
} from './index';

/**
 * EXAMPLE 1: Simple one-liner validation
 */
async function simpleValidation() {
  console.log('=== EXAMPLE 1: Simple Validation ===\n');
  
  const result = await validatePhoneNumber('+14155552671', {
    country: 'US',
    apiKeys: {
      numverify: process.env.NUMVERIFY_API_KEY,
      abstract: process.env.ABSTRACT_API_KEY,
      whatsapp: process.env.WHATSAPP_API_KEY
    }
  });

  console.log('Validation Result:');
  console.log(`  Valid: ${result.validation.valid}`);
  console.log(`  Carrier: ${result.validation.carrier}`);
  console.log(`  Line Type: ${result.validation.lineType}`);
  console.log(`  WhatsApp: ${result.whatsapp?.exists ? 'Yes' : 'No'}`);
  console.log(`  Confidence: ${result.confidence.score}/100`);
  console.log(`  Execution Time: ${result.totalExecutionTime}ms`);
}

/**
 * EXAMPLE 2: High-risk country with dual validation
 */
async function highRiskValidation() {
  console.log('\n=== EXAMPLE 2: High-Risk Country ===\n');
  
  const supervisor = createMultiAgentSystem({
    numverifyKey: process.env.NUMVERIFY_API_KEY,
    abstractKey: process.env.ABSTRACT_API_KEY,
    whatsappKey: process.env.WHATSAPP_API_KEY,
    enableLogging: true
  });

  const result = await supervisor.validate({
    phoneNumber: '+2349012345678', // Nigeria (high-risk)
  });

  console.log('\nExecution Plan:');
  console.log(`  Risk Level: ${result.executionPlan.riskLevel}`);
  console.log(`  Steps: ${result.executionPlan.steps.length}`);
  console.log(`  Estimated Cost: $${result.executionPlan.estimatedCost.toFixed(4)}`);
  
  console.log('\nValidation Sources:');
  console.log(`  Used: ${result.validation.source}`);
  
  console.log('\nConfidence Analysis:');
  console.log(`  Score: ${result.confidence.score}/100`);
  console.log(`  Reasoning: ${result.confidence.reasoning}`);
  
  if (result.confidence.discrepancies.length > 0) {
    console.log('\n  Discrepancies:');
    result.confidence.discrepancies.forEach(d => console.log(`    - ${d}`));
  }
}

/**
 * EXAMPLE 3: Landline detection (WhatsApp skipped)
 */
async function landlineValidation() {
  console.log('\n=== EXAMPLE 3: Landline Detection ===\n');
  
  const supervisor = createMultiAgentSystem({
    numverifyKey: process.env.NUMVERIFY_API_KEY,
    abstractKey: process.env.ABSTRACT_API_KEY,
    enableLogging: true
  });

  // German landline
  const result = await supervisor.validate({
    phoneNumber: '+493012345678',
    country: 'DE'
  });

  console.log('Plan Decision:');
  console.log(`  WhatsApp Check: ${result.executionPlan.skipWhatsApp ? 'SKIPPED' : 'INCLUDED'}`);
  console.log(`  Reason: ${result.executionPlan.reasoning.join(', ')}`);
  
  console.log('\nValidation:');
  console.log(`  Line Type: ${result.validation.lineType}`);
  console.log(`  Valid: ${result.validation.valid}`);
}

/**
 * EXAMPLE 4: Retry mechanism demonstration
 */
async function retryDemo() {
  console.log('\n=== EXAMPLE 4: Retry Mechanism ===\n');
  
  const supervisor = createMultiAgentSystem({
    numverifyKey: 'invalid_key', // Will fail
    numverifyBackupKey: process.env.NUMVERIFY_API_KEY, // Backup will succeed
    abstractKey: process.env.ABSTRACT_API_KEY,
    enableLogging: true
  });

  try {
    const result = await supervisor.validate({
      phoneNumber: '+14155552671'
    });

    console.log('Retry Information:');
    const retryLogs = result.chainOfExecution.filter(e => e.includes('Retry'));
    console.log(`  Retry Attempts: ${retryLogs.length}`);
    
    console.log('\nFinal Result:');
    console.log(`  Success: ${result.validation.valid}`);
    console.log(`  Confidence: ${result.confidence.score}/100`);
    console.log(`  Note: Score reduced by 10 points per retry`);
    
  } catch (error) {
    console.error('System failure after all retries');
  }
}

/**
 * EXAMPLE 5: Chain of Thought & Execution
 */
async function observabilityDemo() {
  console.log('\n=== EXAMPLE 5: Observability ===\n');
  
  const supervisor = createMultiAgentSystem({
    numverifyKey: process.env.NUMVERIFY_API_KEY,
    abstractKey: process.env.ABSTRACT_API_KEY,
    whatsappKey: process.env.WHATSAPP_API_KEY,
    enableLogging: false // We'll display manually
  });

  const result = await supervisor.validate({
    phoneNumber: '+919876543210',
    country: 'IN'
  });

  console.log('Chain of Thought (Reasoning):');
  result.chainOfThought.forEach((thought, i) => {
    console.log(`  ${i + 1}. ${thought}`);
  });

  console.log('\nChain of Execution (Actions):');
  result.chainOfExecution.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action}`);
  });

  console.log('\nState Inspection:');
  const state = supervisor.getState();
  console.log(`  Session ID: ${state.sessionId}`);
  console.log(`  Agents: ${state.agents.size}`);
  
  state.agents.forEach((agentState, role) => {
    console.log(`\n  ${role.toUpperCase()}:`);
    console.log(`    Status: ${agentState.status}`);
    console.log(`    Thoughts: ${agentState.thoughtProcess.length}`);
    console.log(`    Actions: ${agentState.actionsPerformed.length}`);
  });
}

/**
 * EXAMPLE 6: Confidence scoring breakdown
 */
async function confidenceBreakdown() {
  console.log('\n=== EXAMPLE 6: Confidence Scoring ===\n');
  
  const supervisor = createMultiAgentSystem({
    numverifyKey: process.env.NUMVERIFY_API_KEY,
    abstractKey: process.env.ABSTRACT_API_KEY,
    whatsappKey: process.env.WHATSAPP_API_KEY,
    enableLogging: true
  });

  const result = await supervisor.validate({
    phoneNumber: '+14155552671'
  });

  console.log('Confidence Score Breakdown:');
  console.log(`  Base Score: ${result.confidence.breakdown.baseScore}`);
  console.log(`  Carrier Deduction: -${result.confidence.breakdown.carrierDeduction}`);
  console.log(`  Retry Deduction: -${result.confidence.breakdown.retryDeduction}`);
  console.log(`  WhatsApp Bonus: +${result.confidence.breakdown.whatsappBonus}`);
  console.log(`  ─────────────────────────`);
  console.log(`  Final Score: ${result.confidence.score}/100`);
  
  console.log('\nReasoning:');
  console.log(`  ${result.confidence.reasoning}`);
  
  if (result.confidence.recommendations.length > 0) {
    console.log('\nRecommendations:');
    result.confidence.recommendations.forEach(r => console.log(`  • ${r}`));
  }
}

/**
 * EXAMPLE 7: Custom preferences
 */
async function customPreferences() {
  console.log('\n=== EXAMPLE 7: Custom Preferences ===\n');
  
  const supervisor = createMultiAgentSystem({
    numverifyKey: process.env.NUMVERIFY_API_KEY,
    abstractKey: process.env.ABSTRACT_API_KEY,
    whatsappKey: process.env.WHATSAPP_API_KEY,
    maxExecutionTime: 10000, // 10 seconds max
    enableLogging: true
  });

  // Speed-optimized validation
  const result1 = await supervisor.validate({
    phoneNumber: '+14155552671',
    userPreferences: {
      prioritizeSpeed: true, // Skips WhatsApp
      maxCost: 0.001
    }
  });

  console.log('Speed Mode:');
  console.log(`  WhatsApp: ${result1.executionPlan.skipWhatsApp ? 'Skipped' : 'Checked'}`);
  console.log(`  Time: ${result1.totalExecutionTime}ms`);
  console.log(`  Cost: $${result1.executionPlan.estimatedCost.toFixed(4)}`);

  // Reset for next validation
  supervisor.reset();

  // Accuracy-optimized validation
  const result2 = await supervisor.validate({
    phoneNumber: '+14155552671',
    userPreferences: {
      prioritizeSpeed: false,
      maxCost: 0.01
    }
  });

  console.log('\nAccuracy Mode:');
  console.log(`  WhatsApp: ${result2.executionPlan.skipWhatsApp ? 'Skipped' : 'Checked'}`);
  console.log(`  Time: ${result2.totalExecutionTime}ms`);
  console.log(`  Cost: $${result2.executionPlan.estimatedCost.toFixed(4)}`);
  console.log(`  Confidence: ${result2.confidence.score}/100`);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await simpleValidation();
    await highRiskValidation();
    await landlineValidation();
    await retryDemo();
    await observabilityDemo();
    await confidenceBreakdown();
    await customPreferences();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Uncomment to run
// runAllExamples();

export {
  simpleValidation,
  highRiskValidation,
  landlineValidation,
  retryDemo,
  observabilityDemo,
  confidenceBreakdown,
  customPreferences,
  runAllExamples
};
