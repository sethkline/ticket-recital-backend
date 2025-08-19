// api/custom/routes/user.js
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/custom/forgot-password',
      handler: 'user.forgotPassword',
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/custom/reset-password',
      handler: 'user.resetPassword',
      config: {
        auth: false
      }
    }
  ]
};
