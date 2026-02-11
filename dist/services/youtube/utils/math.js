"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.percentage = void 0;
const percentage = (part, total) => total > 0 ? (part / total) * 100 : 0;
exports.percentage = percentage;
