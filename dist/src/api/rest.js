"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESTApi = void 0;
const express = require("express");
const Joi = require("joi");
const ip = require("ip");
const log_services_1 = require("../util/log.services");
const guid_1 = require("../util/guid");
const rest_event_types_1 = require("./consts/rest.event.types");
const environment_1 = require("../util/environment");
const env_vars_1 = require("../util/consts/env.vars");
const entity = "RESTApi";
const PORT = 3000;
class RESTApi {
    constructor() {
        this.app = express();
        this.server = null;
        this.eventListeners = {};
        this.restApiAddress = null;
        this.uidKey = environment_1.Environment.getValue(env_vars_1.ENV_VARS.JWT_IDENTIFIER, "uid");
        this.log = log_services_1.LogService.getInstnce();
        this.app.use(express.json());
        this.app.post(`/sendMessage/:uid`, (req, res) => { this.sendMessageRequest(req, res); });
        this.app.put(`/broadcast`, (req, res) => { this.broadcast(req, res); });
        this.app.post(`/disconnect/:uid`, (req, res) => { this.disconnectRequest(req, res); });
        this.app.get(`/probe`, (req, res) => { this.probe(req, res); });
        this.app.get(`/health`, (req, res) => { this.healthCheck(req, res); });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.log.info(entity, 'Starting server on port ' + PORT);
                this.server = this.app.listen(PORT, () => {
                    let host = ip.address(null, "ipv4");
                    let port = this.server.address().port;
                    this.log.info(entity, `Server running on: http://${host}:${PORT}`);
                    this.restApiAddress = `http://${host}:${PORT}`;
                    resolve(true);
                });
            });
        });
    }
    getRESTApiAddress() {
        return this.restApiAddress;
    }
    sendMessageRequestSchema(req, res) {
        const schema = Joi.object({
            payload: Joi.string().required()
        });
        return this.validateRequest(req, schema);
    }
    sendMessageRequest(req, res) {
        const validation = this.sendMessageRequestSchema(req, res);
        if (!validation.isValid)
            res.status(validation.status).send(validation);
        else {
            let payload = {
                payload: req.body.payload
            };
            payload[this.uidKey] = req.params.uid;
            this.notifyEventListeners(rest_event_types_1.REST_EVENT_TYPES.SEND_MESSAGE_REQUEST, payload);
            res.status(validation.status).send(validation);
        }
    }
    disconnectRequestSchema(req, res) {
        const schema = Joi.object({
            reason: Joi.string().required()
        });
        return this.validateRequest(req, schema);
    }
    disconnectRequest(req, res) {
        const validation = this.disconnectRequestSchema(req, res);
        if (!validation.isValid)
            res.status(validation.status).send(validation);
        else {
            let payload = {
                payload: req.body
            };
            if (!req.params.uid) {
                res.send({ status: 500, isValid: false, message: `The uid must be informed as URL param after the endpoint address` });
                return;
            }
            payload[this.uidKey] = req.params.uid;
            this.notifyEventListeners(rest_event_types_1.REST_EVENT_TYPES.DISCONNECT_REQUEST, payload);
            res.status(validation.status).send(validation);
        }
    }
    broadcastSchema(req, res) {
        const schema = Joi.object({
            payload: Joi.string().required()
        });
        return this.validateRequest(req, schema);
    }
    broadcast(req, res) {
        const validation = this.broadcastSchema(req, res);
        if (!validation.isValid)
            res.status(validation.status).send(validation);
        else {
            let data = JSON.parse(req.body.payload);
            let payload = {
                payload: req.body.payload
            };
            payload[this.uidKey] = data[this.uidKey];
            this.notifyEventListeners(rest_event_types_1.REST_EVENT_TYPES.BROADCAST, payload);
            res.status(validation.status).send(validation);
        }
    }
    healthCheck(req, res) {
        res.status(200).send('OK');
    }
    probe(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            this.notifyEventListeners(rest_event_types_1.REST_EVENT_TYPES.PROBE, { res: res });
        });
    }
    validateRequest(req, schema) {
        const options = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: true
        };
        const { error, value } = schema.validate(req.body, options);
        if (error) {
            return { status: 500, isValid: false, message: `Validation error: ${error.details.map(x => x.message).join(', ')}` };
        }
        else {
            req.body = value;
            return { status: 200, isValid: true };
        }
    }
    registerEventListener(callback) {
        let guid = guid_1.Guid.generateGuid();
        this.eventListeners[guid] = callback;
        return guid;
    }
    unregisterEventListener(guid) {
        delete this.eventListeners[guid];
    }
    notifyEventListeners(type, content) {
        for (let notification in this.eventListeners) {
            this.eventListeners[notification]({
                content: content,
                type: type,
                sender: content === null || content === void 0 ? void 0 : content.uid
            });
        }
    }
}
exports.RESTApi = RESTApi;
