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
const db_1 = __importDefault(require("../../config/db"));
const createDefaultTaskPhases_1 = require("../../services/taskPhase/createDefaultTaskPhases");
const addDefaultTaskPhasesForCompany = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("🔄 Starting migration...");
        console.log(`📌 Company ID: ${companyId}`);
        // Connect to database
        yield (0, db_1.default)();
        console.log("✅ Database connected");
        // Validate company ID
        if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            throw new Error(`Invalid company ID format: ${companyId}`);
        }
        const company_object_id = new mongoose_1.default.Types.ObjectId(companyId);
        // Start session for transaction
        const session = yield mongoose_1.default.startSession();
        session.startTransaction();
        try {
            console.log("🔄 Creating default task phases...");
            yield (0, createDefaultTaskPhases_1.createDefaultTaskPhases)({
                company_object_id,
                session,
            });
            yield session.commitTransaction();
            console.log("✅ Default task phases created successfully!");
        }
        catch (error) {
            yield session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
        // Disconnect from database
        yield mongoose_1.default.disconnect();
        console.log("✅ Database disconnected");
        console.log("🎉 Migration completed successfully!");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Migration failed:", error);
        yield mongoose_1.default.disconnect();
        process.exit(1);
    }
});
// Get company ID from command line arguments
const companyId = process.argv[2];
if (!companyId) {
    console.error("❌ Error: Company ID is required");
    console.log("Usage: ts-node src/utils/migrations/addDefaultTaskPhases.ts <company_id>");
    console.log("Example: ts-node src/utils/migrations/addDefaultTaskPhases.ts 695e5d205643833a5db28161");
    process.exit(1);
}
// Run the migration
addDefaultTaskPhasesForCompany(companyId);
