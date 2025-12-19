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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callMailServer = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config/config");
const callMailServer = (url_1, data_1, ...args_1) => __awaiter(void 0, [url_1, data_1, ...args_1], void 0, function* (url, data, headers = {}) {
    try {
        console.log("===> Calling Mail Server API <===");
        console.log("URL:", `${config_1.MAIL_SERVER_URL}/api/email/notification/${url}`);
        const response = yield axios_1.default.post(`${config_1.MAIL_SERVER_URL}/api/email/notification/${url}`, data, { headers });
        console.log("==<Mail Server Response======>", response);
        return response.data;
    }
    catch (error) {
        console.error('Error calling POST API:', error);
        throw error;
    }
});
exports.callMailServer = callMailServer;
