"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAuth = void 0;
const verifyToken_service_1 = require("../../../../services/verifyToken/verifyToken.service");
const userAuth = (req, res, next) => {
    var _a, _b;
    const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) || ((_b = req.header("Authorization")) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", ""));
    // console.log("token", token);
    // console.log("token", token);
    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const decoded = (0, verifyToken_service_1.verifyToken)(token);
        if (!decoded) {
            res.status(403).json({ message: "Invalid token" });
            return;
        }
        req.user = decoded; // Attach user data to request
        next();
    }
    catch (error) {
        res.status(403).json({ message: "Invalid token" });
        return;
    }
};
exports.userAuth = userAuth;
