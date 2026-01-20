import mongoose from "mongoose";
import connectDb from "../../config/db";
import { createDefaultTaskPhases } from "../../services/taskPhase/createDefaultTaskPhases";

const addDefaultTaskPhasesForCompany = async (companyId: string) => {
  try {
    console.log("🔄 Starting migration...");
    console.log(`📌 Company ID: ${companyId}`);

    // Connect to database
    await connectDb();
    console.log("✅ Database connected");

    // Validate company ID
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error(`Invalid company ID format: ${companyId}`);
    }

    const company_object_id = new mongoose.Types.ObjectId(companyId);

    // Start session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log("🔄 Creating default task phases...");

      await createDefaultTaskPhases({
        company_object_id,
        session,
      });

      await session.commitTransaction();
      console.log("✅ Default task phases created successfully!");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Disconnect from database
    await mongoose.disconnect();
    console.log("✅ Database disconnected");
    console.log("🎉 Migration completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Get company ID from command line arguments
const companyId = process.argv[2];

if (!companyId) {
  console.error("❌ Error: Company ID is required");
  console.log(
    "Usage: ts-node src/utils/migrations/addDefaultTaskPhases.ts <company_id>",
  );
  console.log(
    "Example: ts-node src/utils/migrations/addDefaultTaskPhases.ts 695e5d205643833a5db28161",
  );
  process.exit(1);
}

// Run the migration
addDefaultTaskPhasesForCompany(companyId);
