import { model } from "mongoose";
import contentMetricsSnapshotSchema, { IContentMetricsSnapshot } from "./contentMetricsSnapshot.schema";

const ContentMetricsSnapshotModel = model<IContentMetricsSnapshot>(
  "content_metrics_snapshots",
  contentMetricsSnapshotSchema
);

export default ContentMetricsSnapshotModel;
