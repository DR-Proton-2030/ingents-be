"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucketName = exports.s3Url = exports.s3Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const credential = {
    accessKeyId: "AKIAYRH5NH64FZ4INAAC",
    secretAccessKey: "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",
};
exports.s3Client = new client_s3_1.S3Client({
    region: "ap-south-1",
    credentials: credential,
});
exports.s3Url = "https://ingents.s3.ap-south-1.amazonaws.com";
exports.bucketName = "ingents";
