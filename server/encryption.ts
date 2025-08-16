import { createCipheriv, createDecipheriv, randomBytes, scrypt, scryptSync, timingSafeEqual } from 'crypto';

// Define ENCRYPTION_KEY for file encryption
const ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY || 'tripmate-file-encryption-key-change-in-production';
import { promisify } from 'util';

const asyncScrypt = promisify(scrypt);

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is 12 bytes, but we'll use 16 for compatibility
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from password and salt using scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await asyncScrypt(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Get encryption key from environment or generate a default one
 * In production, this should come from a secure environment variable
 */
function getEncryptionPassword(): string {
  return process.env.CHAT_ENCRYPTION_KEY || 'tripmate-default-encryption-key-change-in-production';
}

/**
 * Encrypt a message
 * Returns base64 encoded string containing: salt + iv + tag + encrypted_data
 */
export async function encryptMessage(message: string): Promise<string> {
  try {
    const password = getEncryptionPassword();
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    // Derive key from password and salt
    const key = await deriveKey(password, salt);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the message
    let encrypted = cipher.update(message, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get the authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted data
    const result = Buffer.concat([salt, iv, tag, encrypted]);
    
    // Return as base64 string
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt a message
 * Expects base64 encoded string containing: salt + iv + tag + encrypted_data
 */
export async function decryptMessage(encryptedData: string): Promise<string> {
  try {
    const password = getEncryptionPassword();
    
    // Decode from base64
    const buffer = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key from password and salt
    const key = await deriveKey(password, salt);
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);
    
    // Decrypt the message
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Encrypt sensitive message content while preserving metadata
 */
export async function encryptChatMessage(message: any): Promise<any> {
  try {
    // Only encrypt the actual message content, not metadata
    if (message.message && typeof message.message === 'string') {
      const encryptedMessage = await encryptMessage(message.message);
      return {
        ...message,
        message: encryptedMessage,
        isEncrypted: true
      };
    }
    return message;
  } catch (error) {
    console.error('Chat message encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt sensitive message content while preserving metadata
 */
export async function decryptChatMessage(message: any): Promise<any> {
  try {
    // Only decrypt if the message is marked as encrypted
    if (message.isEncrypted && message.message && typeof message.message === 'string') {
      const decryptedMessage = await decryptMessage(message.message);
      return {
        ...message,
        message: decryptedMessage,
        isEncrypted: false
      };
    }
    return message;
  } catch (error) {
    console.error('Chat message decryption error:', error);
    // Return original message if decryption fails to avoid breaking the app
    return {
      ...message,
      message: '[Message could not be decrypted]',
      isEncrypted: false
    };
  }
}

/**
 * Batch decrypt multiple chat messages
 */
export async function decryptChatMessages(messages: any[]): Promise<any[]> {
  try {
    const decryptedMessages = await Promise.all(
      messages.map(message => decryptChatMessage(message))
    );
    return decryptedMessages;
  } catch (error) {
    console.error('Batch decryption error:', error);
    // Return original messages if batch decryption fails
    return messages;
  }
}



/**
 * Encrypt sensitive packing item data
 */
export async function encryptPackingItem(item: any): Promise<any> {
  try {
    if (item.name && typeof item.name === 'string') {
      const encryptedName = await encryptMessage(item.name);
      return {
        ...item,
        name: encryptedName,
        isEncrypted: true
      };
    }
    return item;
  } catch (error) {
    console.error('Packing item encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt packing item data
 */
export async function decryptPackingItem(item: any): Promise<any> {
  try {
    if (item.isEncrypted && item.name && typeof item.name === 'string') {
      const decryptedName = await decryptMessage(item.name);
      return {
        ...item,
        name: decryptedName,
        isEncrypted: false
      };
    }
    return item;
  } catch (error) {
    console.error('Packing item decryption error:', error);
    return {
      ...item,
      name: '[Item name could not be decrypted]',
      isEncrypted: false
    };
  }
}

/**
 * Encrypt sensitive expense data
 */
export async function encryptExpense(expense: any): Promise<any> {
  try {
    let encryptedExpense = { ...expense, isEncrypted: true };
    
    // Encrypt description field
    if (expense.description && typeof expense.description === 'string') {
      encryptedExpense.description = await encryptMessage(expense.description);
    }
    
    return encryptedExpense;
  } catch (error) {
    console.error('Expense encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt expense data
 */
export async function decryptExpense(expense: any): Promise<any> {
  try {
    if (expense.isEncrypted && expense.description && typeof expense.description === 'string') {
      const decryptedDescription = await decryptMessage(expense.description);
      return {
        ...expense,
        description: decryptedDescription,
        isEncrypted: false
      };
    }
    return expense;
  } catch (error) {
    console.error('Expense decryption error:', error);
    return {
      ...expense,
      description: '[Expense description could not be decrypted]',
      isEncrypted: false
    };
  }
}

/**
 * Encrypt sensitive trip data
 */
export async function encryptTrip(trip: any): Promise<any> {
  try {
    let encryptedTrip = { ...trip, isEncrypted: true };
    
    // Encrypt sensitive trip information
    if (trip.name && typeof trip.name === 'string') {
      encryptedTrip.name = await encryptMessage(trip.name);
    }
    
    if (trip.description && typeof trip.description === 'string') {
      encryptedTrip.description = await encryptMessage(trip.description);
    }
    
    if (trip.location && typeof trip.location === 'string') {
      encryptedTrip.location = await encryptMessage(trip.location);
    }
    
    // Encrypt date fields - convert to ISO string before encryption
    if (trip.startDate) {
      const dateStr = trip.startDate instanceof Date ? trip.startDate.toISOString() : String(trip.startDate);
      encryptedTrip.startDate = await encryptMessage(dateStr);
    }
    
    if (trip.endDate) {
      const dateStr = trip.endDate instanceof Date ? trip.endDate.toISOString() : String(trip.endDate);
      encryptedTrip.endDate = await encryptMessage(dateStr);
    }
    
    // Encrypt invite code
    if (trip.inviteCode && typeof trip.inviteCode === 'string') {
      encryptedTrip.inviteCode = await encryptMessage(trip.inviteCode);
    }
    
    return encryptedTrip;
  } catch (error) {
    console.error('Trip encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt trip data
 */
export async function decryptTrip(trip: any): Promise<any> {
  try {
    if (!trip.isEncrypted) return trip;
    
    let decryptedTrip = { ...trip, isEncrypted: false };
    
    // Decrypt trip information - only decrypt if the value looks like base64 encrypted data
    if (trip.name && typeof trip.name === 'string') {
      // Check if name looks like encrypted base64 data (long string with special chars)
      if (trip.name.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.name)) {
        decryptedTrip.name = await decryptMessage(trip.name);
      } else {
        // Name is already decrypted or plain text
        decryptedTrip.name = trip.name;
      }
    }
    
    if (trip.description && typeof trip.description === 'string') {
      if (trip.description.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.description)) {
        decryptedTrip.description = await decryptMessage(trip.description);
      } else {
        decryptedTrip.description = trip.description;
      }
    }
    
    if (trip.location && typeof trip.location === 'string') {
      if (trip.location.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.location)) {
        decryptedTrip.location = await decryptMessage(trip.location);
      } else {
        decryptedTrip.location = trip.location;
      }
    }
    
    // Decrypt date fields - handle both encrypted strings and plain date strings
    if (trip.startDate && typeof trip.startDate === 'string') {
      if (trip.startDate.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.startDate)) {
        // This looks like an encrypted date
        const decryptedDateStr = await decryptMessage(trip.startDate);
        // Convert ISO string back to YYYY-MM-DD format for consistent frontend handling
        const date = new Date(decryptedDateStr);
        decryptedTrip.startDate = date.toISOString().split('T')[0];
      } else {
        // Date is already in YYYY-MM-DD format or not encrypted
        decryptedTrip.startDate = trip.startDate;
      }
    }
    
    if (trip.endDate && typeof trip.endDate === 'string') {
      if (trip.endDate.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.endDate)) {
        // This looks like an encrypted date
        const decryptedDateStr = await decryptMessage(trip.endDate);
        // Convert ISO string back to YYYY-MM-DD format for consistent frontend handling
        const date = new Date(decryptedDateStr);
        decryptedTrip.endDate = date.toISOString().split('T')[0];
      } else {
        // Date is already in YYYY-MM-DD format or not encrypted
        decryptedTrip.endDate = trip.endDate;
      }
    }
    
    // Decrypt invite code
    if (trip.inviteCode && typeof trip.inviteCode === 'string') {
      if (trip.inviteCode.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.inviteCode)) {
        decryptedTrip.inviteCode = await decryptMessage(trip.inviteCode);
      } else {
        // Invite code is already decrypted or plain text
        decryptedTrip.inviteCode = trip.inviteCode;
      }
    }
    
    return decryptedTrip;
  } catch (error) {
    console.error('Trip decryption error:', error);
    return {
      ...trip,
      name: '[Trip name could not be decrypted]',
      description: '[Trip description could not be decrypted]',
      location: '[Trip location could not be decrypted]',
      startDate: '[Trip start date could not be decrypted]',
      endDate: '[Trip end date could not be decrypted]',
      inviteCode: '[Invite code could not be decrypted]',
      isEncrypted: false
    };
  }
}

/**
 * Encrypt sensitive user data
 */
export async function encryptUser(user: any): Promise<any> {
  try {
    let encryptedUser = { ...user, isEncrypted: true };
    
    // Encrypt sensitive user information (but not username which is needed for login)
    if (user.displayName && typeof user.displayName === 'string') {
      encryptedUser.displayName = await encryptMessage(user.displayName);
    }
    
    if (user.email && typeof user.email === 'string') {
      encryptedUser.email = await encryptMessage(user.email);
    }
    
    return encryptedUser;
  } catch (error) {
    console.error('User encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt user data
 */
export async function decryptUser(user: any): Promise<any> {
  try {
    if (!user.isEncrypted) return user;
    
    let decryptedUser = { ...user, isEncrypted: false };
    
    // Decrypt user information - only decrypt if the value looks like base64 encrypted data
    if (user.displayName && typeof user.displayName === 'string') {
      // Check if displayName looks like encrypted base64 data (long string with special chars)
      if (user.displayName.length > 50 && /^[A-Za-z0-9+/=]+$/.test(user.displayName)) {
        decryptedUser.displayName = await decryptMessage(user.displayName);
      } else {
        // DisplayName is already decrypted or plain text
        decryptedUser.displayName = user.displayName;
      }
    }
    
    if (user.email && typeof user.email === 'string') {
      // Check if email looks like encrypted base64 data (long string with special chars)
      if (user.email.length > 50 && /^[A-Za-z0-9+/=]+$/.test(user.email)) {
        decryptedUser.email = await decryptMessage(user.email);
      } else {
        // Email is already decrypted or plain text
        decryptedUser.email = user.email;
      }
    }
    
    return decryptedUser;
  } catch (error) {
    console.error('User decryption error:', error);
    return {
      ...user,
      displayName: '[Display name could not be decrypted]',
      email: '[Email could not be decrypted]',
      isEncrypted: false
    };
  }
}

/**
 * Encrypt sensitive itinerary activity data
 */
export async function encryptItineraryActivity(activity: any): Promise<any> {
  try {
    let encryptedActivity = { ...activity, isEncrypted: true };
    
    // Encrypt sensitive activity information
    if (activity.title && typeof activity.title === 'string') {
      encryptedActivity.title = await encryptMessage(activity.title);
    }
    
    if (activity.description && typeof activity.description === 'string') {
      encryptedActivity.description = await encryptMessage(activity.description);
    }
    
    if (activity.location && typeof activity.location === 'string') {
      encryptedActivity.location = await encryptMessage(activity.location);
    }
    
    return encryptedActivity;
  } catch (error) {
    console.error('Itinerary activity encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt itinerary activity data
 */
export async function decryptItineraryActivity(activity: any): Promise<any> {
  try {
    if (!activity.isEncrypted) return activity;
    
    let decryptedActivity = { ...activity, isEncrypted: false };
    
    // Decrypt activity information - only decrypt if the value looks like base64 encrypted data
    if (activity.title && typeof activity.title === 'string') {
      // Check if title looks like encrypted base64 data
      if (activity.title.length > 50 && /^[A-Za-z0-9+/=]+$/.test(activity.title)) {
        decryptedActivity.title = await decryptMessage(activity.title);
      } else {
        // Title is already decrypted or plain text
        decryptedActivity.title = activity.title;
      }
    }
    
    if (activity.description && typeof activity.description === 'string') {
      // Check if description looks like encrypted base64 data
      if (activity.description.length > 50 && /^[A-Za-z0-9+/=]+$/.test(activity.description)) {
        decryptedActivity.description = await decryptMessage(activity.description);
      } else {
        // Description is already decrypted or plain text
        decryptedActivity.description = activity.description;
      }
    }
    
    if (activity.location && typeof activity.location === 'string') {
      // Check if location looks like encrypted base64 data
      if (activity.location.length > 50 && /^[A-Za-z0-9+/=]+$/.test(activity.location)) {
        decryptedActivity.location = await decryptMessage(activity.location);
      } else {
        // Location is already decrypted or plain text
        decryptedActivity.location = activity.location;
      }
    }
    
    return decryptedActivity;
  } catch (error) {
    console.error('Itinerary activity decryption error:', error);
    return {
      ...activity,
      title: '[Activity title could not be decrypted]',
      description: '[Activity description could not be decrypted]',
      location: '[Activity location could not be decrypted]',
      isEncrypted: false
    };
  }
}

/**
 * Batch decrypt multiple items of any type
 */
export async function decryptBatch(items: any[], decryptFunction: (item: any) => Promise<any>): Promise<any[]> {
  try {
    const decryptedItems = await Promise.all(
      items.map(item => decryptFunction(item))
    );
    return decryptedItems;
  } catch (error) {
    console.error('Batch decryption error:', error);
    return items;
  }
}

/**
 * Encrypt file data for secure storage
 */
export async function encryptFile(fileBuffer: Buffer, originalFilename: string): Promise<{
  encryptedData: string;
  encryptedFilename: string;
  salt: string;
  iv: string;
}> {
  try {
    // Generate unique salt and IV for this file
    const salt = randomBytes(16);
    const iv = randomBytes(16);
    
    // Derive key from master key and salt
    const derivedKey = scryptSync(ENCRYPTION_KEY, salt, 32);
    
    // Encrypt file data
    const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
    let encryptedData = cipher.update(fileBuffer);
    encryptedData = Buffer.concat([encryptedData, cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Encrypt filename separately
    const filenameCipher = createCipheriv('aes-256-gcm', derivedKey, iv);
    let encryptedFilename = filenameCipher.update(originalFilename, 'utf8');
    encryptedFilename = Buffer.concat([encryptedFilename, filenameCipher.final()]);
    const filenameAuthTag = filenameCipher.getAuthTag();
    
    // Combine data with auth tags and encode
    const combinedData = Buffer.concat([encryptedData, authTag]);
    const combinedFilename = Buffer.concat([encryptedFilename, filenameAuthTag]);
    
    return {
      encryptedData: combinedData.toString('base64'),
      encryptedFilename: combinedFilename.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64')
    };
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
}

/**
 * Decrypt file data
 */
export async function decryptFile(encryptedData: string, encryptedFilename: string, salt: string, iv: string): Promise<{
  fileBuffer: Buffer;
  originalFilename: string;
}> {
  try {
    const saltBuffer = Buffer.from(salt, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    
    // Derive the same key
    const derivedKey = scryptSync(ENCRYPTION_KEY, saltBuffer, 32);
    
    // Decrypt file data
    const combinedData = Buffer.from(encryptedData, 'base64');
    const encryptedFileData = combinedData.subarray(0, -16);
    const authTag = combinedData.subarray(-16);
    
    const decipher = createDecipheriv('aes-256-gcm', derivedKey, ivBuffer, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    let decryptedData = decipher.update(encryptedFileData);
    decryptedData = Buffer.concat([decryptedData, decipher.final()]);
    
    // Decrypt filename
    const combinedFilename = Buffer.from(encryptedFilename, 'base64');
    const encryptedFilenameData = combinedFilename.subarray(0, -16);
    const filenameAuthTag = combinedFilename.subarray(-16);
    
    const filenameDecipher = createDecipheriv('aes-256-gcm', derivedKey, ivBuffer, { authTagLength: 16 });
    filenameDecipher.setAuthTag(filenameAuthTag);
    let decryptedFilename = filenameDecipher.update(encryptedFilenameData);
    decryptedFilename = Buffer.concat([decryptedFilename, filenameDecipher.final()]);
    
    return {
      fileBuffer: decryptedData,
      originalFilename: decryptedFilename.toString('utf8')
    };
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
}