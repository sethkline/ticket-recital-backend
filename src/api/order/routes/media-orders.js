'use strict';
module.exports = {
  "routes": [
    {
      "method": "GET",
      "path": "/orders/media-orders",
      "handler": "media-orders.getMediaOrders",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    },
    {
      "method": "PUT",
      "path": "/orders/:id/status",
      "handler": "media-orders.updateOrderStatus",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    },
    {
      "method": "POST",
      "path": "/orders/:id/generate-access-code",
      "handler": "media-orders.generateAccessCode",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    },
    {
      "method": "POST",
      "path": "/orders/generate-bulk-access-codes",
      "handler": "media-orders.generateBulkAccessCodes",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    },
    {
      "method": "POST",
      "path": "/orders/send-status-email",
      "handler": "media-orders.sendStatusEmail",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    },
    {
      "method": "POST",
      "path": "/orders/send-bulk-emails",
      "handler": "media-orders.sendBulkStatusEmails",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/orders/export-csv",
      "handler": "media-orders.exportOrdersCsv",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}
