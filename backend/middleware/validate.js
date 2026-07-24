const { validationResult } = require('express-validator');

// Runs after a set of express-validator checks; returns the first error as a
// clean 400 so the client gets a single, readable message.
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};
