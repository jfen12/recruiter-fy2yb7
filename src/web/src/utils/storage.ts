// crypto-js version ^4.1.1
import CryptoJS from 'crypto-js';
import { AUTH_CONSTANTS } from '../config/constants';

// Types
type StorageType = 'localStorage' | 'sessionStorage';

interface StorageData<T> {
  value: T;
  timestamp: number;
  encrypted: boolean;
}

// Constants
const STORAGE_ENCRYPTION_KEY = process.env.STORAGE_ENCRYPTION_KEY || 'default-secure-key';
const STORAGE_QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB limit
const SESSION_TIMEOUT = AUTH_CONSTANTS.SECURITY_POLICIES.SESSION_TIMEOUT * 1000; // Convert to milliseconds

// Error messages
const ERROR_MESSAGES = {
  QUOTA_EXCEEDED: 'Storage quota exceeded',
  INVALID_DATA: 'Invalid storage data format',
  EXPIRED_SESSION: 'Session has expired',
  STORAGE_UNAVAILABLE: 'Storage is not available',
};

/**
 * Encrypts data using AES-256 encryption
 * @param data - Data to encrypt
 * @returns Encrypted string
 */
const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, STORAGE_ENCRYPTION_KEY).toString();
};

/**
 * Decrypts AES-256 encrypted data
 * @param encryptedData - Encrypted data string
 * @returns Decrypted string
 */
const decryptData = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, STORAGE_ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Checks if storage is available
 * @param type - Storage type to check
 * @returns boolean indicating if storage is available
 */
const isStorageAvailable = (type: StorageType): boolean => {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Checks current storage usage against quota
 * @param type - Storage type to check
 * @param additionalBytes - Additional bytes to be added
 * @throws Error if quota would be exceeded
 */
const checkQuota = (type: StorageType, additionalBytes: number): void => {
  const storage = window[type];
  let totalSize = additionalBytes;
  
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      totalSize += (storage.getItem(key) || '').length;
    }
  }

  if (totalSize > STORAGE_QUOTA_LIMIT) {
    throw new Error(ERROR_MESSAGES.QUOTA_EXCEEDED);
  }
};

/**
 * Stores data in localStorage with optional encryption
 * @param key - Storage key
 * @param value - Value to store
 * @param encrypt - Whether to encrypt the data
 */
export const setLocalStorage = <T>(key: string, value: T, encrypt = false): void => {
  if (!isStorageAvailable('localStorage')) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  const storageData: StorageData<T> = {
    value,
    timestamp: Date.now(),
    encrypted: encrypt,
  };

  const dataString = JSON.stringify(storageData);
  const finalData = encrypt ? encryptData(dataString) : dataString;

  checkQuota('localStorage', finalData.length);
  localStorage.setItem(key, finalData);
};

/**
 * Retrieves and optionally decrypts data from localStorage
 * @param key - Storage key
 * @param encrypted - Whether the data is encrypted
 * @returns Retrieved data or null if not found
 */
export const getLocalStorage = <T>(key: string, encrypted = false): T | null => {
  if (!isStorageAvailable('localStorage')) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  const data = localStorage.getItem(key);
  if (!data) return null;

  try {
    const parsedData: StorageData<T> = JSON.parse(
      encrypted ? decryptData(data) : data
    );
    return parsedData.value;
  } catch (e) {
    return null;
  }
};

/**
 * Stores data in sessionStorage with encryption and timeout
 * @param key - Storage key
 * @param value - Value to store
 * @param encrypt - Whether to encrypt the data
 */
export const setSessionStorage = <T>(key: string, value: T, encrypt = false): void => {
  if (!isStorageAvailable('sessionStorage')) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  const storageData: StorageData<T> = {
    value,
    timestamp: Date.now(),
    encrypted: encrypt,
  };

  const dataString = JSON.stringify(storageData);
  const finalData = encrypt ? encryptData(dataString) : dataString;

  checkQuota('sessionStorage', finalData.length);
  sessionStorage.setItem(key, finalData);
};

/**
 * Retrieves data from sessionStorage with timeout validation
 * @param key - Storage key
 * @param encrypted - Whether the data is encrypted
 * @returns Retrieved data or null if not found/expired
 */
export const getSessionStorage = <T>(key: string, encrypted = false): T | null => {
  if (!isStorageAvailable('sessionStorage')) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  const data = sessionStorage.getItem(key);
  if (!data) return null;

  try {
    const parsedData: StorageData<T> = JSON.parse(
      encrypted ? decryptData(data) : data
    );

    // Check session timeout
    if (Date.now() - parsedData.timestamp > SESSION_TIMEOUT) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsedData.value;
  } catch (e) {
    return null;
  }
};

/**
 * Removes an item from specified storage
 * @param key - Storage key
 * @param storage - Storage type
 */
export const removeItem = (key: string, storage: StorageType): void => {
  if (!isStorageAvailable(storage)) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  window[storage].removeItem(key);
};

/**
 * Clears all data from specified storage
 * @param storage - Storage type
 */
export const clearStorage = (storage: StorageType): void => {
  if (!isStorageAvailable(storage)) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  window[storage].clear();
};

// Event listener for storage changes in other tabs
window.addEventListener('storage', (e: StorageEvent) => {
  // Handle storage changes from other tabs if needed
  if (e.key && e.newValue !== null) {
    // Implement any cross-tab synchronization logic here
  }
});