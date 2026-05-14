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
function checkUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(MONGO_URI);
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error("Database not found");
            const users = yield db.collection("users").find({}).toArray();
            console.log("Users:");
            users.forEach(u => console.log(`- ${u.full_name} (${u.email}): Company ID = ${u.company_object_id}`));
            const subscriptions = yield db.collection("subscriptions").find({}).toArray();
            console.log("\nSubscriptions:");
            subscriptions.forEach(s => console.log(`- ${s.plan} (Status: ${s.status}): Company ID = ${s.company_id}, User ID = ${s.user_id}`));
            process.exit(0);
        }
        catch (error) {
            console.error("Check failed:", error);
            process.exit(1);
        }
    });
}
checkUsers();
