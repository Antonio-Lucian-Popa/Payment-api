const crypto = require('crypto');

function key() {
  const secret = process.env.PAYMENT_STATE_SECRET || process.env.API_KEY;
  if (!secret || (process.env.NODE_ENV === 'production' && secret.length < 32)) {
    throw new Error('PAYMENT_STATE_SECRET trebuie configurat cu minimum 32 de caractere.');
  }
  return crypto.createHash('sha256').update(secret || 'local-payment-state-secret').digest();
}

function seal(value, ttlSeconds = 48 * 60 * 60) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const payload = Buffer.from(JSON.stringify({ ...value, exp: Date.now() + ttlSeconds * 1000 }));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

function open(token) {
  try {
    const value = Buffer.from(token, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), value.subarray(0, 12));
    decipher.setAuthTag(value.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([
      decipher.update(value.subarray(28)),
      decipher.final(),
    ]).toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) throw new Error('expired');
    return payload;
  } catch {
    throw Object.assign(new Error('Stare de plată invalidă sau expirată.'), { statusCode: 400 });
  }
}

module.exports = { seal, open };
