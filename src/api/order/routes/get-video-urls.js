'use strict';
module.exports = {
  "routes": [
    {
      "method": "POST",
      "path": "/orders/get-video-urls",
      "handler": "order.getVideoUrls",
      "config": {
        "policies": [],
        "auth": false
      }
    }
  ]
}