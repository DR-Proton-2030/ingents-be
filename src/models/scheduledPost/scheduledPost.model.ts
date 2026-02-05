import { model } from "mongoose";
import scheduledPostSchema, { IScheduledPost } from "./scheduledPost.schema";

const ScheduledPostModel = model<IScheduledPost>("scheduled_posts", scheduledPostSchema);

export default ScheduledPostModel;
