import { configureMem0, search_memories, resetMem0Config, getMem0Mode } from './services/mem0/client.js';

const validApiKey = "mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP";

console.log('=== Testing Configuration Flow ===');

// Test 1: Fresh configuration
console.log('\n1. Fresh configuration:');
configureMem0({
  enabled: true,
  mode: 'hosted',
  baseUrl: "http://localhost:4321",
  apiKey: validApiKey
});

const mode1 = getMem0Mode();
console.log('Mode after config:', mode1);

// Test 2: Reset then reconfigure
console.log('\n2. After reset and reconfigure:');
resetMem0Config();
configureMem0({
  enabled: true,
  mode: 'hosted',
  baseUrl: "http://localhost:4321",
  apiKey: validApiKey
});

const mode2 = getMem0Mode();
console.log('Mode after reset+config:', mode2);

// Test 3: Check if search_memories works
console.log('\n3. Testing search_memories:');
try {
  const result = await search_memories("test", "user", "agent");
  console.log('Search result:', result);
} catch (error) {
  console.log('Search error:', error.message);
}