"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ecommerce_controller_1 = require("../controllers/ecommerce.controller");
const apiAuth_1 = require("../middleware/apiAuth");
const router = (0, express_1.Router)();
router.use(apiAuth_1.merchantAuthenticate);
router.post('/pay', ecommerce_controller_1.ecommerceController.pay);
exports.default = router;
//# sourceMappingURL=ecommerce.routes.js.map