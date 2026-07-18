const fs = require('fs');
const path = require('path');

const root = __dirname;
const userProfile = process.env.USERPROFILE || process.env.HOME || root;
const dataDirectory = path.join(userProfile, 'attendance-vithacon-data');
const runnerScript = path.join(userProfile, 'attendance-github-runner', 'run.cmd');
const hiddenRunnerScript = path.join(root, 'tools', 'run-github-runner-hidden.vbs');

const apps = [
  {
    name: 'attendance-backend',
    script: 'server/index.js',
    cwd: root,
    autorestart: true,
    watch: false,
    restart_delay: 5000,
    max_restarts: 1000,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      ATTENDANCE_SERVER_PORT: 5005,
      ATTENDANCE_DATA_DRIVER: 'json',
      ATTENDANCE_DATA_DIR: dataDirectory,
      AUTH_REQUIRED: 'false',
    },
    out_file: path.join(root, 'logs', 'backend-out.log'),
    error_file: path.join(root, 'logs', 'backend-error.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  },
  {
    name: 'attendance-cloudflare-tunnel',
    script: 'tools/cloudflared.exe',
    args: 'tunnel --protocol http2 --url http://127.0.0.1:5005',
    cwd: root,
    interpreter: 'none',
    autorestart: true,
    watch: false,
    restart_delay: 5000,
    max_restarts: 1000,
    out_file: path.join(root, 'logs', 'tunnel-out.log'),
    error_file: path.join(root, 'logs', 'tunnel-error.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  },
  {
    name: 'attendance-tunnel-url-sync',
    script: 'tools/run-tunnel-sync-hidden.vbs',
    cwd: root,
    interpreter: 'wscript.exe',
    autorestart: true,
    watch: false,
    restart_delay: 5000,
    max_restarts: 1000,
    out_file: path.join(root, 'logs', 'sync-out.log'),
    error_file: path.join(root, 'logs', 'sync-error.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  },
];

if (fs.existsSync(runnerScript)) {
  apps.push({
    name: 'attendance-github-runner',
    script: hiddenRunnerScript,
    cwd: root,
    interpreter: 'wscript.exe',
    autorestart: true,
    watch: false,
    restart_delay: 10000,
    max_restarts: 1000,
    out_file: path.join(root, 'logs', 'runner-out.log'),
    error_file: path.join(root, 'logs', 'runner-error.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  });
}

module.exports = { apps };
