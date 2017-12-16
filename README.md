# Overview

This is a SDK to use LINE Login inside the node.js based application on top of express framework.

# Getting started

### Installation

```
$ npm install --save line-login

// You may also want to install JWT library to decode id token.
$ npm install --save jsonwebtoken
```

### Router configuration

```javascript
const express = require('express');
const router = express.Router();
const line_login = require("line-login");
const jwt = require("jsonwebtoken");

const login = new line_login({
    channel_id: process.env.LINE_LOGIN_CHANNEL_ID,
    channel_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    callback_url: process.env.LINE_LOGIN_CALLBACK_URL,
    scope: "openid profile",
    bot_prompt: "normal"
});

// Specify the path you want to start authorization.
router.get("/", login.auth());

// Specify the path you want to wait for the callback from LINE authorization endpoint.
router.get("/callback", login.callback((req, res, next, login_response) => {
    let id_token = jwt.decode(JSON.parse(login_response).id_token, {json:true});
    console.log(id_token);
});
```

# Reference

For more detailed configuration, refer to [API reference](./docs/index.html).

# License

[MIT](./LICENSE)
