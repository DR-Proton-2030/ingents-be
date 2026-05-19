import mongoose from "mongoose";
import { MONGO_URI } from "./config";

const connectDb = async () => {
	try {
		if (MONGO_URI) {
			await mongoose.connect(MONGO_URI, {
				serverSelectionTimeoutMS: 40000
			});
		}
	} catch (err) {
		throw err;
	}
};
export default connectDb;
