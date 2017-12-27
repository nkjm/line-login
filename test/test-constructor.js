"use strict";

require("dotenv").config();

const chai = require('chai');
const debug = require("debug")("bot-express:test");
const should = chai.should();
const line_login = require("../module/line-login.js");

describe("Test constructor", function(){
    describe("Provide correct parameter.", function(){
        it("should create instance.", function(){
            let login = new line_login({
                channel_id: process.env.LINE_LOGIN_CHANNEL_ID,
                channel_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
                callback_url: process.env.LINE_LOGIN_CALLBACK_URL,
            });
            login.should.have.property("channel_id");
        });
    });

    describe("Miss required parameter.", function(){
        it("should throw error.", function(){
            try {
                let login = new line_login({
                    channel_id: process.env.LINE_LOGIN_CHANNEL_ID,
                    channel_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
                });
            } catch(exception){
                exception.should.be.instanceOf(Error);
                exception.should.have.property("message").and.equal("Required parameter callback_url is missing.");
            }
        });
    });

    describe("Provide invalid parameter.", function(){
        it("should throw error.", function(){
            try {
                let login = new line_login({
                    channel_id: process.env.LINE_LOGIN_CHANNEL_ID,
                    channel_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
                    callback_url: process.env.LINE_LOGIN_CALLBACK_URL,
                    invalid_param: "invalid_param"
                });
            } catch(exception){
                exception.should.be.instanceOf(Error);
                exception.should.have.property("message").and.equal("invalid_param is not a valid parameter.");
            }
        });
    });
});
