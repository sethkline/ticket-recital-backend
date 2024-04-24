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
    }
  ]
}
