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
exports.processBulkEmailGenerationFromExcel = void 0;
const bulkEmailFromExcel_service_1 = require("./bulkEmailFromExcel.service");
function processBulkEmailGenerationFromExcel(arg1, arg2, arg3) {
    return __awaiter(this, void 0, void 0, function* () {
        let buffer;
        let companyInfo;
        let options;
        if (arg1 instanceof Buffer) {
            buffer = arg1;
            companyInfo = arg2;
            options = arg3;
        }
        else {
            const req = arg1;
            if (!req.file || !req.file.buffer) {
                throw new Error("Excel file is required");
            }
            buffer = req.file.buffer;
            companyInfo = {
                my_company_name: req.body.my_company_name,
                my_company_website: req.body.my_company_website
            };
            const instructions = (req.body.instructions ||
                req.body.email_instructions ||
                req.body.email_topic ||
                req.body.prompt ||
                req.body.goal ||
                "").toString();
            options = {
                instructions: instructions.trim() || undefined,
                scrapeWebsites: req.body.scrape_websites !== 'false',
                maxConcurrentRequests: parseInt(req.body.max_concurrent_requests) || 5
            };
        }
        const result = yield (0, bulkEmailFromExcel_service_1.bulkEmailFromExcel)(buffer, companyInfo, options);
        const requiresInstructions = Boolean(result.requiresInstructions);
        return { result, requiresInstructions };
    });
}
exports.processBulkEmailGenerationFromExcel = processBulkEmailGenerationFromExcel;
