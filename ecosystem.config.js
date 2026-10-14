module.exports = {
  apps: [
    {
      name: "golagola-lunch",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 18429",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 18429
      }
    }
  ]
};
