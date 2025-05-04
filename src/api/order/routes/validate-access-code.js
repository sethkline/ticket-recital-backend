'use strict';
module.exports = {
  "routes": [
    {
      "method": "POST",
      "path": "/orders/validate-access-code",
      "handler": "order.validateAccessCode",
      "config": {
        "policies": [],
        "auth": false
      }
    }
  ]
}
