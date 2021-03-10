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
exports.Initializer = void 0;
const log_services_1 = require("./util/log.services");
const entity = "Initializer";
class Initializer {
    constructor(db, rest, bs) {
        this.db = db;
        this.rest = rest;
        this.bs = bs;
        this.initialized = false;
        this.log = log_services_1.LogService.getInstnce();
        this.log.info(entity, 'Starting...');
        this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db.init();
                yield this.rest.init();
                yield this.bs.init();
                this.initialized = true;
                this.log.info(entity, 'Started and awaiting requests...');
            }
            catch (error) {
                this.log.fatal(entity, `An initialization error has occured - ${error.message}`);
                process.exit(-1);
            }
        });
    }
    isInitialized() {
        return this.initialized;
    }
}
exports.Initializer = Initializer;
