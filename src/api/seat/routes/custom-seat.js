// Path: src/api/seat/routes/custom-seat.js
module.exports = {
  "routes": [
    {
      "method": "POST",
      "path": "/seats/:id/reserve",
      "handler": "seat.toggleSeatReservation",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}
