const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  // Fail fast if secret is not set
  throw new Error('FATAL: JWT_SECRET environment variable is not set.');
}
if (SECRET === 'devsecret') {
  // Warn if using default
  console.warn('WARNING: Using default JWT secret. Set JWT_SECRET in production!');
}

function auth(requiredRoles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
      const decoded = jwt.verify(token, SECRET);
      req.user = decoded;
      if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

module.exports = auth;
