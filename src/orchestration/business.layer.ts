import express = require('express');
import { Database } from "../database/database";
import { EventNotification } from "../services/event.notification";
import { LogService } from "../util/log.services";
import { MessageEventNotification } from "../interfaces/event.message.notification";
import { RESTApi } from "../api/rest";
import { REST_EVENT_TYPES } from "../api/consts/rest.event.types";
import { Environment } from "../util/environment";
import { ENV_VARS } from "../util/consts/env.vars";
import { ProbeData } from "../interfaces/rest.probe.data";
import { ProbeDataResult } from "../interfaces/rest.probe.result";

const entity: string = "BusinessLayer";
const REDIS_SERVERS_LIST = "SERVERS";

export class BusinessLayer {

    private log: LogService;
    private uidKey: string = Environment.getValue(ENV_VARS.JWT_IDENTIFIER, "uid");
    constructor(private db: Database,
        private en: EventNotification,
        private rest: RESTApi,
        private serverId: string) {
        this.log = LogService.getInstnce();
        this.log.info(entity, `Server reference id is ${this.serverId}`);
    }

    public async init() {
        this.rest.registerEventListener(async (event: MessageEventNotification) => {
            this.processRESTApiEvents(event.type, event.content.payload, event.content[this.uidKey], event.content.res);
        });
        this.log.debug(entity, 'RESTApi event listener registered!');

        this.log.info(entity, 'Business layer ready!');
    }

    private async processRESTApiEvents(type: number, content: any, sender?: string, res?: express.Response) {

        switch (type) {
            case REST_EVENT_TYPES.BROADCAST:
                let servers = await this.db.getSet(REDIS_SERVERS_LIST);
                this.log.debug(entity, `Broadcasting content: ${{ payload: content }}`);
                for (let server of servers) {
                    let serverAddress = JSON.parse(server).address;
                    serverAddress += Environment.getValue(ENV_VARS.EVENT_BROADCAST_PATH, "/broadcast");
                    this.en.request(serverAddress, 'PUT', { payload: content });
                }
                break;
            case REST_EVENT_TYPES.SEND_MESSAGE_REQUEST:
                let serverAddress = await this.db.find(sender);
                if (!serverAddress) {
                    this.log.error(entity, `The server address for the ${this.uidKey} ${sender} could not be found`);
                    return;
                }

                serverAddress += Environment.getValue(ENV_VARS.EVENT_MESSAGE_PATH, "/sendMessage");
                serverAddress += `/${sender}`;
                this.en.request(serverAddress, 'POST', { payload: content });
                break;

            case REST_EVENT_TYPES.PROBE:
                let result = await this.probe();
                res.status(200).send(result);
                break;

            default:
                break;
        }
    }

    private async probe() {
        let servers = await this.db.getSet(REDIS_SERVERS_LIST);
        let details: Array<any> = [];
        let connectedClients: number = 0;
        for (let server of servers) {
            const address = JSON.parse(server).address;
            try {
                const result = JSON.parse(await this.en.get(address + '/probe'));
                connectedClients += result.connectedClients;
                details.push(result);
            }catch (err) {
                this.log.warn(entity, `Error probing server ${address}`);
            }
        }
        return {
            servers: details,
            total: {
                servers: details.length,
                connectedClients: connectedClients
            }
        }
    }
}