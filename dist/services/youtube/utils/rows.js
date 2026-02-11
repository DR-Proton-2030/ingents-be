"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstRow = exports.safeRows = void 0;
const safeRows = (resp) => { var _a; return ((_a = resp === null || resp === void 0 ? void 0 : resp.data) === null || _a === void 0 ? void 0 : _a.rows) || []; };
exports.safeRows = safeRows;
const firstRow = (resp) => (0, exports.safeRows)(resp)[0] || [];
exports.firstRow = firstRow;
