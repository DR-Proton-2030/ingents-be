import { model } from "mongoose";
import { ITag } from "../../types/interface/tag.interface";
import { tagSchema } from "./tag.schema";

const Tag = model<ITag>("Tags", tagSchema);

export default Tag;
