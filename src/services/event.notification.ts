import http = require('http')
import https = require('https')
import { ENV_VARS } from '../util/consts/env.vars';
import { Environment } from '../util/environment';
import { LogService } from "../util/log.services";

const entity: string = 'EventNotification';

export class EventNotification {

    private log: LogService;

    constructor() {
        this.log = LogService.getInstnce();
    }

    private _typedRequest(request: any, resourceURL: URL, method: string, content?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            let req = request.request({
                method: method,
                hostname: resourceURL.hostname,
                path: resourceURL.pathname,
                timeout: Environment.getValue(ENV_VARS.REST_REQUEST_TIMEOUT, 15000),
                headers: {
                    "Content-Type": "application/json"
                }
            }, (res) => {
                resolve(res);
            });
            req.on('error', (e) => {
                reject(e.message);
            });
            if (content) req.write(JSON.stringify(content));
            req.end();
        });
    }

    public async request(url: string, method: string, content?: any) {
        if (!url) {
            this.log.error(entity, `The HOST for the ${method} method cannot be null`);
            throw new Error(`The HOST for the ${method} method cannot be null`);
        }
        const resourceURL = new URL(url);
        this.log.debug(entity, `Requesting a ${method} at ${url}`);
        switch (resourceURL.protocol) {
            case "http:":
                this.log.info(entity, `Request to a insecure address`);
                return await this._typedRequest(http, resourceURL, method, content);
                break;
            case "https:":
                this.log.info(entity, `Request to a secure address`);
                return await this._typedRequest(https, resourceURL, method, content);
                break;
            default:
                throw new Error(`Protocol not identified in the provided url: ${url}`);
                break;
        }
    }

    private async _typedGet(request: any, resourceURL: URL): Promise<any> {
        return new Promise((resolve, reject) => {

            const options = {
                hostname: resourceURL.hostname,
                path: resourceURL.pathname,
                port: resourceURL.port,
                timeout: Environment.getValue(ENV_VARS.REST_REQUEST_TIMEOUT, 15000),
                method: 'GET',
                headers: {
                    "Content-Type": "application/json"
                }
            }

            const req = request.request(options, res => {
                res.setEncoding('utf8');
                res.on('data', d => {
                    resolve(d);
                })
            })

            req.on('error', error => {
                this.log.error(entity, `Error requesting a GET at ${resourceURL.host} - ${error}`);
                reject(error);
            })
            req.end()
        });
    }

    public async get(url: string) {
        if (!url) {
            this.log.error(entity, `The HOST for the GET method cannot be null`);
            throw new Error(`The HOST for the GET method cannot be null`);
        }
        const resourceURL = new URL(url);
        this.log.debug(entity, `Requesting a GET at ${url}`);
        switch (resourceURL.protocol) {
            case "http:":
                this.log.info(entity, `Request to a insecure address`);
                return await this._typedGet(http, resourceURL);
                break;
            case "https:":
                this.log.info(entity, `Request to a secure address`);
                return await this._typedGet(https, resourceURL);
                break;
            default:
                throw new Error(`Protocol not identified in the provided url: ${url}`);
                break;
        }

    }
}