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
exports.runAgent = void 0;
const agentExecutor_service_1 = require("../../../../services/agents/executor/agentExecutor.service");
const runAgent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { goal, context = {}, options = {} } = req.body;
        const { _id: user_object_id, company_object_id } = req.user || {};
        if (!goal) {
            return res.status(400).json({ message: "Goal is required" });
        }
        if (!user_object_id || !company_object_id) {
            return res
                .status(401)
                .json({ message: "User authentication required" });
        }
        const result = yield (0, agentExecutor_service_1.runAgentExecutor)({
            goal,
            context,
            options,
            user: {
                user_object_id: String(user_object_id),
                company_object_id: String(company_object_id),
            },
        });
        return res
            .status(200)
            .json({ message: "Agent run completed", data: result });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Agent run failed", error });
    }
});
exports.runAgent = runAgent;
