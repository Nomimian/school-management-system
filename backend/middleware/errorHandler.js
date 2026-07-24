const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    return res.status(400).json({ success: false, message: error.message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message: error.message });
  }

  // Mongoose cast error (invalid ID)
  if (err.name === 'CastError') {
    error.message = `Resource not found.`;
    return res.status(404).json({ success: false, message: error.message });
  }

  // CORS rejection from server.js
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origin not allowed.' });
  }

  const status = err.statusCode || 500;
  console.error('Server Error:', err);
  // Never leak internal error details on a 500 in production.
  const message = (status >= 500 && process.env.NODE_ENV === 'production')
    ? 'Something went wrong. Please try again.'
    : (error.message || 'Server Error');
  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
