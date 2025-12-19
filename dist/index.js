"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config/config");
const db_1 = __importDefault(require("./config/db"));
// Connect to MongoDB
(0, db_1.default)();
const server = http_1.default.createServer(app_1.default);
server.listen(config_1.port, () => {
    return console.log(`\x1b[33m \x1b[1m \x1b[4mIngents Server is listening at http://localhost:${config_1.port}\x1b[0m`);
});
