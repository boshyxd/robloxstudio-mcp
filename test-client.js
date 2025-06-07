#!/usr/bin/env node

/**
 * Simple MCP client to test the get_file_tree tool
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
let toolRequestSent = false;

rl.on('line', (line) => {
  console.log('Received:', line);
  try {
    const response = JSON.parse(line);
    
    // Check if this is the initialize response
    if (response.id === 1 && response.result && !initialized) {
      console.log('Server responded to initialize, sending initialized notification...');
      initialized = true;
      
      // Send initialized notification
      const notification = {
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      };
      const message = JSON.stringify(notification) + '\n';
      console.log('Sending:', message);
      server.stdin.write(message);
      
      // Wait a moment then call the tool
      setTimeout(() => {
        console.log('Calling get_file_tree tool...');
        toolRequestSent = true;
        sendRequest('tools/call', {
          name: 'get_file_tree',
          arguments: { path: '' }
        });
      }, 100);
    }
    
    // Check if this is the tool response
    if (response.id === 2 && toolRequestSent) {
      console.log('\n=== TOOL RESPONSE ===');
      console.log(JSON.stringify(response, null, 2));
      console.log('=====================\n');
      
      // Exit after getting the response
      setTimeout(() => {
        console.log('Tool response received, exiting...');
        server.kill();
        process.exit(0);
      }, 1000);
    }
  } catch (e) {
    console.error('Failed to parse response:', e);
  }
});

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
  console.log('Test complete, exiting...');
  server.kill();
  process.exit(0);
}, 30000);