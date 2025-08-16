import { randomBytes } from "crypto";

export class CustomPasswordReset {
  /**
   * Generate a unique 6-digit reset code using only Node.js built-in crypto
   */
  static generateResetCode(): string {
    // Generate 6 random digits (100000 to 999999)
    const min = 100000;
    const max = 999999;
    
    // Use crypto.randomBytes for secure random number generation
    const buffer = randomBytes(4);
    const randomValue = buffer.readUInt32BE(0);
    
    // Scale to our range
    const code = min + (randomValue % (max - min + 1));
    
    return code.toString();
  }

  /**
   * Generate a unique alphanumeric reset code (8 characters)
   */
  static generateAlphanumericCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Generate 8 random characters
    const buffer = randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[buffer[i] % chars.length];
    }
    
    return code;
  }

  /**
   * Validate if a reset code has the correct format
   */
  static isValidCodeFormat(code: string): boolean {
    // Check if it's a 6-digit numeric code
    if (/^\d{6}$/.test(code)) {
      return true;
    }
    
    // Check if it's an 8-character alphanumeric code
    if (/^[A-Z0-9]{8}$/.test(code)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a reset code has expired (1 hour expiration)
   */
  static isCodeExpired(createdAt: Date, expiresAt: Date): boolean {
    const now = new Date();
    return now > expiresAt;
  }

  /**
   * Generate expiration timestamp (1 hour from now)
   */
  static generateExpirationTime(): Date {
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 1);
    return expirationTime;
  }
}