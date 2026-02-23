const { v4: uuidv4 } = require('uuid'); // Or use crypto.randomUUID() if Node 16+

/**
 * Middleware to generate and attach a unique ID to every request
 */
const requestIdMiddleware = (req, res, next) => {
  // Generate ID
  const requestId = req.get('X-Request-ID') || uuidv4();
  
  // Attach to request object
  req.id = requestId;
  
  // Set header in response
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

module.exports = requestIdMiddleware;