import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const zodValidator = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.log("===== Zod validation errors =====");
      console.log(result.error);
      return res.status(400).json({
        success: false,
        errors: result.error,
      });
    }
    next();
  };
};
