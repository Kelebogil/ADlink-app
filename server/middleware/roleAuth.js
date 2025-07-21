const { authenticateToken } = require('./auth');

// Middleware to check if user has required role
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    // First authenticate the token
    authenticateToken(req, res, (error) => {
      if (error) return; // Error already handled by authenticateToken
      
      // Check if user has the required role
      if (req.user.role !== requiredRole && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
          error: 'Access denied. Insufficient permissions.' 
        });
      }
      
      next();
    });
  };
};

// Middleware specifically for super admin access
const requireSuperAdmin = requireRole('superadmin');

// Middleware for admin or super admin access
const requireAdmin = (req, res, next) => {
  authenticateToken(req, res, (error) => {
    if (error) return;
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.' 
      });
    }
    
    next();
  });
};

module.exports = {
  requireRole,
  requireSuperAdmin,
  requireAdmin
};
