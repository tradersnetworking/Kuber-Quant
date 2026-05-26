module.exports = {
  apps: [
    {
      name: "kuber-quant-api",
      cwd: "./artifacts/api-server",
      script: "dist/index.mjs",
      node_args: "--enable-source-maps",
      env_file: "../../.env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      error_file: "../../logs/api-error.log",
      out_file: "../../logs/api-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
