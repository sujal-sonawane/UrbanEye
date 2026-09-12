#!/usr/bin/env node
/* eslint-disable */
/**
 * URBANEYE Unified Dev Orchestrator
 * Runs FastAPI Backend (Port 8000) and Vite Frontend (Port 3000) concurrently.
 * Zero external dependencies — uses Node.js standard library only.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');

const isWindows = process.platform === 'win32';
const uvicornBin = isWindows
  ? path.resolve(backendDir, '.venv', 'Scripts', 'uvicorn.exe')
  : path.resolve(backendDir, '.venv', 'bin', 'uvicorn');

const npxCmd = isWindows ? 'npx.cmd' : 'npx';

console.log('\x1b[36m%s\x1b[0m', '================================================');
console.log('\x1b[36m%s\x1b[0m', ' URBANEYE: Starting Full-Stack Dev Environment  ');
console.log('\x1b[36m%s\x1b[0m', '================================================');

// 1. Start FastAPI Backend
console.log('\x1b[32m%s\x1b[0m', '[FastAPI] Launching backend on http://localhost:8000 ...');
const backendProcess = spawn(
  uvicornBin,
  ['app.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'],
  {
    cwd: backendDir,
    stdio: 'inherit',
    shell: isWindows,
  }
);

backendProcess.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `[FastAPI Error] Failed to start backend: ${err.message}`);
});

// 2. Start Vite Frontend
console.log('\x1b[34m%s\x1b[0m', '[Vite] Launching frontend ...');
const frontendProcess = spawn(npxCmd, ['vite'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: isWindows,
});

frontendProcess.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `[Vite Error] Failed to start frontend: ${err.message}`);
});

// Cleanup handler
function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down URBANEYE processes...');
  try {
    if (backendProcess && !backendProcess.killed) {
      if (isWindows) {
        spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t']);
      } else {
        backendProcess.kill('SIGTERM');
      }
    }
  } catch {}

  try {
    if (frontendProcess && !frontendProcess.killed) {
      if (isWindows) {
        spawn('taskkill', ['/pid', frontendProcess.pid.toString(), '/f', '/t']);
      } else {
        frontendProcess.kill('SIGTERM');
      }
    }
  } catch {}

  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
