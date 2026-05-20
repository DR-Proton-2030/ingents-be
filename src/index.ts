import { initGlobalInterceptor, printStartupDashboard } from "./utils/logger";
initGlobalInterceptor();

import http from "http";
import app from "./app";
import { port, MONGO_URI } from "./config/config";
import connectDb from "./config/db";

// Print initial connecting message as shown in the top line of the image
const rawLog = (global as any).__originalConsole?.log || console.log;
rawLog("\x1b[90m[DATABASE] Connecting to MongoDB cluster...\x1b[0m");

const server = http.createServer(app);

// Await both server listening and DB connection to avoid race conditions and print one clean dashboard
Promise.all([
	connectDb(),
	new Promise<void>((resolve) => {
		server.listen(port, () => resolve());
	})
])
	.then(() => {
		printStartupDashboard(Number(port) || 8989, MONGO_URI || "");
	})
	.catch((err) => {
		const rawError = (global as any).__originalConsole?.error || console.error;
		rawError("❌ [SYSTEM] Ingents startup failed:", err);
	});
