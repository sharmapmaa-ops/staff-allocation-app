const jwt = require('jsonwebtoken');

function signSessionToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function signTempToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.TEMP_TOKEN_EXPIRES_IN || '10m',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function nextCode(prefix, lastCode, width) {
  const num = lastCode ? parseInt(lastCode.replace(prefix, ''), 10) + 1 : 1;
  return prefix + String(num).padStart(width, '0');
}

module.exports = { signSessionToken, signTempToken, verifyToken, nextCode };
