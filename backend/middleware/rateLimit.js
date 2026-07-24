const rateLimit = require('express-rate-limit');

// Brute-force protection for login endpoints. Only FAILED attempts count
// (skipSuccessfulRequests), so a legitimate user logging in repeatedly is never
// blocked — but repeated wrong-password guesses from one IP get throttled.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                    // 10 failed attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Please try again in a few minutes.' },
});

// Password-reset requests. Counts ALL requests (forgot-password always returns
// success, so skipSuccessfulRequests would never trigger) to stop email-bombing.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests. Please try again later.' },
});

module.exports = { authLimiter, passwordResetLimiter };
