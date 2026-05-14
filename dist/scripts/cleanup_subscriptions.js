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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://drprotonofficial:Adarsha%40123@cluster0.9ogg6pi.mongodb.net/ingents";
function cleanup() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(MONGO_URI);
            console.log("Connected to MongoDB");
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error("Database not found");
            // 1. Delete all subscriptions (will be auto-created fresh per company)
            const subResult = yield db.collection("subscriptions").deleteMany({});
            console.log(`Deleted ${subResult.deletedCount} subscriptions`);
            // 2. Drop old indexes on subscriptions collection to avoid conflicts
            try {
                yield db.collection("subscriptions").dropIndexes();
                console.log("Dropped old subscription indexes");
            }
            catch (e) {
                console.log("No indexes to drop (collection may not exist yet)");
            }
            // 3. Delete all payments for clean slate
            const payResult = yield db.collection("payments").deleteMany({});
            console.log(`Deleted ${payResult.deletedCount} payments`);
            console.log("\nCleanup complete! The unique company_id index will be created on next server start.");
            process.exit(0);
        }
        catch (error) {
            console.error("Cleanup failed:", error);
            process.exit(1);
        }
    });
}
cleanup();
