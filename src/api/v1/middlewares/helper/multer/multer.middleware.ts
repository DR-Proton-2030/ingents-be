import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({ 
  storage: storage,
  limits: {
    fieldSize: 1000 * 1024 * 1024 // 1000MB
  }
});
