import mongoose from "mongoose";
import { MONGO_URI } from "./config";

const connectDb = async () => {
	try {
		if (MONGO_URI) {
			const conn = await mongoose.connect(MONGO_URI, {
				serverSelectionTimeoutMS: 40000
			});
			console.log("Second Connection -->", MONGO_URI);
			console.log(`\x1b[34m \x1b[1m \x1b[4mMongoDB Connected: ${conn.connection.port}\x1b[0m`);
		}
	} catch (err) {
		throw err;
	}
};
export default connectDb;
