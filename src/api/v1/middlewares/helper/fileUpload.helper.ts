import { NextFunction, Request, Response } from "express";
import { uploadFileToS3Service } from "../../../../services/uploadFile/uploadFile";

export const fileUploadHelper = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const files = req.files as
      | Record<string, Express.Multer.File[]>
      | undefined;

    if (!files || Object.keys(files).length === 0) {
      next();
      return;
    }

    // Loop over each field name
    for (const fieldName of Object.keys(files)) {
      const fileArray = files[fieldName];
      if (!fileArray || fileArray.length === 0) continue;

      // Support multiple files per field
      const urls: string[] = [];
      for (const file of fileArray) {
        const fileKey = `${fieldName}/${Date.now()}_${file.originalname}`;
        const fileUrl = await uploadFileToS3Service(
          fileKey,
          file.buffer,
          file.mimetype
        );
        if (!fileUrl) {
          return res.status(500).json({
            message: "Failed to upload file",
            error: `Failed to upload file for field: ${fieldName}`,
          });
        }
        urls.push(fileUrl);
      }

      // If single file → store string, if multiple → store array
      req.body[fieldName] = urls.length === 1 ? urls[0] : urls;
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong", error });
  }
};
