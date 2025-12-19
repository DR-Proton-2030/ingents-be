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
exports.fileUploadHelper = void 0;
const uploadFile_1 = require("../../../../services/uploadFile/uploadFile");
const fileUploadHelper = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files;
        if (!files || Object.keys(files).length === 0) {
            next();
            return;
        }
        // Loop over each field name
        for (const fieldName of Object.keys(files)) {
            const fileArray = files[fieldName];
            if (!fileArray || fileArray.length === 0)
                continue;
            // Support multiple files per field
            const urls = [];
            for (const file of fileArray) {
                const fileKey = `${fieldName}/${Date.now()}_${file.originalname}`;
                const fileUrl = yield (0, uploadFile_1.uploadFileToS3Service)(fileKey, file.buffer, file.mimetype);
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
    }
    catch (error) {
        return res.status(500).json({ message: "Something went wrong", error });
    }
});
exports.fileUploadHelper = fileUploadHelper;
