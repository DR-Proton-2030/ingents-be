"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const subscription_schema_1 = __importDefault(require("./subscription.schema"));
const SubscriptionModel = (0, mongoose_1.model)("subscriptions", subscription_schema_1.default);
exports.default = SubscriptionModel;
