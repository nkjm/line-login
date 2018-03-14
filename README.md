![Build Status](https://travis-ci.org/nkjm/line-login.svg?branch=master)

# Overview

This is unofficial SDK to use LINE Login inside the node.js based application on top of express framework.

# Getting started

### Create channel

Go to [LINE developers console](https://developers.line.me) and create your channel for LINE Login. You need to configure callback URL in this site.

### Installation

```
$ npm install --save line-login express express-session
```

### Server/Router configuration

```javascript
"use strict";

const app = require('express')();
const line_login = require("line-login");
const session = require("express-session");
const session_options = {
    secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    resave: false,
    saveUninitialized: false
}
app.use(session(session_options));

const login = new line_login({
    channel_id: process.env.LINE_LOGIN_CHANNEL_ID,
    channel_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    callback_url: process.env.LINE_LOGIN_CALLBACK_URL,
    scope: "openid profile",
    prompt: "consent",
    bot_prompt: "normal"
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`server is listening to ${process.env.PORT || 5000}...`);
});

// Specify the path you want to start authorization.
app.use("/", login.auth());

// Specify the path you want to wait for the callback from LINE authorization endpoint.
app.use("/callback", login.callback(
    (req, res, next, token_response) => {
        // Success callback
        res.json(token_response);
    },
    (req, res, next, error) => {
        // Failure callback
        res.status(400).json(error);
    }
));
```

# Reference

For more detailed configuration, refer to [API reference](https://nkjm.github.io/line-login/LineLogin.html).

# License

[Apache 2.0](./LICENSE)
