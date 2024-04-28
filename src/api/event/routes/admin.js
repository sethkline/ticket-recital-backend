'use strict';
module.exports = {
  "routes": [
    {
      "method": "GET",
      "path": "/events/:eventId/metrics",
      "handler": "admin.eventMetrics",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}
