"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./utils/logger");
(0, logger_1.initGlobalInterceptor)();
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config/config");
const db_1 = __importDefault(require("./config/db"));
// Print initial connecting message as shown in the top line of the image
const rawLog = ((_a = global.__originalConsole) === null || _a === void 0 ? void 0 : _a.log) || console.log;
rawLog("\x1b[90m[DATABASE] Connecting to MongoDB cluster...\x1b[0m");
const server = http_1.default.createServer(app_1.default);
// Await both server listening and DB connection to avoid race conditions and print one clean dashboard
Promise.all([
    (0, db_1.default)(),
    new Promise((resolve) => {
        server.listen(config_1.port, () => resolve());
    })
])
    .then(() => {
    (0, logger_1.printStartupDashboard)(Number(config_1.port) || 8989, config_1.MONGO_URI || "");
})
    .catch((err) => {
    var _a;
    const rawError = ((_a = global.__originalConsole) === null || _a === void 0 ? void 0 : _a.error) || console.error;
    rawError("❌ [SYSTEM] Ingents startup failed:", err);
});
