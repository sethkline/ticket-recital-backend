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
    },
    {
      "method": "POST",
      "path": "/orders/test-pdf",
      "handler": "admin.testPDF",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": [] // Add any specific policies if needed
      }
    }
  ]
}

