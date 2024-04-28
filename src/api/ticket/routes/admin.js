'use strict';
module.exports = {
  "routes": [
    {
      "method": "GET",
      "path": "/tickets/list-with-roles",
      "handler": "admin.listTicketsWithUserRoles",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}
