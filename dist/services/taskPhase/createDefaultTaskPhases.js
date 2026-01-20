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
exports.createDefaultTaskPhases = void 0;
const taskPhase_model_1 = __importDefault(require("../../models/taskPhase/taskPhase.model"));
const createDefaultTaskPhases = (_a) => __awaiter(void 0, [_a], void 0, function* ({ company_object_id, session, }) {
    const existingPhase = yield taskPhase_model_1.default.findOne({
        company_object_id,
    }).session(session);
    // If phases already exist → do nothing
    if (existingPhase)
        return;
    yield taskPhase_model_1.default.insertMany([
        {
            name: "Not Started",
            index: 1,
            is_default: true,
            company_object_id,
            color: "#9CA3AF",
        },
        {
            name: "In Progress",
            index: 2,
            is_default: true,
            company_object_id,
            color: "#7C3AED",
        },
        {
            name: "Completed",
            index: 3,
            is_default: true,
            company_object_id,
            color: "#22C55E",
        },
    ], { session });
});
exports.createDefaultTaskPhases = createDefaultTaskPhases;
