import mongoose from "mongoose";
import TaskPhase from "../../models/taskPhase/taskPhase.model";

export const createDefaultTaskPhases = async ({
  company_object_id,
  session,
}: {
  company_object_id: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}) => {
  const existingPhase = await TaskPhase.findOne({
    company_object_id,
  }).session(session);

  // If phases already exist → do nothing
  if (existingPhase) return;

  await TaskPhase.insertMany(
    [
      {
        name: "Not Started",
        index: 1,
        is_default: true,
        company_object_id,
        color: "#9CA3AF",
      },
      {
        name: "In Progress",
        index: 2,
        is_default: true,
        company_object_id,
        color: "#7C3AED",
      },
      {
        name: "Completed",
        index: 3,
        is_default: true,
        company_object_id,
        color: "#22C55E",
      },
    ],
    { session },
  );
};
