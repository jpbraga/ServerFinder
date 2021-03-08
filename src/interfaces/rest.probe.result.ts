import { ProbeData } from "./rest.probe.data";

export interface ProbeDataResult {
    servers: Array<ProbeData>,
    total: {
        servers:number,
        connectedClients: number
    }
}