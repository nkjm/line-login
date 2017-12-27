"use strict";

require("dotenv").config();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const debug = require("debug")("bot-express:test");
const request = require("request");
const line_login = require("../module/line-login.js")
Promise = require("bluebird");
Promise.promisifyAll(request);

chai.use(chaiAsPromised);
let should = chai.should();

let login = new line_login({
    channel_id: process.env.LINE_LOGIN_CHANNEL_ID,
    channel_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    callback_url: process.env.LINE_LOGIN_CALLBACK_URL,
});
let access_token = process.env.LINE_LOGIN_ACCESS_TOKEN;
let refresh_token = process.env.LINE_LOGIN_REFRESH_TOKEN;

describe("Test profile", function(){
    describe("Refresh access token.", function(){
        it("should return result.", function(){
            return Promise.resolve().then(function(){
                return login.refresh_access_token(refresh_token);
            }).then(function(response){
                response.should.have.property("access_token");
                access_token = response.access_token;
            });
        });
    });

    describe("Get profile with valid access token.", function(){
        it("should return profile.", function(){
            return Promise.resolve().then(function(){
                return login.get_user_profile(access_token);
            }).then(function(response){
                response.should.have.property("displayName");
                response.should.have.property("userId");
                response.should.have.property("pictureUrl");
                response.should.have.property("statusMessage");
            });
        });
    });

    describe("Get profile with invalid access token.", function(){
        it("should return error.", function(){
            return Promise.resolve().then(function(){
                return login.get_user_profile("invalid_access_token");
            }).catch(function(exception){
                exception.should.be.an.instanceOf(Error);
                exception.should.have.property("message").and.equal("Unauthorized");
            });
        });
    });
});
