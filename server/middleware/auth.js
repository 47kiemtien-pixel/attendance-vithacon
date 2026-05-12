const jwt = require('jsonwebtoken');

function createAuthMiddleware(options = {}) {
    const authRequired = options.authRequired ?? (String(process.env.AUTH_REQUIRED || '').toLowerCase() === 'true');
    const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || '';

    function readBearerToken(req) {
        const header = req.headers.authorization || '';
        if (!header.startsWith('Bearer ')) return null;
        return header.slice('Bearer '.length).trim();
    }

    function attachUserIfPresent(req, res, next) {
        const token = readBearerToken(req);
        if (!token || !jwtSecret) {
            req.auth = null;
            next();
            return;
        }

        try {
            req.auth = jwt.verify(token, jwtSecret);
        } catch (error) {
            req.auth = null;
        }
        next();
    }

    function requireAuth(req, res, next) {
        if (!authRequired) {
            next();
            return;
        }

        const token = readBearerToken(req);
        if (!token || !jwtSecret) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        try {
            req.auth = jwt.verify(token, jwtSecret);
            next();
        } catch (error) {
            res.status(401).json({ message: 'Invalid token' });
        }
    }

    return { attachUserIfPresent, requireAuth, authRequired };
}

function signAccessToken(user, jwtSecret, expiresIn = '12h') {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            role: user.role
        },
        jwtSecret,
        { expiresIn }
    );
}

module.exports = { createAuthMiddleware, signAccessToken };
