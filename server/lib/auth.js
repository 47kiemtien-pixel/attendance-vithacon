const crypto = require('crypto');

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return `${salt}:${derived}`;
}

function verifyPassword(password, hashedPassword) {
    if (!hashedPassword || !hashedPassword.includes(':')) return false;
    const [salt, storedHash] = hashedPassword.split(':');
    const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(storedHash, 'hex'));
}

module.exports = {
    normalizeEmail,
    hashPassword,
    verifyPassword
};
