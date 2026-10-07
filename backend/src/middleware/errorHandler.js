export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);

  let status = err.status || 500;
  if (err.code === 'LIMIT_FILE_SIZE') status = 413;
  if (typeof err.message === 'string' && err.message.startsWith('Only JPEG')) status = 415;

  res.status(status).json({
    error: err.publicMessage || err.message || 'Something went wrong on the server.',
  });
}
