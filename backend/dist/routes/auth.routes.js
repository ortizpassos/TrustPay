"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const validation_2 = require("../utils/validation");
const router = (0, express_1.Router)();
router.post('/register', (0, validation_1.validate)(validation_2.registerSchema), auth_controller_1.authController.register);
router.post('/login', (0, validation_1.validate)(validation_2.loginSchema), auth_controller_1.authController.login);
router.post('/forgot-password', (0, validation_1.validate)(validation_2.forgotPasswordSchema), auth_controller_1.authController.forgotPassword);
router.post('/reset-password', (0, validation_1.validate)(validation_2.resetPasswordSchema), auth_controller_1.authController.resetPassword);
router.post('/verify-email', (0, validation_1.validate)(validation_2.verifyEmailSchema), auth_controller_1.authController.verifyEmail);
router.post('/refresh', (0, validation_1.validate)(validation_2.refreshTokenSchema), auth_controller_1.authController.refreshToken);
router.use(auth_1.authenticate);
router.post('/generate-merchant-keys', auth_controller_1.authController.generateMerchantKeys);
router.post('/resend-verification', auth_1.requireEmailVerification, auth_controller_1.authController.resendVerification);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map