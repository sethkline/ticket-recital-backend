'use strict';
module.exports = {
  "routes": [
    {
      "method": "POST",
      "path": "/orders/admin/generate-access-codes",
      "handler": "order.generateAccessCodes",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}