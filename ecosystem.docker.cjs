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
  ],
};
