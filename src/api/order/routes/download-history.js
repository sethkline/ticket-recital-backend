'use strict';
module.exports = {
  "routes": [
    {
      "method": "GET",
      "path": "/orders/download-history/:accessCode",
      "handler": "order.getDownloadHistory",
      "config": {
        "policies": [],
        "auth": false
      }
    }
  ]
}