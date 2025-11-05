"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transaction_controller_1 = require("../controllers/transaction.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/recent', auth_1.authenticate, transaction_controller_1.getRecentTransactions);
exports.default = router;
//# sourceMappingURL=transaction.routes.js.map