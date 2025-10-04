import http from "http";
import app from "./app";
import { port } from "./config/config";
import connectDb from "./config/db";
import initSocket from "./socket";

// Connect to MongoDB
connectDb();

const server = http.createServer(app);

initSocket(server);

server.listen(port, () => {
	return console.log(`\x1b[33m \x1b[1m \x1b[4mBidready Server is listening at http://localhost:${port}\x1b[0m`);
});

