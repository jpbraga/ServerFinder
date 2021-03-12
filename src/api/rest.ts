import express = require('express');
import Joi = require('joi');
import ip = require('ip');
import { LogService } from '../util/log.services';
import { Guid } from '../util/guid';
import { EventMessageCallback } from '../interfaces/event.message.callback';
import { REST_EVENT_TYPES } from './consts/rest.event.types';
import { Environment } from '../util/environment';
import { ENV_VARS } from '../util/consts/env.vars';

const entity: string = "RESTApi";
const PORT = 3000;

export class RESTApi {
    private app = express();
    private server = null;
    private log: LogService;
    private eventListeners = {};
    private restApiAddress: string = null;
    private uidKey:string = Environment.getValue(ENV_VARS.JWT_IDENTIFIER, "uid");

    constructor() {
        this.log = LogService.getInstnce();
        this.app.use(express.json());

        this.app.post(`/sendMessage/:uid`, (req: express.Request, res: express.Response) => { this.sendMessageRequest(req,res)});
        this.app.put(`/broadcast`, (req: express.Request, res: express.Response) => { this.broadcast(req,res)});
        this.app.put(`/disconnect`, (req: express.Request, res: express.Response) => { this.disconnectRequest(req,res)});
        this.app.get(`/probe`, (req: express.Request, res: express.Response) => { this.probe(req,res)});
        this.app.get(`/health`, (req: express.Request, res: express.Response) => { this.healthCheck(req,res)});
    }

    public async init() {
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
    }

    public getRESTApiAddress(): string {
        return this.restApiAddress;
    }
    private sendMessageRequestSchema(req, res): ValidationInterface {
        const schema = Joi.object({
            payload: Joi.string().required()
        });
        return this.validateRequest(req, schema);
    }

    private sendMessageRequest(req, res) {
        const validation = this.sendMessageRequestSchema(req, res);
        if (!validation.isValid) res.send(validation);
        else {
            let payload = {
                payload: req.body.payload
            };
            payload[this.uidKey] = req.params.uid;
            this.notifyEventListeners(REST_EVENT_TYPES.SEND_MESSAGE_REQUEST, payload);
            res.send(validation);
        }
    }

    private disconnectRequestSchema(req, res): ValidationInterface {
        const schema = Joi.object({
            reason: Joi.string().required()
        });
        return this.validateRequest(req, schema);
    }

    private disconnectRequest(req, res) {
        const validation = this.disconnectRequestSchema(req, res);
        if (!validation.isValid) res.send(validation);
        else {
            let payload = {
                reason: req.body.reason
            };
            if(!req.params.uid) {
                res.send({ status: 500, isValid: false, message: `The uid must be informed as URL param after the endpoint address` });
                return;
            }
            payload[this.uidKey] = req.params.uid;
            this.notifyEventListeners(REST_EVENT_TYPES.DISCONNECT_REQUEST, payload);
            res.send(validation);
        }
    }

    private broadcastSchema(req, res): ValidationInterface {
        const schema = Joi.object({
            payload: Joi.string().required()
        });
        return this.validateRequest(req, schema);
    }

    public broadcast(req, res) {
        const validation = this.broadcastSchema(req, res);
        if (!validation.isValid) res.send(validation);
        else {
            let data = JSON.parse(req.body.payload);
            let payload = {
                payload: req.body.payload
            }
            payload[this.uidKey] = data[this.uidKey];
            this.notifyEventListeners(REST_EVENT_TYPES.BROADCAST, payload);
            res.send(validation);
        }
    }

    private healthCheck(req, res) {
        res.send(200);
    }

    private async probe(req, res) {
        this.notifyEventListeners(REST_EVENT_TYPES.PROBE, {res: res});
    }

    // helper functions
    private validateRequest(req, schema): ValidationInterface {
        const options = {
            abortEarly: false, // include all errors
            allowUnknown: true, // ignore unknown props
            stripUnknown: true // remove unknown props
        };
        const { error, value } = schema.validate(req.body, options);
        if (error) {
            return { status: 500, isValid: false, message: `Validation error: ${error.details.map(x => x.message).join(', ')}` };
        } else {
            req.body = value;
            return { status: 200, isValid: true };
        }
    }

    public registerEventListener(callback: EventMessageCallback): string {
        let guid: string = Guid.generateGuid();
        this.eventListeners[guid] = callback;
        return guid;
    }

    public unregisterEventListener(guid: string): void {
        delete this.eventListeners[guid];
    }

    private notifyEventListeners(type: number, content: any): void {
        for (let notification in this.eventListeners) {
            this.eventListeners[notification]({
                content: content,
                type: type,
                sender: content?.uid
            });
        }
    }
}

export interface ValidationInterface {
    status: number,
    isValid: boolean,
    message?: string
}
