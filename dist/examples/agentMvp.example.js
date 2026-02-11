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
const agentExecutor_service_1 = require("../services/agents/executor/agentExecutor.service");
const runExample = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, agentExecutor_service_1.runAgentExecutor)({
        goal: "Draft an email and schedule a social post for the new product launch",
        context: {
            email_to: "demo@ingents.ai",
            platform: "x",
            post_content: "Launching our new product today — stay tuned!",
        },
        options: {
            dryRun: true,
        },
        user: {
            user_object_id: "000000000000000000000001",
            company_object_id: "000000000000000000000002",
        },
    });
    console.log("Agent MVP result:\n", JSON.stringify(result, null, 2));
});
runExample().catch((error) => {
    console.error("Agent MVP example failed:", error);
});
