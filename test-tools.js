#!/usr/bin/env node

/**
 * Test MCP tools
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Start the MCP server process
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let requestId = 1;

// Function to send MCP request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method: method,
    params: params
  };
  
  const message = JSON.stringify(request) + '\n';
  console.log('Sending:', message);
  server.stdin.write(message);
}

// Read responses from server
const rl = createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

let initialized = false;
let currentTest = 0;
const tests = [
  { name: 'get_file_tree', args: { path: '' } },
  { name: 'get_place_info', args: {} },
  { name: 'get_services', args: {} }
];

rl.on('line', (line) => {
  console.log('Received:', line);
  try {
    const response = JSON.parse(line);
    
    // Check if this is the initialize response
    if (response.id === 1 && response.result && !initialized) {
      console.log('Server initialized, sending initialized notification...');
      initialized = true;
      
      // Send initialized notification
      const notification = {
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      };
      const message = JSON.stringify(notification) + '\n';
      console.log('Sending:', message);
      server.stdin.write(message);
      
      // Start first test
      setTimeout(() => {
        runNextTest();
      }, 100);
    }
    
    // Check if this is a tool response
    if (response.id > 1 && currentTest < tests.length) {
      console.log(`\n=== ${tests[currentTest - 1].name.toUpperCase()} RESPONSE ===`);
      console.log(JSON.stringify(response, null, 2));
      console.log('=====================\n');
      
      // Run next test or exit
      setTimeout(() => {
        if (currentTest < tests.length) {
          runNextTest();
        } else {
          console.log('All tests completed, exiting...');
          server.kill();
          process.exit(0);
        }
      }, 1000);
    }
  } catch (e) {
    console.error('Failed to parse response:', e);
  }
});

function runNextTest() {
  if (currentTest < tests.length) {
    const test = tests[currentTest];
    console.log(`\nTesting ${test.name}...`);
    sendRequest('tools/call', {
      name: test.name,
      arguments: test.args
    });
    currentTest++;
  }
}

// Initialize the connection
console.log('Initializing MCP connection...');
sendRequest('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {
    roots: {
      listChanged: true
    }
  },
  clientInfo: {
    name: 'test-client',
    version: '1.0.0'
  }
});

// Handle process exit
process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});

// Clean up after 30 seconds
setTimeout(() => {
  console.log('Test timeout, exiting...');
  server.kill();
  process.exit(0);
}, 30000);