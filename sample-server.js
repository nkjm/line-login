"use strict";

const app = require('express')();
const line_login = require("line-login");
const jwt = require("jsonwebtoken");

const login = new line_login({
    channel_id: process.env.LINE_LOGIN_CHANNEL_ID,
    channel_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    callback_url: process.env.LINE_LOGIN_CALLBACK_URL,
    scope: "openid profile",
    bot_prompt: "normal"
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`server is listening to ${process.env.PORT || 5000}...`);
});

// Specify the path you want to start authorization.
app.get("/", login.auth());

// Specify the path you want to wait for the callback from LINE authorization endpoint.
app.get("/callback", login.callback((req, res, next, login_response) => {
    let id_token = jwt.decode(JSON.parse(login_response).id_token, {json:true});
    res.json(id_token);
}));
