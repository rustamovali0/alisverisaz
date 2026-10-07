module.exports = {
  apps: [{
    name: "alisveris",
    cwd: "/srv/alisveris/current",
    script: "server.js",
    node_args: "--env-file=/etc/alisveris/app.env",
    instances: 1,
    exec_mode: "fork",
    env: { NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: "3000" },
    max_memory_restart: "1500M",
    kill_timeout: 10000,
    min_uptime: "10s",
    max_restarts: 10,
    time: true,
  }],
};
