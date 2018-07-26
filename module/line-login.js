"use strict";

const debug = require("debug")("line-login:module");
const request = require("request");
const jwt = require("jsonwebtoken");
const secure_compare = require("secure-compare");
const crypto = require("crypto");
const api_version = "v2.1";

let Promise = require("bluebird");
Promise.promisifyAll(request);

/**
@class
*/
class LineLogin {
    /**
    @constructor
    @param {Object} options
    @param {String} options.channel_id - LINE Channel Id
    @param {String} options.channel_secret - LINE Channel secret
    @param {String} options.callback_url - LINE Callback URL
    @param {String} [options.scope="profile openid"] - Permission to ask user to approve. Supported values are "profile", "openid" and "email". To specify email, you need to request approval to LINE.
    @param {String} [options.prompt] - Used to force the consent screen to be displayed even if the user has already granted all requested permissions. Supported value is "concent".
    @param {string} [options.bot_prompt="normal"] - Displays an option to add a bot as a friend during login. Set value to either normal or aggressive. Supported values are "normal" and "aggressive".
    @param {Boolean} [options.verify_id_token=true] - Used to verify id token in token response. Default is true.
    */
    constructor(options){
        const required_params = ["channel_id", "channel_secret", "callback_url"];
        const optional_params = ["scope", "prompt", "bot_prompt", "session_options", "verify_id_token"];

        // Check if required parameters are all set.
        required_params.map((param) => {
            if (!options[param]){
                throw new Error(`Required parameter ${param} is missing.`);
            }
        })

        // Check if configured parameters are all valid.
        Object.keys(options).map((param) => {
            if (!required_params.includes(param) && !optional_params.includes(param)){
                throw new Error(`${param} is not a valid parameter.`);
            }
        })

        this.channel_id = options.channel_id;
        this.channel_secret = options.channel_secret;
        this.callback_url = options.callback_url;
        this.scope = options.scope || "profile openid";
        this.prompt = options.prompt;
        this.bot_prompt = options.bot_prompt || "normal";
        if (typeof options.verify_id_token === "undefined"){
            this.verify_id_token = true;
        } else {
            this.verify_id_token = options.verify_id_token;
        }
    }

    /**
    Middlware to initiate OAuth2 flow by redirecting user to LINE authorization endpoint.
    Mount this middleware to the path you like to initiate authorization.
    @method
    @return {Function}
    */
    auth(){
        return (req, res, next) => {
            let state = req.session.line_login_state = LineLogin._random();
            let nonce = req.session.line_login_nonce = LineLogin._random();
            let url = this.make_auth_url(state, nonce);
            return res.redirect(url);
        }
    }

    /**
    Middleware to handle callback after authorization.
    Mount this middleware to the path corresponding to the value of Callback URL in LINE Developers Console.
    @method
    @param {Function} s - Callback function on success.
    @param {Function} f - Callback function on failure.
    */
    callback(s, f){
        return (req, res, next) => {
            const f_ = (error) => {
                if (f) f(req, res, next, error);
                else throw error;
            };
            const code = req.query.code;
            const state = req.query.state;
            const friendship_status_changed = req.query.friendship_status_changed;

            if (!code){
                debug("Authorization failed.");
                return f_(new Error("Authorization failed."));
            }
            if (!secure_compare(req.session.line_login_state, state)){
                debug("Authorization failed. State does not match.");
                return f_(new Error("Authorization failed. State does not match."));
            }
            debug("Authorization succeeded.");

            this.issue_access_token(code).then((token_response) => {
                if (this.verify_id_token && token_response.id_token){
                    let decoded_id_token;
                    try {
                        decoded_id_token = jwt.verify(
                            token_response.id_token,
                            this.channel_secret,
                            {
                                audience: this.channel_id,
                                issuer: "https://access.line.me",
                                algorithms: ["HS256"]
                            }
                        );
                        if (!secure_compare(decoded_id_token.nonce, req.session.line_login_nonce)){
                            throw new Error("Nonce does not match.");
                        }
                        debug("id token verification succeeded.");
                        token_response.id_token = decoded_id_token;
                    } catch(exception) {
                        debug("id token verification failed.");
                        f_(new Error("Verification of id token failed."));
                    }
                }
                delete req.session.line_login_state;
                delete req.session.line_login_nonce;
                s(req, res, next, token_response);
            }).catch((error) => {
                debug(error);
                f_(error);
            });
        }
    }

    /**
    Method to make authorization URL
    @method
    @param {String} [nonce] - A string used to prevent replay attacks. This value is returned in an ID token.
    @return {String}
    */
    make_auth_url(state, nonce){
        const client_id = encodeURIComponent(this.channel_id);
        const redirect_uri = encodeURIComponent(this.callback_url);
        const scope = encodeURIComponent(this.scope);
        const prompt = encodeURIComponent(this.prompt);
        const bot_prompt = encodeURIComponent(this.bot_prompt);
        let url = `https://access.line.me/oauth2/${api_version}/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&bot_prompt=${bot_prompt}&state=${state}`;
        if (this.prompt) url += `&prompt=${encodeURIComponent(this.prompt)}`;
        if (nonce) url += `&nonce=${encodeURIComponent(nonce)}`;
        return url
    }

    /**
    Method to retrieve access token using authorization code.
    @method
    @param {String} code - Authorization code
    @return {Object}
    */
    issue_access_token(code){
        const url = `https://api.line.me/oauth2/${api_version}/token`;
        const form = {
            grant_type: "authorization_code",
            code: code,
            redirect_uri: this.callback_url,
            client_id: this.channel_id,
            client_secret: this.channel_secret
        }
        return request.postAsync({
            url: url,
            form: form
        }).then((response) => {
            if (response.statusCode == 200){
                return JSON.parse(response.body);
            }
            return Promise.reject(new Error(response.statusMessage));
        });
    }

    /**
    Method to verify the access token.
    @method
    @param {String} access_token - Access token
    @return {Object}
    */
    verify_access_token(access_token){
        const url = `https://api.line.me/oauth2/${api_version}/verify?access_token=${encodeURIComponent(access_token)}`;
        return request.getAsync({
            url: url
        }).then((response) => {
            if (response.statusCode == 200){
                return JSON.parse(response.body);
            }
            return Promise.reject(new Error(response.statusMessage));
        });
    }

    /**
    Method to get a new access token using a refresh token.
    @method
    @param {String} refresh_token - Refresh token.
    @return {Object}
    */
    refresh_access_token(refresh_token){
        const url = `https://api.line.me/oauth2/${api_version}/token`;
        const form = {
            grant_type: "refresh_token",
            refresh_token: refresh_token,
            client_id: this.channel_id,
            client_secret: this.channel_secret
        }
        return request.postAsync({
            url: url,
            form: form
        }).then((response) => {
            if (response.statusCode == 200){
                return JSON.parse(response.body);
            }
            return Promise.reject(new Error(response.statusMessage));
        });
    }

    /**
    Method to invalidate the access token.
    @method
    @param {String} access_token - Access token.
    @return {Null}
    */
    revoke_access_token(access_token){
        const url = `https://api.line.me/oauth2/${api_version}/revoke`;
        const form = {
            access_token: access_token,
            client_id: this.channel_id,
            client_secret: this.channel_secret
        }
        return request.postAsync({
            url: url,
            form: form
        }).then((response) => {
            if (response.statusCode == 200){
                return null;
            }
            return Promise.reject(new Error(response.statusMessage));
        });
    }

    /**
    Method to get user's display name, profile image, and status message.
    @method
    @param {String} access_token - Access token.
    @return {Object}
    */
    get_user_profile(access_token){
        const url = `https://api.line.me/v2/profile`;
        const headers = {
            Authorization: "Bearer " + access_token
        }
        return request.getAsync({
            url: url,
            headers: headers
        }).then((response) => {
            if (response.statusCode == 200){
                return JSON.parse(response.body);
            }
            return Promise.reject(new Error(response.statusMessage));
        });
    }

    /**
    Method to get the friendship status of the user and the bot linked to your LNIE Login channel.
    @method
    @param {String} access_token - Access token.
    @return {Object}
    */
    get_friendship_status(access_token){
        const url = `https://api.line.me/friendship/v1/status`;
        const headers = {
            Authorization: "Bearer " + access_token
        }
        return request.getAsync({
            url: url,
            headers: headers
        }).then((response) => {
            if (response.statusCode == 200){
                return JSON.parse(response.body);
            }
            return Promise.reject(new Error(response.statusMessage));
        });
    }

    /**
    Method to generate random string.
    @method
    @return {Number}
    */
    static _random(){
        return crypto.randomBytes(20).toString('hex');
    }
}

module.exports = LineLogin;
