'use strict';
module.exports = {
  "routes": [
    {
      "method": "POST",
      "path": "/early-access-phrases/verify",
      "handler": "early-access-phrase.verifyPassphrase",
      "config": {
        "auth": {
          "strategy": "jwt"
        },
        "policies": []
      }
    }
  ]
}
