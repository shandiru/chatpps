const crypto = require('crypto');

const ALGORITHM  = 'aes-256-gcm';
const IV_LENGTH  = 12;   // 96-bit IV (recommended for GCM)
const TAG_LENGTH = 16;   // 128-bit auth tag

/**
 * Derives a fixed 32-byte key from MESSAGE_SECRET via HMAC-SHA256.
 * Throws at startup if the secret is absent or too weak.
 */
function getDerivedKey() {
  const secret = process.env.MESSAGE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      '[Encryption] MESSAGE_SECRET env var missing or too short (need >= 32 chars).\n' +
      'Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return crypto.createHmac('sha256', secret)
               .update('chatapp-msg-key-v1')
               .digest(); // 32 bytes
}

/**
 * encrypt(plaintext) → "<ivHex>:<ciphertextBase64>:<tagHex>"
 * Each message gets a unique random IV — same plaintext → different ciphertext every time.
 */
function encrypt(plaintext) {
  const key = getDerivedKey();
  const iv  = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted.toString('base64')}:${tag.toString('hex')}`;
}

/**
 * decrypt(stored) → original plaintext
 * Returns '[decryption error]' if ciphertext was tampered or key is wrong.
 */
function decrypt(stored) {
  try {
    const parts = stored.split(':');
    if (parts.length !== 3) return '[decryption error]';
    const [ivHex, cipherB64, tagHex] = parts;

    const key        = getDerivedKey();
    const iv         = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(cipherB64, 'base64');
    const tag        = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return '[decryption error]';
  }
}

module.exports = { encrypt, decrypt };
