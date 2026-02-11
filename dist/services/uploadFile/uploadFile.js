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
exports.uploadBase64ToS3 = exports.uploadFileToS3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const mime_types_1 = __importDefault(require("mime-types")); // Import mime-types
const aws_config_1 = require("../../config/aws.config");
const uploadFileToS3Service = (key, fileBuffer, mimeType) => __awaiter(void 0, void 0, void 0, function* () {
    // Determine correct file extension from MIME type
    const ext = mime_types_1.default.extension(mimeType) || "bin"; // Fallback to .bin if unknown
    const keyName = `${key}/${Date.now()}.${ext}`; // Correctly name the file
    const command = new client_s3_1.PutObjectCommand({
        Bucket: aws_config_1.bucketName,
        Key: keyName,
        Body: fileBuffer,
        ACL: "public-read",
        ContentType: mimeType, // Ensure correct MIME type is set
    });
    try {
        const response = yield aws_config_1.s3Client.send(command);
        console.log(response);
        if (response) {
            return `${aws_config_1.s3Url}/${keyName}`; // Return correct S3 URL
        }
        return null;
    }
    catch (err) {
        console.error(err);
    }
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
