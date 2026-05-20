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
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBase64ToS3 = exports.uploadFileToS3Service = void 0;
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: "dshnaupn3",
    api_key: "864747813873585",
    api_secret: "7HKMuo1h1ia6z3iWS1fHHcO1b1A"
});
const uploadFileToS3Service = (key, fileBuffer, mimeType) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder: key,
            resource_type: "auto",
        }, (error, result) => {
            if (error) {
                console.error("Cloudinary upload error:", error);
                resolve(null);
            }
            else {
                resolve((result === null || result === void 0 ? void 0 : result.secure_url) || null);
            }
        });
        uploadStream.end(fileBuffer);
    });
});
exports.uploadFileToS3Service = uploadFileToS3Service;
const uploadBase64ToS3 = (base64_1, key_1, ...args_1) => __awaiter(void 0, [base64_1, key_1, ...args_1], void 0, function* (base64, key, mimeType = "image/png") {
    var _a;
    const match = base64.match(/^data:(.+);base64,(.+)$/);
    const cleanedBase64 = match ? match[2] : base64;
    const resolvedMimeType = (_a = match === null || match === void 0 ? void 0 : match[1]) !== null && _a !== void 0 ? _a : mimeType;
    const buffer = Buffer.from(cleanedBase64, "base64");
    return (0, exports.uploadFileToS3Service)(key, buffer, resolvedMimeType);
});
exports.uploadBase64ToS3 = uploadBase64ToS3;
