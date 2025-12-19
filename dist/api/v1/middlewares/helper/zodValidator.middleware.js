"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodValidator = void 0;
const zodValidator = (schema) => {
    return (req, res, next) => {
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
exports.zodValidator = zodValidator;
