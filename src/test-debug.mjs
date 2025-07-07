import { configureMem0, search_memories, resetMem0Config } from './services/mem0/client.ts';

const validApiKey = "mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP";

console.log('Testing Mem0 configuration...');

// Reset first
resetMem0Config();

// Configure
configureMem0({
  enabled: true,
  mode: 'hosted',
  baseUrl: "http://localhost:4321",
  apiKey: validApiKey
});

// Test search
const result = await search_memories("test query", "user123", "agent456");
console.log('Search result:', result);
