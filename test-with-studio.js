#!/usr/bin/env node

/**
 * Test MCP tools with Studio plugin connection check
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Start the MCP server process  
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let requestId = 1;

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

const rl = createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

let initialized = false;

rl.on('line', (line) => {
  console.log('Received:', line);
  try {
    const response = JSON.parse(line);
    
    if (response.id === 1 && response.result && !initialized) {
      console.log('Server initialized, waiting for Studio plugin...');
      initialized = true;
      
      // Send initialized notification
      const notification = {
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      };
      server.stdin.write(JSON.stringify(notification) + '\n');
      
      // Wait a bit, then test with Studio hopefully connected
      console.log('Waiting 10 seconds for Studio plugin to connect...');
      setTimeout(() => {
        console.log('Testing get_file_tree tool...');
        sendRequest('tools/call', {
          name: 'get_file_tree',
          arguments: { path: '' }
        });
      }, 10000);
    }
    
    if (response.id === 2) {
      console.log('\n=== TOOL RESPONSE ===');
      console.log(JSON.stringify(response, null, 2));
      console.log('=====================\n');
      
      setTimeout(() => {
        console.log('Test completed, exiting...');
        server.kill();
        process.exit(0);
      }, 1000);
    }
  } catch (e) {
    console.error('Failed to parse response:', e);
  }
});

// Initialize
console.log('Initializing MCP connection...');
sendRequest('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: {
    name: 'studio-test',
    version: '1.0.0'
  }
});

process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});

// Exit after timeout
setTimeout(() => {
  console.log('Test timeout, exiting...');
  server.kill();
  process.exit(0);
}, 45000);