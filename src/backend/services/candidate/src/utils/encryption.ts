/**
 * @fileoverview Encryption utility module for secure data handling in the candidate service
 * @version 1.0.0
 * @package RefactorTrack/CandidateService
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'; // v1.0.0
import * as bcrypt from 'bcrypt'; // v5.1.1
import { KMS } from 'aws-sdk'; // v2.1450.0
import { BaseEntity } from '../../../shared/types/common.types';
import { promisify } from 'util';

// Constants
const ENCRYPTION_KEY_ID = process.env.AWS_KMS_KEY_ID;
const SALT_ROUNDS = 12;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const KEY_ROTATION_DAYS = 90;
const AUTH_TAG_LENGTH = 16;

// AWS KMS client initialization
const kms = new KMS({
  apiVersion: '2014-11-01',
  region: process.env.AWS_REGION
});

// Error types
class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Interface for encrypted data structure
 */
interface EncryptedData {
  iv: Buffer;
  keyVersion: string;
  content: Buffer;
  authTag: Buffer;
}

/**
 * Validates input data for encryption
 * @param data - Data to validate
 */
function validateEncryptionInput(data: string): void {
  if (!data || typeof data !== 'string') {
    throw new EncryptionError('Invalid input data for encryption');
  }
  if (data.length > 1048576) { // 1MB limit
    throw new EncryptionError('Input data exceeds maximum allowed size');
  }
}

/**
 * Retrieves encryption key from AWS KMS with version tracking
 * @param keyId - KMS key ID
 * @returns Promise with key data and version
 */
async function getEncryptionKey(keyId: string = ENCRYPTION_KEY_ID): Promise<{ key: Buffer; version: string }> {
  try {
    const { Plaintext, KeyId } = await kms.generateDataKey({
      KeyId: keyId,
      KeySpec: 'AES_256'
    }).promise();

    if (!Plaintext) {
      throw new EncryptionError('Failed to generate data key');
    }

    return {
      key: Buffer.from(Plaintext),
      version: KeyId!.split('/').pop()!
    };
  } catch (error) {
    throw new EncryptionError(`Key generation failed: ${(error as Error).message}`);
  }
}

/**
 * Encrypts sensitive field data using AES-256-GCM
 * @param data - Data to encrypt
 * @param keyId - Optional KMS key ID
 * @returns Promise with encrypted data string
 */
export async function encryptField(data: string, keyId?: string): Promise<string> {
  validateEncryptionInput(data);

  try {
    // Generate IV
    const iv = randomBytes(IV_LENGTH);
    
    // Get encryption key
    const { key, version } = await getEncryptionKey(keyId);
    
    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Format encrypted data
    const encryptedData: EncryptedData = {
      iv,
      keyVersion: version,
      content: encrypted,
      authTag
    };

    // Return as base64 string
    return Buffer.from(JSON.stringify(encryptedData)).toString('base64');
  } catch (error) {
    throw new EncryptionError(`Encryption failed: ${(error as Error).message}`);
  }
}

/**
 * Decrypts encrypted field data using AES-256-GCM
 * @param encryptedData - Encrypted data string
 * @param keyId - Optional KMS key ID
 * @returns Promise with decrypted data string
 */
export async function decryptField(encryptedData: string, keyId?: string): Promise<string> {
  try {
    // Parse encrypted data
    const parsed: EncryptedData = JSON.parse(
      Buffer.from(encryptedData, 'base64').toString()
    );

    // Get decryption key
    const { key } = await getEncryptionKey(keyId);

    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', key, parsed.iv);
    decipher.setAuthTag(parsed.authTag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(parsed.content),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new EncryptionError(`Decryption failed: ${(error as Error).message}`);
  }
}

/**
 * Validates password strength
 * @param password - Password to validate
 */
function validatePasswordStrength(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new EncryptionError('Invalid password input');
  }

  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (
    password.length < minLength ||
    !hasUpperCase ||
    !hasLowerCase ||
    !hasNumbers ||
    !hasSpecialChars
  ) {
    throw new EncryptionError('Password does not meet strength requirements');
  }
}

/**
 * Hashes password using bcrypt with adaptive salt rounds
 * @param password - Password to hash
 * @returns Promise with hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);

    // Verify hash integrity
    const isValid = await bcrypt.compare(password, hash);
    if (!isValid) {
      throw new EncryptionError('Hash verification failed');
    }

    return hash;
  } catch (error) {
    throw new EncryptionError(`Password hashing failed: ${(error as Error).message}`);
  }
}

/**
 * Compares plain text password with hashed password using timing-safe comparison
 * @param password - Plain text password
 * @param hashedPassword - Hashed password
 * @returns Promise with boolean indicating match
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    // Use constant-time comparison
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new EncryptionError(`Password comparison failed: ${(error as Error).message}`);
  }
}

/**
 * Checks if encryption key needs rotation
 * @param keyVersion - Current key version
 * @returns Promise with boolean indicating if rotation is needed
 */
async function checkKeyRotation(keyVersion: string): Promise<boolean> {
  try {
    const keyInfo = await kms.describeKey({
      KeyId: ENCRYPTION_KEY_ID
    }).promise();

    const creationDate = keyInfo.KeyMetadata?.CreationDate;
    if (!creationDate) {
      return false;
    }

    const daysSinceCreation = Math.floor(
      (Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceCreation >= KEY_ROTATION_DAYS;
  } catch (error) {
    console.error('Key rotation check failed:', error);
    return false;
  }
}