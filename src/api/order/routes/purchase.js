'use strict';
module.exports = {
  "routes": [
    {
      "method": "POST",
      "path": "/orders/payment",
      "handler": "order.createPayment",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}
