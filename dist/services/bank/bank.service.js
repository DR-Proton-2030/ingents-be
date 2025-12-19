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
exports.getBankData = exports.createConsent = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config/config");
const createConsent = () => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.post("https://fiu-sandbox.setu.co/v2/consents", {
        consentDuration: {
            unit: "MONTH",
            value: "24",
        },
        dataRange: {
            from: "2025-10-01T00:00:00Z",
            to: "2025-10-12T00:00:00Z",
        },
        fiTypes: ["DEPOSIT"],
        vua: "9999999999@onemoney",
    }, {
        headers: {
            "x-client-id": config_1.SETU_CLIENT_ID,
            "x-client-secret": config_1.SETU_CLIENT_SECRET,
            "x-product-instance-id": "88665f38-c9d6-4b29-9b93-24fa2d4d9386",
        },
    });
    return response.data;
});
exports.createConsent = createConsent;
const getBankData = (consentId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.get(`https://fiu-sandbox.setu.co/v2/accounts/${consentId}`, {
        headers: {
            "x-client-id": config_1.SETU_CLIENT_ID,
            "x-client-secret": config_1.SETU_CLIENT_SECRET,
            "x-product-instance-id": "88665f38-c9d6-4b29-9b93-24fa2d4d9386",
        },
    });
    return response.data;
});
exports.getBankData = getBankData;
