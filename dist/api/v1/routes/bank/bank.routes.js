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
const express_1 = __importDefault(require("express"));
const bank_service_1 = require("../../../../services/bank/bank.service");
const bankRouter = express_1.default.Router();
bankRouter.get("/create-consent", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const data = yield (0, bank_service_1.createConsent)();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message });
    }
}));
bankRouter.get("/fetch-bank/:consentId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const consentId = req.params.consentId;
        const data = yield (0, bank_service_1.getBankData)(consentId);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: ((_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data) || err.message });
    }
}));
exports.default = bankRouter;
