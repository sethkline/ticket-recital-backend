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
    },
    {
      method: 'GET',
      path: '/orders/csv-report',
      handler: 'admin.csvReport',
      config: {
        "auth": {
          "strategy": "jwt"
        },
        policies: [],
      },
    },
    {
      "method": "POST",
      "path": "/orders/send-recital-emails",
      "handler": "admin.sendRecitalEmails",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    },
    {
      "method": "POST",
      "path": "/orders/create-volunteer-access",
      "handler": "admin.createVolunteerAccess",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}

