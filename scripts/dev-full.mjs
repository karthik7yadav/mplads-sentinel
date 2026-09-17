import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.resolve(projectRoot, 'backend');

// Configuration
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5174;
const BACKEND_HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/health`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}/`;
const DASHBOARD_URL = `http://localhost:${FRONTEND_PORT}/dashboard`;

let backendProcess = null;
let viteProcess = null;
let isShuttingDown = false;

// Format logging
function log(prefix, msg) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${prefix}] ${msg}`);
}

function error(prefix, msg) {
  const timestamp = new Date().toLocaleTimeString();
  console.error(`[${timestamp}] [${prefix}] ERROR: ${msg}`);
}

// Check if a TCP port is in use
function isPortInUse(port, host = '127.0.0.1', timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

// Check an HTTP endpoint with a timeout
function checkHttp(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = http.get(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          timeout: timeoutMs,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 400,
              status: res.statusCode,
              body,
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'TIMEOUT' });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

// Find a valid Python executable that has fastapi and uvicorn
function findPython() {
  const candidates = [
    process.env.PYTHON,
    'python',
    'python3',
    'py',
    'C:\\Users\\Sai Krishna\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
  ].filter(Boolean);

  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ['-c', 'import fastapi, uvicorn; print("OK")'], {
        encoding: 'utf8',
        windowsHide: true,
      });
      if (res.status === 0 && res.stdout.includes('OK')) {
        return cmd;
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

// Kill a process tree cleanly
function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/F', '/T', '/PID', pid.toString()], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {
    // Process may have already exited
  }
}

// Cleanup handler
function handleShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n');
  log('Shutdown', 'Stopping MPLADS Sentinel services...');

  if (backendProcess?.pid) {
    log('Shutdown', `Terminating FastAPI backend (PID ${backendProcess.pid})...`);
    killProcessTree(backendProcess.pid);
    backendProcess = null;
  }

  if (viteProcess?.pid) {
    log('Shutdown', `Terminating Vite frontend (PID ${viteProcess.pid})...`);
    killProcessTree(viteProcess.pid);
    viteProcess = null;
  }

  log('Shutdown', 'MPLADS Sentinel services stopped.');
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('exit', () => {
  if (backendProcess?.pid || viteProcess?.pid) {
    handleShutdown();
  }
});

// Auto-open browser
function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' });
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    }
  } catch (err) {
    log('Browser', `Could not automatically launch browser: ${err.message}`);
  }
}

// Main execution
async function main() {
  console.log('======================================================================');
  console.log('       MPLADS SENTINEL - FULL-STACK DEVELOPMENT ORCHESTRATOR           ');
  console.log('======================================================================');

  // 1. Verify / Start Backend
  log('Backend', `Checking status on port ${BACKEND_PORT}...`);
  const backendPortBusy = await isPortInUse(BACKEND_PORT);

  if (backendPortBusy) {
    const healthCheck = await checkHttp(BACKEND_HEALTH_URL, 2000);
    if (healthCheck.ok && healthCheck.body.includes('status')) {
      log('Backend', `FastAPI backend is already running on port ${BACKEND_PORT} (Health OK). Reusing.`);
    } else {
      error(
        'Backend',
        `Port ${BACKEND_PORT} is in use by another process, but ${BACKEND_HEALTH_URL} failed to respond with health status.`
      );
      error(
        'Backend',
        `Please terminate the conflicting process on port ${BACKEND_PORT} and run again.`
      );
      process.exit(1);
    }
  } else {
    // Port 8000 is free: locate python and start backend
    const pythonCmd = findPython();
    if (!pythonCmd) {
      error(
        'Backend',
        'Could not find Python with fastapi and uvicorn installed. Please ensure Python is installed and run "pip install -r backend/requirements.txt".'
      );
      process.exit(1);
    }

    log('Backend', `Starting FastAPI backend via ${pythonCmd} run.py...`);
    backendProcess = spawn(pythonCmd, ['run.py'], {
      cwd: backendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    backendProcess.stdout.on('data', (data) => {
      const str = data.toString().trim();
      if (str) {
        str.split('\n').forEach((line) => {
          if (line.trim()) log('FastAPI', line.trim());
        });
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const str = data.toString().trim();
      if (str) {
        str.split('\n').forEach((line) => {
          if (line.trim()) log('FastAPI', line.trim());
        });
      }
    });

    backendProcess.on('exit', (code, signal) => {
      if (!isShuttingDown) {
        error('FastAPI', `Backend exited unexpectedly with code ${code} signal ${signal}`);
        handleShutdown();
      }
    });

    // Wait for backend to be ready
    log('Backend', 'Waiting for authoritative datasets to load and /health endpoint to return 200...');
    const maxWaitBackendMs = 45000;
    const startWait = Date.now();
    let backendReady = false;

    while (Date.now() - startWait < maxWaitBackendMs) {
      const check = await checkHttp(BACKEND_HEALTH_URL, 1500);
      if (check.ok && check.body.includes('status')) {
        backendReady = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    if (!backendReady) {
      error('Backend', 'FastAPI backend did not become ready within 45 seconds. Terminating.');
      handleShutdown();
      process.exit(1);
    }

    log('Backend', `Authoritative FastAPI backend is READY on http://127.0.0.1:${BACKEND_PORT}`);
  }

  // 2. Verify / Start Frontend
  log('Frontend', `Checking status on port ${FRONTEND_PORT}...`);
  const frontendPortBusy = await isPortInUse(FRONTEND_PORT);

  if (frontendPortBusy) {
    const frontCheck = await checkHttp(FRONTEND_URL, 2000);
    if (frontCheck.ok) {
      log('Frontend', `Vite frontend is already running on port ${FRONTEND_PORT}. Reusing.`);
    } else {
      error(
        'Frontend',
        `Port ${FRONTEND_PORT} is occupied by an unrelated process. Vite requires strict port ${FRONTEND_PORT}.`
      );
      error('Frontend', `Please free port ${FRONTEND_PORT} and run again.`);
      handleShutdown();
      process.exit(1);
    }
  } else {
    // Port 5174 is free: start Vite
    log('Frontend', `Starting Vite dev server on strict port ${FRONTEND_PORT}...`);
    const viteJs = path.resolve(projectRoot, 'node_modules/vite/bin/vite.js');

    viteProcess = spawn(process.execPath, [viteJs, '--port', `${FRONTEND_PORT}`], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    viteProcess.stdout.on('data', (data) => {
      const str = data.toString().trim();
      if (str) {
        str.split('\n').forEach((line) => {
          if (line.trim()) log('Vite', line.trim());
        });
      }
    });

    viteProcess.stderr.on('data', (data) => {
      const str = data.toString().trim();
      if (str) {
        str.split('\n').forEach((line) => {
          if (line.trim()) log('Vite', line.trim());
        });
      }
    });

    viteProcess.on('exit', (code, signal) => {
      if (!isShuttingDown) {
        error('Vite', `Frontend server exited unexpectedly with code ${code} signal ${signal}`);
        handleShutdown();
      }
    });

    // Wait for frontend to be ready
    const maxWaitViteMs = 20000;
    const startWaitVite = Date.now();
    let viteReady = false;

    while (Date.now() - startWaitVite < maxWaitViteMs) {
      const check = await checkHttp(FRONTEND_URL, 1000);
      if (check.ok) {
        viteReady = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!viteReady) {
      error('Frontend', 'Vite dev server did not become ready within 20 seconds. Terminating.');
      handleShutdown();
      process.exit(1);
    }

    log('Frontend', `Vite frontend is READY on http://localhost:${FRONTEND_PORT}`);
  }

  // 3. Final Verification and Ready State
  console.log('\n======================================================================');
  console.log('              MPLADS SENTINEL IS LIVE & READY                         ');
  console.log('======================================================================');
  console.log(`Backend API:   http://127.0.0.1:${BACKEND_PORT}/health`);
  console.log(`Summary API:   http://127.0.0.1:${BACKEND_PORT}/dashboard/summary`);
  console.log(`Dashboard UI:  ${DASHBOARD_URL}`);
  console.log('----------------------------------------------------------------------');
  console.log('Press Ctrl+C at any time to gracefully stop all services.');
  console.log('======================================================================\n');

  // Open browser to dashboard
  openBrowser(DASHBOARD_URL);
}

main().catch((err) => {
  error('Main', `Unhandled startup exception: ${err.message}`);
  handleShutdown();
});
