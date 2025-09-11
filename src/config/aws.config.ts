import { S3Client } from "@aws-sdk/client-s3";

const credential = {
	accessKeyId: "AKIAYRH5NH64FZ4INAAC",
	secretAccessKey: "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",
};

export const s3Client = new S3Client({
	region: "ap-south-1",
	credentials: credential,
});

export const s3Url = "https://bidready.s3.ap-south-1.amazonaws.com";

export const bucketName = "bidready";
