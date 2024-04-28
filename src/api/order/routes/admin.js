'use strict';
module.exports = {
  "routes": [
    {
      "method": "GET",
      "path": "/orders/total-sales",
      "handler": "admin.totalSales",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}
