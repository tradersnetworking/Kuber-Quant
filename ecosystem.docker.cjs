/** PM2 config for Docker backend container (pm2-runtime). */
module.exports = {
  apps: [
    {
      name: "kuber-quant-api",
      script: "artifacts/api-server/dist/index.mjs",
      cwd: "/app",
      node_args: "--enable-source-maps",
      instances: Number(process.env.PM2_INSTANCES || 1),
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: process.env.PM2_MAX_MEMORY || "768M",
      error_file: "/app/logs/pm2-error.log",
      out_file: "/app/logs/pm2-out.log",
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "production",
        SERVE_SPA: "false",
      },
    },
    {
      name: "kuber-quant-worker",
      script: "artifacts/api-server/dist/worker.mjs",
      cwd: "/app",
      node_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: process.env.PM2_WORKER_MAX_MEMORY || "512M",
      error_file: "/app/logs/pm2-worker-error.log",
      out_file: "/app/logs/pm2-worker-out.log",
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "production",
        WORKER_MODE: "true",
      },
    },
  ],
};
