"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const tag_schema_1 = require("./tag.schema");
const Tag = (0, mongoose_1.model)("Tags", tag_schema_1.tagSchema);
exports.default = Tag;
