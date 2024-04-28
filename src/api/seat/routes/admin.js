// Path: src/api/seat/routes/custom-seat.js
module.exports = {
  "routes": [
    {
      "method": "POST",
      "path": "/seats/create-shows-and-seats",
      "handler": "admin.createShowsAndSeats",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    },
      {
        method: 'POST',
        path: '/seats/update-availability',
        handler: 'admin.updateAvailability',

        config: {
          "auth": {
            "strategy": "jwt"
          },
        },
        policies: [],
      },
      {
        method: 'POST',
        path: '/seats/update-handicap-access',
        handler: 'admin.updateHandicapAccess',

        config: {
          "auth": {
            "strategy": "jwt"
          },
        },
        policies: [],
      },
  ]
}
