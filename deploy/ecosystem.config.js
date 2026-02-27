// pm2 ecosystem config
// Used by start.sh and update.sh — can also be used directly:
//   pm2 start /opt/p-ink/deploy/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: "p-ink-backend",
      script: "/opt/p-ink/backend/bin/server",
      cwd: "/opt/p-ink/backend",
      // Backend reads .env via godotenv — no env vars needed here
      restart_delay: 3000,
      max_restarts: 10,
      // Graceful shutdown — wait for in-flight requests
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      // Logs
      out_file: "/var/log/p-ink/backend.log",
      error_file: "/var/log/p-ink/backend.error.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "p-ink-frontend",
      script: "pnpm",
      args: "start",
      cwd: "/opt/p-ink/frontend",
      // next start reads PORT from .env.local automatically
      restart_delay: 3000,
      max_restarts: 10,
      kill_timeout: 15000,
      // Logs
      out_file: "/var/log/p-ink/frontend.log",
      error_file: "/var/log/p-ink/frontend.error.log",
      merge_logs: true,
      time: true,
    },
  ],
};