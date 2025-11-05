"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wallet_controller_1 = require("../controllers/wallet.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/summary', wallet_controller_1.walletController.getWalletSummary);
exports.default = router;
//# sourceMappingURL=wallet.routes.js.map