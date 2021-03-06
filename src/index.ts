import * as dotenv from "dotenv";
import { Database } from "./database/database";
import { EventNotification } from "./services/event.notification";
import { Initializer } from "./Initializer";
import { RESTApi } from "./api/rest";
import { BusinessLayer } from "./orchestration/business.layer";
import { Guid } from "./util/guid";

const result = dotenv.config();
if (result.error) {
  throw result.error;
}

//Initialization
let serverId: string = Guid.generateGuid();
let db: Database = new Database();
let rest: RESTApi = new RESTApi(serverId);
let en: EventNotification = new EventNotification();
let bs: BusinessLayer = new BusinessLayer(db, en, rest, serverId);
let server: Initializer = new Initializer(db, rest, bs);