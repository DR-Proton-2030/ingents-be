import util from "util";

// ANSI escape code constants for rich color styling
export const styles = {
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
function maskConnectionString(str: string): string {
	return str.replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/, (_, proto, user) => {
		return `${styles.cyan}${proto}${styles.bold}${user}:${styles.dim}********${styles.reset}${styles.cyan}@`;
	});
}

// Format timestamp
function getTimestamp(): string {
	const now = new Date();
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");
	return `${styles.gray}[${hours}:${minutes}:${seconds}]${styles.reset}`;
}

export function printStartupDashboard(port: number, mongoUri: string) {
	const borderStyle = "\x1b[38;5;39m"; // Deep Sky Blue (Neon)
	const textStyle = "\x1b[1;36m"; // Cyan Bold
	const reset = "\x1b[0m";
	const gray = "\x1b[90m";
	const white = "\x1b[37m";

	const boxWidth = 60;
	const topBorder = `${borderStyle}  ╔${"═".repeat(boxWidth - 2)}╗${reset}`;
	const content = "⚡  INGENTS INTELLIGENCE SYSTEM ACTIVE ⚡";
	const middleLine = `${borderStyle}  ║        ${textStyle}${styles.bold}${content}${reset}${borderStyle}        ║${reset}`;
	const bottomBorder = `${borderStyle}  ╚${"═".repeat(boxWidth - 2)}╝${reset}`;

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
	} catch (e) {
		// Fallback
	}

	const rawLog = (global as any).__originalConsole?.log || console.log;

	rawLog(`\n${topBorder}`);
	rawLog(middleLine);
	rawLog(`${bottomBorder}`);
	rawLog(`  ${white}● Status:      ${styles.bold}\x1b[38;5;85mOnline & Listening${reset}`);
	rawLog(`  ${white}● Port:        ${styles.bold}\x1b[38;5;220m${port}${reset}`);
	rawLog(`  ${white}● Mode:        ${styles.bold}\x1b[38;5;213m${mode}${reset}`);
	rawLog(`  ${white}● API URL:     ${styles.bold}\x1b[38;5;117m${apiUrl}${reset}`);
	rawLog(`  ${gray}──────────────────────────────────────────────────────────────────────────${reset}\n`);
	rawLog(`  \x1b[38;5;85m🌱  DATABASE CONNECTION ESTABLISHED${reset}`);
	rawLog(`  ${white}├── Status    >  ${styles.bold}\x1b[38;5;85mOnline${reset} 🟢`);
	rawLog(`  ${white}├── Cluster   >  ${styles.bold}\x1b[38;5;117m${cluster}${reset}`);
	rawLog(`  ${white}└── Database  >  ${styles.bold}\x1b[38;5;220m${dbName}${reset}\n`);
}

// REDIS & WORKER SERVICES STATE MACHINE
const loadedServices = {
	redis: false,
	scheduler: false,
	insights: false,
	subscription: false,
	cron: false
};
let redisDashboardPrinted = false;
let timeoutHandle: NodeJS.Timeout | null = null;

export function printRedisDashboard(status: typeof loadedServices) {
	const borderStyle = "\x1b[38;5;39m"; // Match main system neon blue style!
	const textStyle = "\x1b[1;36m"; // Cyan Bold
	const reset = "\x1b[0m";
	const gray = "\x1b[90m";
	const white = "\x1b[37m";

	const boxWidth = 60;
	const topBorder = `${borderStyle}  ╔${"═".repeat(boxWidth - 2)}╗${reset}`;
	const content = "📡  REDIS & WORKER SERVICES INITIALIZED 📡";
	const middleLine = `${borderStyle}  ║       ${textStyle}${styles.bold}${content}${reset}${borderStyle}        ║${reset}`;
	const bottomBorder = `${borderStyle}  ╚${"═".repeat(boxWidth - 2)}╝${reset}`;

	const rawLog = (global as any).__originalConsole?.log || console.log;

	const getStatusIndicator = (active: boolean) => 
		active ? `\x1b[38;5;85mOnline${reset} 🟢` : `\x1b[31mOffline${reset} 🔴`;

	const getWorkerIndicator = (active: boolean, name: string) =>
		active ? `\x1b[38;5;117m${name} active${reset} 🟢` : `\x1b[31mInactive${reset} 🔴`;

	rawLog(`${topBorder}`);
	rawLog(middleLine);
	rawLog(`${bottomBorder}`);
	rawLog(`  ${white}● Redis Connection: ${styles.bold}${getStatusIndicator(status.redis)}`);
	rawLog(`  ${white}● Scheduler Worker: ${styles.bold}${getWorkerIndicator(status.scheduler, "Social Media Worker")}`);
	rawLog(`  ${white}● Insights Worker:  ${styles.bold}${getWorkerIndicator(status.insights, "Insights Sync Worker")}`);
	rawLog(`  ${white}● Subscription:     ${styles.bold}${getWorkerIndicator(status.subscription, "Subscription Worker")}`);
	rawLog(`  ${white}● Recurring Jobs:   ${styles.bold}${getStatusIndicator(status.cron)}`);
	rawLog(`  ${gray}──────────────────────────────────────────────────────────────────────────${reset}\n`);
}

function triggerRedisDashboardCheck() {
	const allLoaded = Object.values(loadedServices).every(v => v);
	if (allLoaded && !redisDashboardPrinted) {
		if (timeoutHandle) clearTimeout(timeoutHandle);
		redisDashboardPrinted = true;
		setTimeout(() => {
			printRedisDashboard(loadedServices);
		}, 50);
	} else if (!redisDashboardPrinted && !timeoutHandle) {
		// Fallback timeout of 10 seconds to print whatever is ready
		timeoutHandle = setTimeout(() => {
			redisDashboardPrinted = true;
			printRedisDashboard(loadedServices);
		}, 10000);
	}
}

export class Logger {
	static log(prefix: string, message: any, ...args: any[]) {
		const formattedMsg = typeof message === "string" ? message : util.inspect(message, { colors: true, depth: 3 });
		const formattedArgs = args.map(arg => typeof arg === "string" ? arg : util.inspect(arg, { colors: true, depth: 3 }));
		
		process.stdout.write(
			`${getTimestamp()} ${prefix} ${formattedMsg} ${formattedArgs.join(" ")}\n`
		);
	}

	static info(message: any, ...args: any[]) {
		this.log(`${styles.bold}${styles.sky}🔹 [INFO]${styles.reset}`, message, ...args);
	}

	static success(message: any, ...args: any[]) {
		this.log(`${styles.bold}${styles.mint}🟢 [SUCCESS]${styles.reset}`, message, ...args);
	}

	static warn(message: any, ...args: any[]) {
		this.log(`${styles.bold}${styles.orange}🟡 [WARN]${styles.reset}`, message, ...args);
	}

	static error(message: any, ...args: any[]) {
		this.log(`${styles.bold}${styles.red}🔴 [ERROR]${styles.reset}`, message, ...args);
	}

	static debug(message: any, ...args: any[]) {
		this.log(`${styles.dim}${styles.gray}⚙️ [DEBUG]${styles.reset}`, message, ...args);
	}

	static db(message: any, ...args: any[]) {
		this.log(`${styles.bold}${styles.teal}🗄️ [DATABASE]${styles.reset}`, message, ...args);
	}

	static redis(message: any, ...args: any[]) {
		this.log(`${styles.bold}${styles.pink}📡 [REDIS]${styles.reset}`, message, ...args);
	}

	static worker(message: any, ...args: any[]) {
		this.log(`${styles.bold}${styles.purple}🚀 [WORKER]${styles.reset}`, message, ...args);
	}

	static http(message: any, ...args: any[]) {
		this.log(`${styles.bold}${styles.gold}⚡ [HTTP]${styles.reset}`, message, ...args);
	}

	static system(message: any, ...args: any[]) {
		this.log(`${styles.bold}${styles.cyan}✨ [SYSTEM]${styles.reset}`, message, ...args);
	}
}

// Parse standard plain console prints and convert them into our beautiful structured design
function parseAndPrettify(args: any[]): { prefix: string; formattedArgs: any[]; silence?: boolean } {
	if (args.length === 0) return { prefix: `${styles.bold}${styles.sky}🔹 [INFO]${styles.reset}`, formattedArgs: args };

	const firstArg = args[0];

	if (typeof firstArg === "string") {
		// Clean ANSI codes first to match text cleanly
		const cleanText = firstArg.replace(/\x1b\[[0-9;]*m/g, "").trim();

		// Match Server Listener
		if (cleanText.includes("Ingents Server is listening at")) {
			const match = cleanText.match(/http:\/\/localhost:(\d+)/);
			const port = match ? match[1] : "8989";
			const prettyMsg = `${styles.bold}${styles.white}Ingents Server is active at ${styles.underline}${styles.gold}http://localhost:${port}${styles.reset}`;
			return {
				prefix: `${styles.bold}${styles.cyan}✨ [SYSTEM]${styles.reset}`,
				formattedArgs: [prettyMsg, ...args.slice(1)]
			};
		}

		// Match MongoDB Second Connection String
		if (cleanText.includes("Second Connection -->")) {
			const rawUri = cleanText.replace("Second Connection -->", "").trim();
			const masked = maskConnectionString(rawUri);
			return {
				prefix: `${styles.bold}${styles.teal}🗄️ [DATABASE]${styles.reset}`,
				formattedArgs: [`${styles.bold}${styles.gray}Establishing Connection -->${styles.reset} ${masked}`]
			};
		}

		// Match MongoDB Connected Port
		if (cleanText.includes("MongoDB Connected:")) {
			const port = cleanText.replace("MongoDB Connected:", "").trim();
			return {
				prefix: `${styles.bold}${styles.mint}🟢 [DATABASE]${styles.reset}`,
				formattedArgs: [`${styles.bold}${styles.white}MongoDB Connected Successfully ${styles.gray}(Port: ${port})${styles.reset}`]
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
			const prettyMsg = `${styles.dim}Active session for User:${styles.reset} ${styles.bold}${styles.sky}${userId}${styles.reset} ${styles.dim}| Company:${styles.reset} ${styles.bold}${styles.teal}${orgId}${styles.reset}`;
			return {
				prefix: `${styles.bold}${styles.blue}👤 [USER]${styles.reset}`,
				formattedArgs: [prettyMsg, ...args.slice(1)]
			};
		}

		// Match general warning messages
		if (cleanText.startsWith("[Scheduler] AI credit limit reached")) {
			return {
				prefix: `${styles.bold}${styles.orange}🟡 [WARN]${styles.reset}`,
				formattedArgs: [args[0], ...args.slice(1)]
			};
		}
	}

	// Default formatting if no specific pattern is matched
	return {
		prefix: `${styles.bold}${styles.sky}🔹 [INFO]${styles.reset}`,
		formattedArgs: args
	};
}

// Override global console methods with a elegant wrapper
export function initGlobalInterceptor() {
	const originalLog = console.log;
	const originalWarn = console.warn;
	const originalError = console.error;
	const originalInfo = console.info;

	console.log = (...args: any[]) => {
		const result = parseAndPrettify(args);
		if (result && result.silence) {
			return;
		}
		const { prefix, formattedArgs } = result;
		const message = formattedArgs[0];
		const rest = formattedArgs.slice(1);
		Logger.log(prefix, message, ...rest);
	};

	console.info = (...args: any[]) => {
		Logger.log(`${styles.bold}${styles.sky}🔹 [INFO]${styles.reset}`, args[0], ...args.slice(1));
	};

	console.warn = (...args: any[]) => {
		// Clean up ANSI codes if they are duplicated or wrapped
		const cleanArgs = args.map(arg => {
			if (typeof arg === "string") {
				return arg.replace(/\x1b\[[0-9;]*m/g, "");
			}
			return arg;
		});
		Logger.log(`${styles.bold}${styles.orange}🟡 [WARN]${styles.reset}`, cleanArgs[0], ...cleanArgs.slice(1));
	};

	console.error = (...args: any[]) => {
		const cleanArgs = args.map(arg => {
			if (typeof arg === "string") {
				return arg.replace(/\x1b\[[0-9;]*m/g, "");
			}
			return arg;
		});
		Logger.log(`${styles.bold}${styles.red}🔴 [ERROR]${styles.reset}`, cleanArgs[0], ...cleanArgs.slice(1));
	};

	// Save original references on global in case they are needed for raw output
	(global as any).__originalConsole = {
		log: originalLog,
		warn: originalWarn,
		error: originalError,
		info: originalInfo
	};
}
