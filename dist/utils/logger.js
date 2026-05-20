"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGlobalInterceptor = exports.Logger = exports.printRedisDashboard = exports.printStartupDashboard = exports.styles = void 0;
const util_1 = __importDefault(require("util"));
// ANSI escape code constants for rich color styling
exports.styles = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    underline: "\x1b[4m",
    // Foreground Colors
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    // Premium 256 colors
    orange: "\x1b[38;5;208m",
    purple: "\x1b[38;5;99m",
    teal: "\x1b[38;5;86m",
    pink: "\x1b[38;5;213m",
    gold: "\x1b[38;5;220m",
    mint: "\x1b[38;5;121m",
    sky: "\x1b[38;5;117m",
    // Background Colors
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
};
// Mask sensitive MongoDB connection URLs
function maskConnectionString(str) {
    return str.replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/, (_, proto, user) => {
        return `${exports.styles.cyan}${proto}${exports.styles.bold}${user}:${exports.styles.dim}********${exports.styles.reset}${exports.styles.cyan}@`;
    });
}
// Format timestamp
function getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${exports.styles.gray}[${hours}:${minutes}:${seconds}]${exports.styles.reset}`;
}
function printStartupDashboard(port, mongoUri) {
    var _a;
    const borderStyle = "\x1b[38;5;39m"; // Deep Sky Blue (Neon)
    const textStyle = "\x1b[1;36m"; // Cyan Bold
    const reset = "\x1b[0m";
    const gray = "\x1b[90m";
    const white = "\x1b[37m";
    // Compensate for ⚡ (visual-double, JS-single): Top/Bottom border = 58 columns
    const topBorder = `${borderStyle}  ╔${"═".repeat(58)}╗${reset}`;
    const content = "⚡  INGENTS INTELLIGENCE SYSTEM ACTIVE ⚡";
    const middleLine = `${borderStyle}  ║        ${textStyle}${exports.styles.bold}${content}${reset}${borderStyle}         ║${reset}`;
    const bottomBorder = `${borderStyle}  ╚${"═".repeat(58)}╝${reset}`;
    const dbBorderStyle = "\x1b[38;5;85m"; // Vibrant Mint/Green (Neon)
    const dbTextStyle = "\x1b[1;32m"; // Green Bold
    const dbTopBorder = `${dbBorderStyle}  ╔${"═".repeat(56)}╗${reset}`;
    const dbContent = "🌱  DATABASE CONNECTION ESTABLISHED 🌱";
    const dbMiddleLine = `${dbBorderStyle}  ║        ${dbTextStyle}${exports.styles.bold}${dbContent}${reset}${dbBorderStyle}          ║${reset}`;
    const dbBottomBorder = `${dbBorderStyle}  ╚${"═".repeat(56)}╝${reset}`;
    const mode = process.env.NODE_ENV || "development";
    const apiUrl = `http://localhost:${port}/api`;
    let cluster = "localhost";
    let dbName = "ingents";
    try {
        if (mongoUri) {
            // Extract host and db cleanly and securely without exposing password
            const withoutProto = mongoUri.replace(/^mongodb(\+srv)?:\/\//, "");
            const parts = withoutProto.split("@");
            const hostAndDb = parts.length > 1 ? parts[1] : parts[0];
            const hostDbParts = hostAndDb.split("/");
            cluster = hostDbParts[0].split(",")[0];
            if (hostDbParts.length > 1) {
                const dbQueryParts = hostDbParts[1].split("?");
                dbName = dbQueryParts[0] || "ingents";
            }
        }
    }
    catch (e) {
        // Fallback
    }
    const rawLog = ((_a = global.__originalConsole) === null || _a === void 0 ? void 0 : _a.log) || console.log;
    rawLog(`\n${topBorder}`);
    rawLog(middleLine);
    rawLog(`${bottomBorder}`);
    rawLog(`  ${white}● Status:      ${exports.styles.bold}\x1b[38;5;85mOnline & Listening${reset}`);
    rawLog(`  ${white}● Port:        ${exports.styles.bold}\x1b[38;5;220m${port}${reset}`);
    rawLog(`  ${white}● Mode:        ${exports.styles.bold}\x1b[38;5;213m${mode}${reset}`);
    rawLog(`  ${white}● API URL:     ${exports.styles.bold}\x1b[38;5;117m${apiUrl}${reset}`);
    rawLog(`  ${gray}──────────────────────────────────────────────────────────────────────────${reset}\n`);
    rawLog(dbTopBorder);
    rawLog(dbMiddleLine);
    rawLog(dbBottomBorder);
    rawLog(`  ${white}● Database Status:  ${exports.styles.bold}\x1b[38;5;85mOnline${reset} 🟢`);
    rawLog(`  ${white}● MongoDB Cluster:  ${exports.styles.bold}\x1b[38;5;117m${cluster}${reset}`);
    rawLog(`  ${white}● Database Name:    ${exports.styles.bold}\x1b[38;5;220m${dbName}${reset}`);
    rawLog(`  ${gray}──────────────────────────────────────────────────────────────────────────${reset}\n`);
}
exports.printStartupDashboard = printStartupDashboard;
// REDIS & WORKER SERVICES STATE MACHINE
const loadedServices = {
    redis: false,
    scheduler: false,
    insights: false,
    subscription: false,
    cron: false
};
let redisDashboardPrinted = false;
let timeoutHandle = null;
function printRedisDashboard(status) {
    var _a;
    const borderStyle = "\x1b[38;5;129m"; // Vibrant Purple (Neon)
    const textStyle = "\x1b[1;35m"; // Magenta Bold
    const reset = "\x1b[0m";
    const gray = "\x1b[90m";
    const white = "\x1b[37m";
    // Compensate for 📡 (visual-single, JS-double): Top/Bottom border = 56 columns
    const topBorder = `${borderStyle}  ╔${"═".repeat(56)}╗${reset}`;
    const content = "📡  REDIS & WORKER SERVICES INITIALIZED 📡";
    const middleLine = `${borderStyle}  ║       ${textStyle}${exports.styles.bold}${content}${reset}${borderStyle}       ║${reset}`;
    const bottomBorder = `${borderStyle}  ╚${"═".repeat(56)}╝${reset}`;
    const rawLog = ((_a = global.__originalConsole) === null || _a === void 0 ? void 0 : _a.log) || console.log;
    const getStatusIndicator = (active) => active ? `\x1b[38;5;85mOnline${reset} 🟢` : `\x1b[31mOffline${reset} 🔴`;
    const getWorkerIndicator = (active, name) => active ? `\x1b[38;5;117m${name} active${reset} 🟢` : `\x1b[31mInactive${reset} 🔴`;
    rawLog(`${topBorder}`);
    rawLog(middleLine);
    rawLog(`${bottomBorder}`);
    rawLog(`  ${white}● Redis Connection: ${exports.styles.bold}${getStatusIndicator(status.redis)}`);
    rawLog(`  ${white}● Scheduler Worker: ${exports.styles.bold}${getWorkerIndicator(status.scheduler, "Social Media Worker")}`);
    rawLog(`  ${white}● Insights Worker:  ${exports.styles.bold}${getWorkerIndicator(status.insights, "Insights Sync Worker")}`);
    rawLog(`  ${white}● Subscription:     ${exports.styles.bold}${getWorkerIndicator(status.subscription, "Subscription Worker")}`);
    rawLog(`  ${white}● Recurring Jobs:   ${exports.styles.bold}${getStatusIndicator(status.cron)}`);
    rawLog(`  ${gray}──────────────────────────────────────────────────────────────────────────${reset}\n`);
}
exports.printRedisDashboard = printRedisDashboard;
function triggerRedisDashboardCheck() {
    const allLoaded = Object.values(loadedServices).every(v => v);
    if (allLoaded && !redisDashboardPrinted) {
        if (timeoutHandle)
            clearTimeout(timeoutHandle);
        redisDashboardPrinted = true;
        setTimeout(() => {
            printRedisDashboard(loadedServices);
        }, 50);
    }
    else if (!redisDashboardPrinted && !timeoutHandle) {
        // Fallback timeout of 10 seconds to print whatever is ready
        timeoutHandle = setTimeout(() => {
            redisDashboardPrinted = true;
            printRedisDashboard(loadedServices);
        }, 10000);
    }
}
class Logger {
    static log(prefix, message, ...args) {
        const formattedMsg = typeof message === "string" ? message : util_1.default.inspect(message, { colors: true, depth: 3 });
        const formattedArgs = args.map(arg => typeof arg === "string" ? arg : util_1.default.inspect(arg, { colors: true, depth: 3 }));
        process.stdout.write(`${getTimestamp()} ${prefix} ${formattedMsg} ${formattedArgs.join(" ")}\n`);
    }
    static info(message, ...args) {
        this.log(`${exports.styles.bold}${exports.styles.sky}🔹 [INFO]${exports.styles.reset}`, message, ...args);
    }
    static success(message, ...args) {
        this.log(`${exports.styles.bold}${exports.styles.mint}🟢 [SUCCESS]${exports.styles.reset}`, message, ...args);
    }
    static warn(message, ...args) {
        this.log(`${exports.styles.bold}${exports.styles.orange}🟡 [WARN]${exports.styles.reset}`, message, ...args);
    }
    static error(message, ...args) {
        this.log(`${exports.styles.bold}${exports.styles.red}🔴 [ERROR]${exports.styles.reset}`, message, ...args);
    }
    static debug(message, ...args) {
        this.log(`${exports.styles.dim}${exports.styles.gray}⚙️ [DEBUG]${exports.styles.reset}`, message, ...args);
    }
    static db(message, ...args) {
        this.log(`${exports.styles.bold}${exports.styles.teal}🗄️ [DATABASE]${exports.styles.reset}`, message, ...args);
    }
    static redis(message, ...args) {
        this.log(`${exports.styles.bold}${exports.styles.pink}📡 [REDIS]${exports.styles.reset}`, message, ...args);
    }
    static worker(message, ...args) {
        this.log(`${exports.styles.bold}${exports.styles.purple}🚀 [WORKER]${exports.styles.reset}`, message, ...args);
    }
    static http(message, ...args) {
        this.log(`${exports.styles.bold}${exports.styles.gold}⚡ [HTTP]${exports.styles.reset}`, message, ...args);
    }
    static system(message, ...args) {
        this.log(`${exports.styles.bold}${exports.styles.cyan}✨ [SYSTEM]${exports.styles.reset}`, message, ...args);
    }
}
exports.Logger = Logger;
// Parse standard plain console prints and convert them into our beautiful structured design
function parseAndPrettify(args) {
    if (args.length === 0)
        return { prefix: `${exports.styles.bold}${exports.styles.sky}🔹 [INFO]${exports.styles.reset}`, formattedArgs: args };
    const firstArg = args[0];
    if (typeof firstArg === "string") {
        // Clean ANSI codes first to match text cleanly
        const cleanText = firstArg.replace(/\x1b\[[0-9;]*m/g, "").trim();
        // Match and completely silence dotenv / dotenvx environment loading noise
        if (cleanText.includes("[dotenv@") || cleanText.includes("injecting env")) {
            return { prefix: "", formattedArgs: [], silence: true };
        }
        // Match Server Listener
        if (cleanText.includes("Ingents Server is listening at")) {
            const match = cleanText.match(/http:\/\/localhost:(\d+)/);
            const port = match ? match[1] : "8989";
            const prettyMsg = `${exports.styles.bold}${exports.styles.white}Ingents Server is active at ${exports.styles.underline}${exports.styles.gold}http://localhost:${port}${exports.styles.reset}`;
            return {
                prefix: `${exports.styles.bold}${exports.styles.cyan}✨ [SYSTEM]${exports.styles.reset}`,
                formattedArgs: [prettyMsg, ...args.slice(1)]
            };
        }
        // Match MongoDB Second Connection String
        if (cleanText.includes("Second Connection -->")) {
            const rawUri = cleanText.replace("Second Connection -->", "").trim();
            const masked = maskConnectionString(rawUri);
            return {
                prefix: `${exports.styles.bold}${exports.styles.teal}🗄️ [DATABASE]${exports.styles.reset}`,
                formattedArgs: [`${exports.styles.bold}${exports.styles.gray}Establishing Connection -->${exports.styles.reset} ${masked}`]
            };
        }
        // Match MongoDB Connected Port
        if (cleanText.includes("MongoDB Connected:")) {
            const port = cleanText.replace("MongoDB Connected:", "").trim();
            return {
                prefix: `${exports.styles.bold}${exports.styles.mint}🟢 [DATABASE]${exports.styles.reset}`,
                formattedArgs: [`${exports.styles.bold}${exports.styles.white}MongoDB Connected Successfully ${exports.styles.gray}(Port: ${port})${exports.styles.reset}`]
            };
        }
        // --- Redis and Worker Interception to form the beautiful Box Dashboard ---
        // Redis success or failure
        if (cleanText.includes("[Redis] Connection successful") || cleanText.includes("[InsightsSync] Redis connection verified")) {
            loadedServices.redis = true;
            triggerRedisDashboardCheck();
            return { prefix: "", formattedArgs: [], silence: true };
        }
        if (cleanText.includes("[Redis] Not available")) {
            loadedServices.redis = false;
            triggerRedisDashboardCheck();
            return { prefix: "", formattedArgs: [], silence: true };
        }
        // Scheduler Worker success or skip
        if (cleanText.includes("[BullMQ] Social Media Scheduler Worker initialized")) {
            loadedServices.scheduler = true;
            triggerRedisDashboardCheck();
            return { prefix: "", formattedArgs: [], silence: true };
        }
        if (cleanText.includes("[BullMQ] Scheduler initialization skipped")) {
            loadedServices.scheduler = false;
            triggerRedisDashboardCheck();
            return { prefix: "", formattedArgs: [], silence: true };
        }
        // Insights Worker success or skip
        if (cleanText.includes("[BullMQ] Insights Sync Worker initialized")) {
            loadedServices.insights = true;
            triggerRedisDashboardCheck();
            return { prefix: "", formattedArgs: [], silence: true };
        }
        if (cleanText.includes("[BullMQ] Insights Sync initialization skipped")) {
            loadedServices.insights = false;
            triggerRedisDashboardCheck();
            return { prefix: "", formattedArgs: [], silence: true };
        }
        // Subscription Worker success or skip
        if (cleanText.includes("[BullMQ] Subscription Worker initialized")) {
            loadedServices.subscription = true;
            triggerRedisDashboardCheck();
            return { prefix: "", formattedArgs: [], silence: true };
        }
        if (cleanText.includes("[BullMQ] Subscription Worker initialization skipped")) {
            loadedServices.subscription = false;
            triggerRedisDashboardCheck();
            return { prefix: "", formattedArgs: [], silence: true };
        }
        // Cron jobs registered
        if (cleanText.includes("[InsightsSync] Repeatable cron jobs registered")) {
            loadedServices.cron = true;
            triggerRedisDashboardCheck();
            return { prefix: "", formattedArgs: [], silence: true };
        }
        // Match active user session prints: "user 696511ea16409a76337f415d 695e5d205643833a5db28161"
        if (/^user\s+[0-9a-fA-F]{24}\s+[0-9a-fA-F]{24}/.test(cleanText)) {
            const parts = cleanText.split(/\s+/);
            const userId = parts[1];
            const orgId = parts[2];
            const prettyMsg = `${exports.styles.dim}Active session for User:${exports.styles.reset} ${exports.styles.bold}${exports.styles.sky}${userId}${exports.styles.reset} ${exports.styles.dim}| Company:${exports.styles.reset} ${exports.styles.bold}${exports.styles.teal}${orgId}${exports.styles.reset}`;
            return {
                prefix: `${exports.styles.bold}${exports.styles.blue}👤 [USER]${exports.styles.reset}`,
                formattedArgs: [prettyMsg, ...args.slice(1)]
            };
        }
        // Match general warning messages
        if (cleanText.startsWith("[Scheduler] AI credit limit reached")) {
            return {
                prefix: `${exports.styles.bold}${exports.styles.orange}🟡 [WARN]${exports.styles.reset}`,
                formattedArgs: [args[0], ...args.slice(1)]
            };
        }
    }
    // Default formatting if no specific pattern is matched
    return {
        prefix: `${exports.styles.bold}${exports.styles.sky}🔹 [INFO]${exports.styles.reset}`,
        formattedArgs: args
    };
}
// Override global console methods with a elegant wrapper
function initGlobalInterceptor() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;
    console.log = (...args) => {
        const result = parseAndPrettify(args);
        if (result && result.silence) {
            return;
        }
        const { prefix, formattedArgs } = result;
        const message = formattedArgs[0];
        const rest = formattedArgs.slice(1);
        Logger.log(prefix, message, ...rest);
    };
    console.info = (...args) => {
        Logger.log(`${exports.styles.bold}${exports.styles.sky}🔹 [INFO]${exports.styles.reset}`, args[0], ...args.slice(1));
    };
    console.warn = (...args) => {
        // Clean up ANSI codes if they are duplicated or wrapped
        const cleanArgs = args.map(arg => {
            if (typeof arg === "string") {
                return arg.replace(/\x1b\[[0-9;]*m/g, "");
            }
            return arg;
        });
        Logger.log(`${exports.styles.bold}${exports.styles.orange}🟡 [WARN]${exports.styles.reset}`, cleanArgs[0], ...cleanArgs.slice(1));
    };
    console.error = (...args) => {
        const cleanArgs = args.map(arg => {
            if (typeof arg === "string") {
                return arg.replace(/\x1b\[[0-9;]*m/g, "");
            }
            return arg;
        });
        Logger.log(`${exports.styles.bold}${exports.styles.red}🔴 [ERROR]${exports.styles.reset}`, cleanArgs[0], ...cleanArgs.slice(1));
    };
    // Save original references on global in case they are needed for raw output
    global.__originalConsole = {
        log: originalLog,
        warn: originalWarn,
        error: originalError,
        info: originalInfo
    };
}
exports.initGlobalInterceptor = initGlobalInterceptor;
