'use strict';
module.exports = {
  "routes": [
    {
      "method": "GET",
      "path": "/orders/my-tickets",
      "handler": "order.findUserTickets",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}
