const logger = require("../config/logger");

function errorHandler(err, req, res, next) {
  logger.error("Unhandled error", {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  if (res.headersSent) return next(err);

  res.status(500).json({
    ok: false,
    message: process.env.NODE_ENV === "production" ? "Terjadi kesalahan internal." : err.message
  });
}

module.exports = errorHandler;
