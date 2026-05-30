const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const ENV_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const ENV_IV = process.env.ENCRYPTION_IV || '0123456789abcdef';

// Use first 32 bytes of key
const key = Buffer.alloc(32);
Buffer.from(ENV_KEY, 'utf8').copy(key, 0, 0, 32);

// Use first 16 bytes of IV
const iv = Buffer.alloc(16);
Buffer.from(ENV_IV, 'utf8').copy(iv, 0, 0, 16);

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decrypt = (encrypted) => {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = { encrypt, decrypt };