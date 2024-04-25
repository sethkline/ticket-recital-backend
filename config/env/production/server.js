module.exports = ({ env }) => ({
  proxy: true,
  url: env('APP_URL'), // Sets the public URL of the application.
  app: {
    keys: env.array('APP_KEYS')
  },
  admin: {
    path: '/admin',
    // Admin panel config
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
  },
});
