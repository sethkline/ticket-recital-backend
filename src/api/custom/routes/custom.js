module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/reset-reservations',
      handler: 'custom.resetReservations',
      config: {
        auth: false
      }
    }
  ]
};
