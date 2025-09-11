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
