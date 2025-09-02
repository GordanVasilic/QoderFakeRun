#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');

const port = 3000;
console.log(`🔍 Checking for processes on port ${port}...`);

function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      // Windows command
      command = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`;
    } else {
      // Unix/Linux/macOS command
      command = `lsof -ti:${port} | xargs kill -9`;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`✅ Port ${port} is already free or no process found.`);
      } else {
        console.log(`🔥 Killed process(es) on port ${port}.`);
      }
      resolve();
    });
  });
}

async function startDev() {
  await killProcessOnPort(port);
  console.log(`🚀 Starting development server on port ${port}...`);
  
  const { spawn } = require('child_process');
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  devProcess.on('error', (error) => {
    console.error('❌ Failed to start development server:', error);
    process.exit(1);
  });
}

startDev();