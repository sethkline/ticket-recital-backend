'use strict';
module.exports = {
  "routes": [
    {
      "method": "GET",
      "path": "/orders/my-media-orders",
      "handler": "order.findUserMediaOrders",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}
