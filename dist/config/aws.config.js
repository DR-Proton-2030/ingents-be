"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucketName = exports.s3Url = exports.s3Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const credential = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
};
exports.s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: credential,
});
exports.s3Url = process.env.AWS_S3_URL || "";
exports.bucketName = process.env.AWS_S3_BUCKET_NAME || "";
