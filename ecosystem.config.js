module.exports = {
  apps: [
    {
      name: 'rsi-algo',
      script: './dist/src/main.js',
      env: {
        NODE_ENV: 'production',
      },
      time: true,
    },
  ],
};
