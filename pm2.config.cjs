module.exports = {
  apps : [
    {
      name: `uploadr-api`,
      script: 'backend/app.js',
      env: {
        NODE_ENV: 'production',
      },
      args: ['--colors']
    },
  ]
}