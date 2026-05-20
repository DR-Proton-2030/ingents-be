import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: "dshnaupn3",
  api_key: "864747813873585",
  api_secret: "7HKMuo1h1ia6z3iWS1fHHcO1b1A"
});

export const uploadFileToS3Service = async (key: string, fileBuffer: Buffer, mimeType: string) => {
  return new Promise<string | null>((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: key,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          resolve(null);
        } else {
          resolve(result?.secure_url || null);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
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
