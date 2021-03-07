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
exports.BusinessLayer = void 0;
const log_services_1 = require("../util/log.services");
const rest_event_types_1 = require("../api/consts/rest.event.types");
const environment_1 = require("../util/environment");
const env_vars_1 = require("../util/consts/env.vars");
const entity = "BusinessLayer";
const REDIS_SERVERS_LIST = "SERVERS";
class BusinessLayer {
    constructor(db, en, rest, serverId) {
        this.db = db;
        this.en = en;
        this.rest = rest;
        this.serverId = serverId;
        this.log = log_services_1.LogService.getInstnce();
        this.log.info(entity, `Server reference id is ${this.serverId}`);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.rest.registerEventListener((event) => __awaiter(this, void 0, void 0, function* () {
                this.processRESTApiEvents(event.type, event.content.payload, event.content.uid);
            }));
            this.log.debug(entity, 'RESTApi event listener registered!');
            this.log.info(entity, 'Business layer ready!');
        });
    }
    processRESTApiEvents(type, content, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (type) {
                case rest_event_types_1.REST_EVENT_TYPES.BROADCAST:
                    let servers = yield this.db.getSet(REDIS_SERVERS_LIST);
                    this.log.debug(entity, `Broadcasting content: ${{ payload: content }}`);
                    for (let server of servers) {
                        let serverAddress = JSON.parse(server).address;
                        serverAddress += environment_1.Environment.getValue(env_vars_1.ENV_VARS.EVENT_BROADCAST_PATH, "/broadcast");
                        this.en.request(serverAddress, 'PUT', { payload: content });
                    }
                    break;
                case rest_event_types_1.REST_EVENT_TYPES.SEND_MESSAGE_REQUEST:
                    let serverAddress = yield this.db.find(sender);
                    if (!serverAddress) {
                        this.log.error(entity, `The server address for the uid ${sender} could not be found`);
                        return;
                    }
                    serverAddress += environment_1.Environment.getValue(env_vars_1.ENV_VARS.EVENT_MESSAGE_PATH, "/sendMessage");
                    serverAddress += `/${sender}`;
                    this.en.request(serverAddress, 'POST', { payload: content });
                    break;
                default:
                    break;
            }
        });
    }
}
exports.BusinessLayer = BusinessLayer;
