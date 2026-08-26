#!/usr/bin/env node
import { scryptSync } from 'node:crypto';

const PASSWORD = process.argv[2];
const CUSTOM_SALT = process.argv[3];
const DEFAULT_SALT = 'change-me-to-a-random-salt';

if (!PASSWORD) {
  console.error('Usage: npm run generate:auth-hash -- "your-password" [salt]');
  console.error('Example: npm run generate:auth-hash -- "MyStrongPassword!123"');
  process.exit(1);
}

const saltText = CUSTOM_SALT ?? DEFAULT_SALT;
const salt = Buffer.from(saltText, 'utf8');
const cost = 16384;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;

const derivedKey = scryptSync(PASSWORD, salt, keyLength, {
  N: cost,
  r: blockSize,
  p: parallelization,
});

const hash = `scrypt$${cost}$${blockSize}$${parallelization}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;

console.log('Password hash:');
console.log(hash);
console.log('');
console.log('Env value:');
console.log(`AUTH_PASSWORD_HASH="${hash}"`);
