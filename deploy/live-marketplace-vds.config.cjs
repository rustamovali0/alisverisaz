const path = require("node:path");
module.exports = {
  apps: [{
    name: "alisveris-vds",
    cwd: path.resolve(__dirname, ".."),
    script: "server.js",
    node_args: "--env-file=app.env",
    instances: 1,
    exec_mode: "fork",
    env: { NODE_ENV: "production", PORT: "3004", HOSTNAME: "::ffff:127.0.0.1" },
    max_memory_restart: "700M",
    kill_timeout: 10000,
    min_uptime: "10s",
    max_restarts: 5,
    error_file: "/home/deploy/.pm2/logs/alisveris-vds-error.log",
    out_file: "/home/deploy/.pm2/logs/alisveris-vds-out.log",
    time: true,
  }],
};
