import { model } from "mongoose";
import platformInsightsSnapshotSchema, { IPlatformInsightsSnapshot } from "./platformInsightsSnapshot.schema";

const PlatformInsightsSnapshotModel = model<IPlatformInsightsSnapshot>(
  "platform_insights_snapshots",
  platformInsightsSnapshotSchema
);

export default PlatformInsightsSnapshotModel;
