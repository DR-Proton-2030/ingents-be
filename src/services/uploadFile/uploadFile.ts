import { PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types"; // Import mime-types
import { bucketName, s3Client, s3Url } from "../../config/aws.config";

export const uploadFileToS3Service = async (key: string, fileBuffer: Buffer, mimeType: string) => {
	// Determine correct file extension from MIME type
	const ext = mime.extension(mimeType) || "bin"; // Fallback to .bin if unknown
	const keyName = `${key}/${Date.now()}.${ext}`; // Correctly name the file

	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: keyName,
		Body: fileBuffer,
		ACL: "public-read",
		ContentType: mimeType, // Ensure correct MIME type is set
	});

	try {
		const response = await s3Client.send(command);
		console.log(response);
		if (response) {
			return `${s3Url}/${keyName}`; // Return correct S3 URL
		}
		return null;
	} catch (err) {
		console.error(err);
	}
};

export const uploadBase64ToS3 = async (
	base64: string,
	key: string,
	mimeType: string = "image/png"
) => {
	const match = base64.match(/^data:(.+);base64,(.+)$/);
	const cleanedBase64 = match ? match[2] : base64;
	const resolvedMimeType = match?.[1] ?? mimeType;
	const buffer = Buffer.from(cleanedBase64, "base64");

	return uploadFileToS3Service(key, buffer, resolvedMimeType);
};
