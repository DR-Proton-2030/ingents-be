import { model } from "mongoose";
import postedContentSchema, { IPostedContent } from "./postedContent.schema";

const PostedContentModel = model<IPostedContent>("posted_contents", postedContentSchema);

export default PostedContentModel;
