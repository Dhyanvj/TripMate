var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";

// server/passwordReset.ts
import { randomBytes } from "crypto";
var CustomPasswordReset = class {
  /**
   * Generate a unique 6-digit reset code using only Node.js built-in crypto
   */
  static generateResetCode() {
    const min = 1e5;
    const max = 999999;
    const buffer = randomBytes(4);
    const randomValue = buffer.readUInt32BE(0);
    const code = min + randomValue % (max - min + 1);
    return code.toString();
  }
  /**
   * Generate a unique alphanumeric reset code (8 characters)
   */
  static generateAlphanumericCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    const buffer = randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[buffer[i] % chars.length];
    }
    return code;
  }
  /**
   * Validate if a reset code has the correct format
   */
  static isValidCodeFormat(code) {
    if (/^\d{6}$/.test(code)) {
      return true;
    }
    if (/^[A-Z0-9]{8}$/.test(code)) {
      return true;
    }
    return false;
  }
  /**
   * Check if a reset code has expired (1 hour expiration)
   */
  static isCodeExpired(createdAt, expiresAt) {
    const now = /* @__PURE__ */ new Date();
    return now > expiresAt;
  }
  /**
   * Generate expiration timestamp (1 hour from now)
   */
  static generateExpirationTime() {
    const expirationTime = /* @__PURE__ */ new Date();
    expirationTime.setHours(expirationTime.getHours() + 1);
    return expirationTime;
  }
};

// server/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes as randomBytes2, scrypt, scryptSync } from "crypto";
import { promisify } from "util";
var ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY || "tripmate-file-encryption-key-change-in-production";
var asyncScrypt = promisify(scrypt);
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
var SALT_LENGTH = 32;
var TAG_LENGTH = 16;
var KEY_LENGTH = 32;
async function deriveKey(password, salt) {
  return await asyncScrypt(password, salt, KEY_LENGTH);
}
function getEncryptionPassword() {
  return process.env.CHAT_ENCRYPTION_KEY || "tripmate-default-encryption-key-change-in-production";
}
async function encryptMessage(message) {
  try {
    const password = getEncryptionPassword();
    const salt = randomBytes2(SALT_LENGTH);
    const iv = randomBytes2(IV_LENGTH);
    const key = await deriveKey(password, salt);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(message, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    const result = Buffer.concat([salt, iv, tag, encrypted]);
    return result.toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt message");
  }
}
async function decryptMessage(encryptedData) {
  try {
    const password = getEncryptionPassword();
    const buffer = Buffer.from(encryptedData, "base64");
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const key = await deriveKey(password, salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt message");
  }
}
async function encryptChatMessage(message) {
  try {
    if (message.message && typeof message.message === "string") {
      const encryptedMessage = await encryptMessage(message.message);
      return {
        ...message,
        message: encryptedMessage,
        isEncrypted: true
      };
    }
    return message;
  } catch (error) {
    console.error("Chat message encryption error:", error);
    throw error;
  }
}
async function decryptChatMessage(message) {
  try {
    if (message.isEncrypted && message.message && typeof message.message === "string") {
      const decryptedMessage = await decryptMessage(message.message);
      return {
        ...message,
        message: decryptedMessage,
        isEncrypted: false
      };
    }
    return message;
  } catch (error) {
    console.error("Chat message decryption error:", error);
    return {
      ...message,
      message: "[Message could not be decrypted]",
      isEncrypted: false
    };
  }
}
async function decryptChatMessages(messages) {
  try {
    const decryptedMessages = await Promise.all(
      messages.map((message) => decryptChatMessage(message))
    );
    return decryptedMessages;
  } catch (error) {
    console.error("Batch decryption error:", error);
    return messages;
  }
}
async function encryptGroceryItem(item) {
  try {
    if (item.name && typeof item.name === "string") {
      const encryptedName = await encryptMessage(item.name);
      return {
        ...item,
        name: encryptedName,
        isEncrypted: true
      };
    }
    return item;
  } catch (error) {
    console.error("Grocery item encryption error:", error);
    throw error;
  }
}
async function decryptGroceryItem(item) {
  try {
    if (item.isEncrypted && item.name && typeof item.name === "string") {
      const decryptedName = await decryptMessage(item.name);
      return {
        ...item,
        name: decryptedName,
        isEncrypted: false
      };
    }
    return item;
  } catch (error) {
    console.error("Grocery item decryption error:", error);
    return {
      ...item,
      name: "[Item name could not be decrypted]",
      isEncrypted: false
    };
  }
}
async function encryptPackingItem(item) {
  try {
    if (item.name && typeof item.name === "string") {
      const encryptedName = await encryptMessage(item.name);
      return {
        ...item,
        name: encryptedName,
        isEncrypted: true
      };
    }
    return item;
  } catch (error) {
    console.error("Packing item encryption error:", error);
    throw error;
  }
}
async function decryptPackingItem(item) {
  try {
    if (item.isEncrypted && item.name && typeof item.name === "string") {
      const decryptedName = await decryptMessage(item.name);
      return {
        ...item,
        name: decryptedName,
        isEncrypted: false
      };
    }
    return item;
  } catch (error) {
    console.error("Packing item decryption error:", error);
    return {
      ...item,
      name: "[Item name could not be decrypted]",
      isEncrypted: false
    };
  }
}
async function encryptExpense(expense) {
  try {
    let encryptedExpense = { ...expense, isEncrypted: true };
    if (expense.description && typeof expense.description === "string") {
      encryptedExpense.description = await encryptMessage(expense.description);
    }
    return encryptedExpense;
  } catch (error) {
    console.error("Expense encryption error:", error);
    throw error;
  }
}
async function decryptExpense(expense) {
  try {
    if (expense.isEncrypted && expense.description && typeof expense.description === "string") {
      const decryptedDescription = await decryptMessage(expense.description);
      return {
        ...expense,
        description: decryptedDescription,
        isEncrypted: false
      };
    }
    return expense;
  } catch (error) {
    console.error("Expense decryption error:", error);
    return {
      ...expense,
      description: "[Expense description could not be decrypted]",
      isEncrypted: false
    };
  }
}
async function encryptTrip(trip) {
  try {
    let encryptedTrip = { ...trip, isEncrypted: true };
    if (trip.name && typeof trip.name === "string") {
      encryptedTrip.name = await encryptMessage(trip.name);
    }
    if (trip.description && typeof trip.description === "string") {
      encryptedTrip.description = await encryptMessage(trip.description);
    }
    if (trip.location && typeof trip.location === "string") {
      encryptedTrip.location = await encryptMessage(trip.location);
    }
    if (trip.startDate) {
      const dateStr = trip.startDate instanceof Date ? trip.startDate.toISOString() : String(trip.startDate);
      encryptedTrip.startDate = await encryptMessage(dateStr);
    }
    if (trip.endDate) {
      const dateStr = trip.endDate instanceof Date ? trip.endDate.toISOString() : String(trip.endDate);
      encryptedTrip.endDate = await encryptMessage(dateStr);
    }
    if (trip.inviteCode && typeof trip.inviteCode === "string") {
      encryptedTrip.inviteCode = await encryptMessage(trip.inviteCode);
    }
    return encryptedTrip;
  } catch (error) {
    console.error("Trip encryption error:", error);
    throw error;
  }
}
async function decryptTrip(trip) {
  try {
    if (!trip.isEncrypted) return trip;
    let decryptedTrip = { ...trip, isEncrypted: false };
    if (trip.name && typeof trip.name === "string") {
      if (trip.name.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.name)) {
        decryptedTrip.name = await decryptMessage(trip.name);
      } else {
        decryptedTrip.name = trip.name;
      }
    }
    if (trip.description && typeof trip.description === "string") {
      if (trip.description.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.description)) {
        decryptedTrip.description = await decryptMessage(trip.description);
      } else {
        decryptedTrip.description = trip.description;
      }
    }
    if (trip.location && typeof trip.location === "string") {
      if (trip.location.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.location)) {
        decryptedTrip.location = await decryptMessage(trip.location);
      } else {
        decryptedTrip.location = trip.location;
      }
    }
    if (trip.startDate && typeof trip.startDate === "string") {
      if (trip.startDate.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.startDate)) {
        const decryptedDateStr = await decryptMessage(trip.startDate);
        const date2 = new Date(decryptedDateStr);
        decryptedTrip.startDate = date2.toISOString().split("T")[0];
      } else {
        decryptedTrip.startDate = trip.startDate;
      }
    }
    if (trip.endDate && typeof trip.endDate === "string") {
      if (trip.endDate.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.endDate)) {
        const decryptedDateStr = await decryptMessage(trip.endDate);
        const date2 = new Date(decryptedDateStr);
        decryptedTrip.endDate = date2.toISOString().split("T")[0];
      } else {
        decryptedTrip.endDate = trip.endDate;
      }
    }
    if (trip.inviteCode && typeof trip.inviteCode === "string") {
      if (trip.inviteCode.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trip.inviteCode)) {
        decryptedTrip.inviteCode = await decryptMessage(trip.inviteCode);
      } else {
        decryptedTrip.inviteCode = trip.inviteCode;
      }
    }
    return decryptedTrip;
  } catch (error) {
    console.error("Trip decryption error:", error);
    return {
      ...trip,
      name: "[Trip name could not be decrypted]",
      description: "[Trip description could not be decrypted]",
      location: "[Trip location could not be decrypted]",
      startDate: "[Trip start date could not be decrypted]",
      endDate: "[Trip end date could not be decrypted]",
      inviteCode: "[Invite code could not be decrypted]",
      isEncrypted: false
    };
  }
}
async function encryptUser(user) {
  try {
    let encryptedUser = { ...user, isEncrypted: true };
    if (user.displayName && typeof user.displayName === "string") {
      encryptedUser.displayName = await encryptMessage(user.displayName);
    }
    if (user.email && typeof user.email === "string") {
      encryptedUser.email = await encryptMessage(user.email);
    }
    return encryptedUser;
  } catch (error) {
    console.error("User encryption error:", error);
    throw error;
  }
}
async function decryptUser(user) {
  try {
    if (!user.isEncrypted) return user;
    let decryptedUser = { ...user, isEncrypted: false };
    if (user.displayName && typeof user.displayName === "string") {
      if (user.displayName.length > 50 && /^[A-Za-z0-9+/=]+$/.test(user.displayName)) {
        decryptedUser.displayName = await decryptMessage(user.displayName);
      } else {
        decryptedUser.displayName = user.displayName;
      }
    }
    if (user.email && typeof user.email === "string") {
      if (user.email.length > 50 && /^[A-Za-z0-9+/=]+$/.test(user.email)) {
        decryptedUser.email = await decryptMessage(user.email);
      } else {
        decryptedUser.email = user.email;
      }
    }
    return decryptedUser;
  } catch (error) {
    console.error("User decryption error:", error);
    return {
      ...user,
      displayName: "[Display name could not be decrypted]",
      email: "[Email could not be decrypted]",
      isEncrypted: false
    };
  }
}
async function encryptFile(fileBuffer, originalFilename) {
  try {
    const salt = randomBytes2(16);
    const iv = randomBytes2(16);
    const derivedKey = scryptSync(ENCRYPTION_KEY, salt, 32);
    const cipher = createCipheriv("aes-256-gcm", derivedKey, iv);
    let encryptedData = cipher.update(fileBuffer);
    encryptedData = Buffer.concat([encryptedData, cipher.final()]);
    const authTag = cipher.getAuthTag();
    const filenameCipher = createCipheriv("aes-256-gcm", derivedKey, iv);
    let encryptedFilename = filenameCipher.update(originalFilename, "utf8");
    encryptedFilename = Buffer.concat([encryptedFilename, filenameCipher.final()]);
    const filenameAuthTag = filenameCipher.getAuthTag();
    const combinedData = Buffer.concat([encryptedData, authTag]);
    const combinedFilename = Buffer.concat([encryptedFilename, filenameAuthTag]);
    return {
      encryptedData: combinedData.toString("base64"),
      encryptedFilename: combinedFilename.toString("base64"),
      salt: salt.toString("base64"),
      iv: iv.toString("base64")
    };
  } catch (error) {
    console.error("File encryption error:", error);
    throw new Error("Failed to encrypt file");
  }
}
async function decryptFile(encryptedData, encryptedFilename, salt, iv) {
  try {
    const saltBuffer = Buffer.from(salt, "base64");
    const ivBuffer = Buffer.from(iv, "base64");
    const derivedKey = scryptSync(ENCRYPTION_KEY, saltBuffer, 32);
    const combinedData = Buffer.from(encryptedData, "base64");
    const encryptedFileData = combinedData.subarray(0, -16);
    const authTag = combinedData.subarray(-16);
    const decipher = createDecipheriv("aes-256-gcm", derivedKey, ivBuffer);
    decipher.setAuthTag(authTag);
    let decryptedData = decipher.update(encryptedFileData);
    decryptedData = Buffer.concat([decryptedData, decipher.final()]);
    const combinedFilename = Buffer.from(encryptedFilename, "base64");
    const encryptedFilenameData = combinedFilename.subarray(0, -16);
    const filenameAuthTag = combinedFilename.subarray(-16);
    const filenameDecipher = createDecipheriv("aes-256-gcm", derivedKey, ivBuffer);
    filenameDecipher.setAuthTag(filenameAuthTag);
    let decryptedFilename = filenameDecipher.update(encryptedFilenameData);
    decryptedFilename = Buffer.concat([decryptedFilename, filenameDecipher.final()]);
    return {
      fileBuffer: decryptedData,
      originalFilename: decryptedFilename.toString("utf8")
    };
  } catch (error) {
    console.error("File decryption error:", error);
    throw new Error("Failed to decrypt file");
  }
}

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activities: () => activities,
  chatMessages: () => chatMessages,
  debtSettlements: () => debtSettlements,
  expenseParticipants: () => expenseParticipants,
  expenses: () => expenses,
  groceryItems: () => groceryItems,
  insertActivitySchema: () => insertActivitySchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertDebtSettlementSchema: () => insertDebtSettlementSchema,
  insertExpenseParticipantSchema: () => insertExpenseParticipantSchema,
  insertExpenseSchema: () => insertExpenseSchema,
  insertGroceryItemSchema: () => insertGroceryItemSchema,
  insertItemCategorySchema: () => insertItemCategorySchema,
  insertItineraryActivitySchema: () => insertItineraryActivitySchema,
  insertItineraryActivityVoteSchema: () => insertItineraryActivityVoteSchema,
  insertItineraryDaySchema: () => insertItineraryDaySchema,
  insertPackingItemSchema: () => insertPackingItemSchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertSpendingMarginSchema: () => insertSpendingMarginSchema,
  insertTripMemberSchema: () => insertTripMemberSchema,
  insertTripSchema: () => insertTripSchema,
  insertUserSchema: () => insertUserSchema,
  itemCategories: () => itemCategories,
  itineraryActivities: () => itineraryActivities,
  itineraryActivityVotes: () => itineraryActivityVotes,
  itineraryDays: () => itineraryDays,
  packingItems: () => packingItems,
  passwordResetTokens: () => passwordResetTokens,
  spendingMargins: () => spendingMargins,
  tripMembers: () => tripMembers,
  trips: () => trips,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatar: text("avatar"),
  dateOfBirth: date("date_of_birth"),
  paymentPreference: text("payment_preference"),
  isEncrypted: boolean("is_encrypted").default(true)
  // Note: these fields aren't in the database yet, we'll use paymentPreference for now
  // venmoHandle: text("venmo_handle"),
  // paypalHandle: text("paypal_handle"),
});
var passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  used: boolean("used").default(false).notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
  avatar: true,
  dateOfBirth: true,
  paymentPreference: true
});
var trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  description: text("description"),
  startDate: text("start_date"),
  // Changed to text to support both encrypted strings and date strings
  endDate: text("end_date"),
  // Changed to text to support both encrypted strings and date strings
  createdById: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  inviteCodeExpiresAt: timestamp("invite_code_expires_at"),
  // When the invite code expires
  tripType: text("trip_type"),
  isPast: boolean("is_past").default(false).notNull(),
  isEncrypted: boolean("is_encrypted").default(true)
});
var insertTripSchema = createInsertSchema(trips).pick({
  name: true,
  location: true,
  description: true,
  createdById: true,
  inviteCode: true,
  tripType: true,
  isPast: true
}).extend({
  // Date fields can now be strings (encrypted) or date strings (YYYY-MM-DD format for unencrypted)
  startDate: z.union([z.string(), z.date(), z.null()]).nullable().transform((val) => {
    if (!val) return null;
    if (typeof val === "string") return val;
    return val.toISOString().split("T")[0];
  }),
  endDate: z.union([z.string(), z.date(), z.null()]).nullable().transform((val) => {
    if (!val) return null;
    if (typeof val === "string") return val;
    return val.toISOString().split("T")[0];
  })
});
var tripMembers = pgTable("trip_members", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  // Added to support hiding trips per user
  isAdmin: boolean("is_admin").default(false).notNull()
  // Added to support admin permissions
}, (table) => {
  return {
    unq: unique().on(table.tripId, table.userId)
  };
});
var insertTripMemberSchema = createInsertSchema(tripMembers).pick({
  tripId: true,
  userId: true,
  isHidden: true,
  isAdmin: true
});
var itemCategories = pgTable("item_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  colorClass: text("color_class")
});
var insertItemCategorySchema = createInsertSchema(itemCategories).pick({
  name: true,
  colorClass: true
});
var groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  completed: boolean("completed").default(false).notNull(),
  categoryId: integer("category_id"),
  assignedTo: integer("assigned_to"),
  addedBy: integer("added_by").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  isEncrypted: boolean("is_encrypted").default(true)
});
var insertGroceryItemSchema = createInsertSchema(groceryItems).pick({
  tripId: true,
  name: true,
  quantity: true,
  completed: true,
  categoryId: true,
  assignedTo: true,
  addedBy: true
});
var expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  paidBy: integer("paid_by").notNull(),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
  addedBy: integer("added_by").notNull(),
  category: text("category"),
  isPersonal: boolean("is_personal").default(false).notNull(),
  isEncrypted: boolean("is_encrypted").default(true)
});
var insertExpenseSchema = createInsertSchema(expenses).pick({
  tripId: true,
  description: true,
  amount: true,
  paidBy: true,
  paidAt: true,
  addedBy: true,
  category: true,
  isPersonal: true
});
var expenseParticipants = pgTable("expense_participants", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull(),
  userId: integer("user_id").notNull()
}, (table) => {
  return {
    unq: unique().on(table.expenseId, table.userId)
  };
});
var insertExpenseParticipantSchema = createInsertSchema(expenseParticipants).pick({
  expenseId: true,
  userId: true
});
var packingItems = pgTable("packing_items", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  isPacked: boolean("is_packed").default(false).notNull(),
  isGroupItem: boolean("is_group_item").default(false).notNull(),
  isPersonal: boolean("is_personal").default(false).notNull(),
  assignedTo: integer("assigned_to"),
  addedBy: integer("added_by").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  isEncrypted: boolean("is_encrypted").default(true)
});
var insertPackingItemSchema = createInsertSchema(packingItems).pick({
  tripId: true,
  name: true,
  quantity: true,
  isPacked: true,
  isGroupItem: true,
  isPersonal: true,
  assignedTo: true,
  addedBy: true
});
var chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  isPoll: boolean("is_poll").default(false).notNull(),
  pollOptions: jsonb("poll_options"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  readBy: jsonb("read_by").default([]),
  // Array of user IDs who have read the message
  reactions: jsonb("reactions").default({}),
  // Object with emoji as keys and arrays of user IDs as values
  isDeleted: boolean("is_deleted").default(false),
  // File attachment fields
  hasAttachment: boolean("has_attachment").default(false),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentSize: integer("attachment_size"),
  attachmentType: text("attachment_type"),
  // Encryption fields
  isEncrypted: boolean("is_encrypted").default(true),
  // File encryption metadata
  isFileEncrypted: boolean("is_file_encrypted").default(false),
  encryptionSalt: text("encryption_salt"),
  encryptionIv: text("encryption_iv")
});
var insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  tripId: true,
  userId: true,
  message: true,
  isPoll: true,
  pollOptions: true,
  isEdited: true,
  editedAt: true,
  readBy: true,
  reactions: true,
  isDeleted: true,
  hasAttachment: true,
  attachmentUrl: true,
  attachmentName: true,
  attachmentSize: true,
  attachmentType: true,
  isEncrypted: true
});
var activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  activityType: text("activity_type").notNull(),
  activityData: jsonb("activity_data"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertActivitySchema = createInsertSchema(activities).pick({
  tripId: true,
  userId: true,
  activityType: true,
  activityData: true
});
var spendingMargins = pgTable("spending_margins", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  budgetLimit: real("budget_limit").notNull(),
  warningThreshold: real("warning_threshold").default(0.8),
  // 80% by default
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  unq: unique().on(table.tripId, table.userId)
  // One margin per user per trip
}));
var insertSpendingMarginSchema = createInsertSchema(spendingMargins).pick({
  tripId: true,
  userId: true,
  budgetLimit: true,
  warningThreshold: true
});
var debtSettlements = pgTable("debt_settlements", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  owedById: integer("owed_by_id").notNull(),
  // Person who owed the money
  owedToId: integer("owed_to_id").notNull(),
  // Person who was owed the money
  amount: real("amount").notNull(),
  settledAt: timestamp("settled_at").defaultNow().notNull(),
  settledById: integer("settled_by_id").notNull(),
  // Person who marked it as settled
  notes: text("notes")
});
var itineraryDays = pgTable("itinerary_days", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  date: text("date").notNull(),
  // YYYY-MM-DD format
  title: text("title").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isEncrypted: boolean("is_encrypted").default(true)
});
var itineraryActivities = pgTable("itinerary_activities", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id").notNull(),
  tripId: integer("trip_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: text("start_time"),
  // HH:MM format
  endTime: text("end_time"),
  // HH:MM format
  location: text("location"),
  category: text("category"),
  // e.g., "sightseeing", "dining", "transport", "accommodation"
  estimatedCost: real("estimated_cost"),
  actualCost: real("actual_cost"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  sortOrder: integer("sort_order").default(0),
  isCompleted: boolean("is_completed").default(false),
  isAiGenerated: boolean("is_ai_generated").default(false),
  isEncrypted: boolean("is_encrypted").default(true),
  // New fields for collaborative suggestions
  isSuggestion: boolean("is_suggestion").default(false),
  isApproved: boolean("is_approved").default(true),
  // Default true for regular activities
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectedBy: integer("rejected_by"),
  rejectedAt: timestamp("rejected_at")
});
var itineraryActivityVotes = pgTable("itinerary_activity_votes", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull(),
  userId: integer("user_id").notNull(),
  vote: text("vote").notNull(),
  // "up", "down", "interested"
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  unq: unique().on(table.activityId, table.userId)
  // One vote per user per activity
}));
var insertDebtSettlementSchema = createInsertSchema(debtSettlements).pick({
  tripId: true,
  owedById: true,
  owedToId: true,
  amount: true,
  settledAt: true,
  settledById: true,
  notes: true
});
var insertItineraryDaySchema = createInsertSchema(itineraryDays).pick({
  tripId: true,
  date: true,
  title: true,
  createdBy: true
});
var insertItineraryActivitySchema = createInsertSchema(itineraryActivities).pick({
  dayId: true,
  tripId: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  location: true,
  category: true,
  estimatedCost: true,
  actualCost: true,
  notes: true,
  createdBy: true,
  sortOrder: true,
  isCompleted: true,
  isAiGenerated: true,
  isSuggestion: true,
  isApproved: true,
  approvedBy: true,
  rejectedBy: true
});
var insertItineraryActivityVoteSchema = createInsertSchema(itineraryActivityVotes).pick({
  activityId: true,
  userId: true,
  vote: true
});
var insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, or, desc, sql } from "drizzle-orm";
import session from "express-session";
import MemoryStoreFactory from "memorystore";
import connectPgFactory from "connect-pg-simple";
var DatabaseStorage = class {
  // Session store for auth
  sessionStore;
  constructor() {
    const PostgresSessionStore2 = connectPgFactory(session);
    this.sessionStore = new PostgresSessionStore2({
      pool,
      createTableIfMissing: true
    });
  }
  async hideTrip(tripId, userId) {
    try {
      const [updated] = await db.update(tripMembers).set({ isHidden: true }).where(and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.userId, userId)
      )).returning();
      return !!updated;
    } catch (error) {
      console.error("Error hiding trip:", error);
      return false;
    }
  }
  async unhideTrip(tripId, userId) {
    try {
      const [updated] = await db.update(tripMembers).set({ isHidden: false }).where(and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.userId, userId)
      )).returning();
      return !!updated;
    } catch (error) {
      console.error("Error unhiding trip:", error);
      return false;
    }
  }
  async getHiddenTrips(userId) {
    try {
      console.log(`Fetching hidden trips for user ID: ${userId}`);
      const hiddenTripMembers = await db.select().from(tripMembers).where(and(
        eq(tripMembers.userId, userId),
        eq(tripMembers.isHidden, true)
      ));
      if (hiddenTripMembers.length === 0) {
        console.log(`Retrieved 0 hidden trips for user ${userId}`);
        return [];
      }
      const tripIds = hiddenTripMembers.map((member) => member.tripId);
      const hiddenTrips = [];
      for (const id of tripIds) {
        const trip = await this.getTrip(id);
        if (trip) {
          hiddenTrips.push(trip);
        }
      }
      console.log(`Retrieved ${hiddenTrips.length} hidden trips for user ${userId}`);
      return hiddenTrips;
    } catch (error) {
      console.error("Error fetching hidden trips:", error);
      return [];
    }
  }
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return void 0;
    if (user.isEncrypted) {
      try {
        return await decryptUser(user);
      } catch (error) {
        console.error("User decryption error, returning unencrypted data:", error);
        return { ...user, isEncrypted: false };
      }
    }
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return void 0;
    if (user.isEncrypted) {
      try {
        return await decryptUser(user);
      } catch (error) {
        console.error("User decryption error, returning unencrypted data:", error);
        return { ...user, isEncrypted: false };
      }
    }
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return void 0;
    if (user.isEncrypted) {
      try {
        return await decryptUser(user);
      } catch (error) {
        console.error("User decryption error, returning unencrypted data:", error);
        return { ...user, isEncrypted: false };
      }
    }
    return user;
  }
  async createUser(insertUser) {
    const encryptedUserData = await encryptUser(insertUser);
    const [user] = await db.insert(users).values({
      ...encryptedUserData,
      isEncrypted: true
    }).returning();
    return user;
  }
  async updateUser(id, updates) {
    try {
      console.log(`Updating user ${id} with:`, updates);
      const [rawUser] = await db.select().from(users).where(eq(users.id, id));
      if (!rawUser) {
        throw new Error(`User with ID ${id} not found`);
      }
      let formattedUpdates = { ...updates };
      if (rawUser.isEncrypted && (updates.displayName !== void 0 || updates.email !== void 0)) {
        console.log(`User ${id} is encrypted, encrypting updated fields...`);
        const encryptableUpdates = {};
        if (updates.displayName !== void 0) {
          encryptableUpdates.displayName = updates.displayName;
        }
        if (updates.email !== void 0) {
          encryptableUpdates.email = updates.email;
        }
        const encryptedUpdates = await encryptUser(encryptableUpdates);
        console.log(`Encrypted fields for user ${id}:`, Object.keys(encryptedUpdates));
        formattedUpdates = {
          ...formattedUpdates,
          ...encryptedUpdates
        };
      }
      console.log(`Formatted updates for user ${id}:`, formattedUpdates);
      const [updatedUser] = await db.update(users).set(formattedUpdates).where(eq(users.id, id)).returning();
      if (!updatedUser) {
        throw new Error(`User with ID ${id} not found`);
      }
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }
  // Password Reset methods
  async createPasswordResetToken(userId) {
    const resetCode = CustomPasswordReset.generateResetCode();
    const expiresAt = CustomPasswordReset.generateExpirationTime();
    const [token] = await db.insert(passwordResetTokens).values({
      userId,
      token: resetCode,
      expiresAt,
      used: false
    }).returning();
    return token;
  }
  async getPasswordResetToken(token) {
    const now = /* @__PURE__ */ new Date();
    const [resetToken] = await db.select().from(passwordResetTokens).where(
      and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        sql`${passwordResetTokens.expiresAt} > ${now}`
      )
    );
    return resetToken || void 0;
  }
  async markTokenAsUsed(tokenId) {
    const result = await db.update(passwordResetTokens).set({
      used: true
    }).where(eq(passwordResetTokens.id, tokenId));
    return result.count > 0;
  }
  generateInviteCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  async getTrip(id) {
    try {
      const [rawTrip] = await db.select().from(trips).where(eq(trips.id, id));
      if (!rawTrip) {
        return void 0;
      }
      if (rawTrip.isEncrypted) {
        try {
          const decrypted = await decryptTrip(rawTrip);
          return { ...decrypted, isEncrypted: true };
        } catch (error) {
          console.error("Trip decryption error, returning unencrypted data:", error);
          return { ...rawTrip, isEncrypted: false };
        }
      }
      return rawTrip;
    } catch (error) {
      console.error(`Error fetching trip ${id}:`, error);
      return void 0;
    }
  }
  async getTripByInviteCode(inviteCode) {
    const [trip] = await db.select().from(trips).where(eq(trips.inviteCode, inviteCode));
    if (trip && trip.inviteCodeExpiresAt) {
      const now = /* @__PURE__ */ new Date();
      if (now > trip.inviteCodeExpiresAt) {
        await this.invalidateInviteCode(trip.id);
        return void 0;
      }
    }
    return trip || void 0;
  }
  async invalidateInviteCode(tripId) {
    try {
      const result = await db.update(trips).set({
        inviteCode: this.generateInviteCode(),
        // Generate new code to ensure uniqueness
        inviteCodeExpiresAt: null
      }).where(eq(trips.id, tripId));
      return true;
    } catch (error) {
      console.error("Error invalidating invite code:", error);
      return false;
    }
  }
  async updateInviteCodeExpiration(tripId, expiresAt) {
    try {
      const [updatedTrip] = await db.update(trips).set({ inviteCodeExpiresAt: expiresAt }).where(eq(trips.id, tripId)).returning();
      return updatedTrip || void 0;
    } catch (error) {
      console.error("Error updating invite code expiration:", error);
      return void 0;
    }
  }
  async regenerateInviteCode(tripId, expiresAt = null) {
    try {
      const newInviteCode = this.generateInviteCode();
      const [updatedTrip] = await db.update(trips).set({
        inviteCode: newInviteCode,
        inviteCodeExpiresAt: expiresAt
      }).where(eq(trips.id, tripId)).returning();
      return updatedTrip || void 0;
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      return void 0;
    }
  }
  async getUserTrips(userId) {
    try {
      const ownedTrips = await db.select().from(trips).where(eq(trips.createdById, userId));
      const memberTripsQuery = await db.select().from(trips).innerJoin(tripMembers, eq(trips.id, tripMembers.tripId)).where(and(
        eq(tripMembers.userId, userId),
        eq(tripMembers.isHidden, false)
      ));
      const memberTrips = memberTripsQuery.map((row) => row.trips);
      const allTrips = [...ownedTrips, ...memberTrips];
      const uniqueTrips = allTrips.filter(
        (trip, index, self) => index === self.findIndex((t) => t.id === trip.id)
      );
      const decryptedTrips = await Promise.all(
        uniqueTrips.map(async (trip) => {
          if (trip.isEncrypted) {
            try {
              const decrypted = await decryptTrip(trip);
              return { ...decrypted, isEncrypted: true };
            } catch (error) {
              console.error(`Trip ${trip.id} decryption error:`, error);
              return { ...trip, isEncrypted: false };
            }
          }
          return trip;
        })
      );
      console.log(`Retrieved ${decryptedTrips.length} trips for user ${userId}`);
      return decryptedTrips;
    } catch (error) {
      console.error("Error fetching user trips:", error);
      return [];
    }
  }
  async createTrip(insertTrip) {
    console.log(`Creating trip for user ID: ${insertTrip.createdById}`, insertTrip);
    let trip;
    try {
      console.log("Encrypting trip data...");
      const encryptedTripData = await encryptTrip(insertTrip);
      console.log("Trip data encrypted successfully:", {
        originalName: insertTrip.name,
        encryptedName: encryptedTripData.name?.substring(0, 20) + "...",
        hasEncryptedLocation: !!encryptedTripData.location,
        hasEncryptedDescription: !!encryptedTripData.description,
        hasEncryptedStartDate: !!encryptedTripData.startDate,
        hasEncryptedEndDate: !!encryptedTripData.endDate,
        hasEncryptedInviteCode: !!encryptedTripData.inviteCode
      });
      const formattedTrip = {
        ...encryptedTripData,
        isEncrypted: true
      };
      console.log("Formatted trip for database insertion:", {
        ...formattedTrip,
        name: formattedTrip.name?.substring(0, 20) + "...",
        location: formattedTrip.location?.substring(0, 20) + "...",
        description: formattedTrip.description?.substring(0, 20) + "..."
      });
      [trip] = await db.insert(trips).values(formattedTrip).returning();
      console.log(`Trip created successfully with ID: ${trip.id}`);
    } catch (encryptionError) {
      console.error("Trip encryption failed, creating unencrypted trip:", encryptionError);
      const fallbackTrip = {
        ...insertTrip,
        isEncrypted: false,
        startDate: insertTrip.startDate instanceof Date ? insertTrip.startDate.toISOString().split("T")[0] : insertTrip.startDate,
        endDate: insertTrip.endDate instanceof Date ? insertTrip.endDate.toISOString().split("T")[0] : insertTrip.endDate
      };
      [trip] = await db.insert(trips).values(fallbackTrip).returning();
      console.log(`Fallback trip created successfully with ID: ${trip.id}`);
    }
    await this.addTripMember({
      tripId: trip.id,
      userId: insertTrip.createdById
    });
    console.log(`Creator (user ID: ${insertTrip.createdById}) added as member of trip ${trip.id}`);
    await this.createActivity({
      tripId: trip.id,
      userId: insertTrip.createdById,
      activityType: "trip_created",
      activityData: { tripName: insertTrip.name }
    });
    console.log(`Trip created activity logged for trip ${trip.id}`);
    const verifyTrip = await this.getTrip(trip.id);
    console.log(`Verification - Trip exists in database: ${!!verifyTrip}`);
    return {
      ...trip,
      name: insertTrip.name,
      description: insertTrip.description,
      location: insertTrip.location,
      isEncrypted: true
      // Keep encryption flag so updates work correctly
    };
  }
  async updateTrip(id, updates) {
    try {
      console.log(`Updating trip ${id} with:`, updates);
      const existingTrip = await this.getTrip(id);
      if (!existingTrip) return void 0;
      let formattedUpdates = { ...updates };
      if (updates.startDate !== void 0) {
        if (typeof updates.startDate === "object" && updates.startDate instanceof Date) {
          formattedUpdates.startDate = updates.startDate.toISOString().split("T")[0];
        } else if (typeof updates.startDate === "string") {
          const date2 = new Date(updates.startDate);
          formattedUpdates.startDate = date2.toISOString().split("T")[0];
        } else {
          formattedUpdates.startDate = updates.startDate;
        }
      }
      if (updates.endDate !== void 0) {
        if (typeof updates.endDate === "object" && updates.endDate instanceof Date) {
          formattedUpdates.endDate = updates.endDate.toISOString().split("T")[0];
        } else if (typeof updates.endDate === "string") {
          const date2 = new Date(updates.endDate);
          formattedUpdates.endDate = date2.toISOString().split("T")[0];
        } else {
          formattedUpdates.endDate = updates.endDate;
        }
      }
      if (existingTrip.isEncrypted && (updates.name !== void 0 || updates.description !== void 0 || updates.location !== void 0 || updates.startDate !== void 0 || updates.endDate !== void 0 || updates.inviteCode !== void 0)) {
        console.log(`Trip ${id} is encrypted, encrypting updated fields...`);
        const encryptableUpdates = {};
        if (updates.name !== void 0) {
          encryptableUpdates.name = updates.name;
        }
        if (updates.description !== void 0) {
          encryptableUpdates.description = updates.description;
        }
        if (updates.location !== void 0) {
          encryptableUpdates.location = updates.location;
        }
        if (updates.startDate !== void 0) {
          encryptableUpdates.startDate = updates.startDate;
        }
        if (updates.endDate !== void 0) {
          encryptableUpdates.endDate = updates.endDate;
        }
        if (updates.inviteCode !== void 0) {
          encryptableUpdates.inviteCode = updates.inviteCode;
        }
        const encryptedUpdates = await encryptTrip(encryptableUpdates);
        console.log(`Encrypted fields for trip ${id}:`, Object.keys(encryptedUpdates));
        formattedUpdates = {
          ...formattedUpdates,
          ...encryptedUpdates
        };
      }
      console.log(`Formatted updates for trip ${id}:`, formattedUpdates);
      const [updatedTrip] = await db.update(trips).set(formattedUpdates).where(eq(trips.id, id)).returning();
      if (updatedTrip) {
        return updatedTrip;
      }
      return void 0;
    } catch (error) {
      console.error(`Error updating trip ${id}:`, error);
      return void 0;
    }
  }
  async markTripAsPast(id) {
    try {
      const trip = await this.getTrip(id);
      if (!trip) return void 0;
      const [updatedTrip] = await db.update(trips).set({ isPast: true }).where(eq(trips.id, id)).returning();
      if (!updatedTrip) return void 0;
      await this.createActivity({
        tripId: id,
        userId: trip.createdById,
        activityType: "trip_marked_past",
        activityData: { tripName: trip.name }
      });
      return updatedTrip;
    } catch (error) {
      console.error(`Error marking trip ${id} as past:`, error);
      return void 0;
    }
  }
  async unmarkTripAsPast(id) {
    try {
      const trip = await this.getTrip(id);
      if (!trip) return void 0;
      const [updatedTrip] = await db.update(trips).set({ isPast: false }).where(eq(trips.id, id)).returning();
      if (!updatedTrip) return void 0;
      await this.createActivity({
        tripId: id,
        userId: trip.createdById,
        activityType: "trip_restored_active",
        activityData: { tripName: trip.name }
      });
      return updatedTrip;
    } catch (error) {
      console.error(`Error unmarking trip ${id} as past:`, error);
      return void 0;
    }
  }
  async deleteTrip(id) {
    try {
      await this.deleteAllGroceryItems(id);
      await this.deleteAllPackingItems(id);
      await this.deleteAllExpenses(id);
      await this.deleteAllExpenseParticipants(id);
      await this.deleteAllChatMessages(id);
      await this.deleteAllActivities(id);
      await this.deleteTripMembers(id);
      const result = await db.delete(trips).where(eq(trips.id, id)).returning({ id: trips.id });
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting trip ${id}:`, error);
      return false;
    }
  }
  async getTripMembers(tripId) {
    return db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId));
  }
  async getTripMember(tripId, userId) {
    const [member] = await db.select().from(tripMembers).where(
      and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.userId, userId)
      )
    );
    return member || void 0;
  }
  async addTripMember(insertMember) {
    const existingMember = await this.getTripMember(insertMember.tripId, insertMember.userId);
    if (existingMember) return existingMember;
    const memberData = {
      ...insertMember,
      isHidden: insertMember.isHidden ?? false
    };
    const [member] = await db.insert(tripMembers).values(memberData).returning();
    const user = await this.getUser(insertMember.userId);
    const trip = await this.getTrip(insertMember.tripId);
    if (user && trip) {
      await this.createActivity({
        tripId: insertMember.tripId,
        userId: insertMember.userId,
        activityType: "member_joined",
        activityData: {
          memberName: user.displayName,
          tripName: trip.name
        }
      });
    }
    return member;
  }
  async removeTripMember(tripId, userId) {
    const user = await this.getUser(userId);
    const trip = await this.getTrip(tripId);
    const result = await db.delete(tripMembers).where(and(
      eq(tripMembers.tripId, tripId),
      eq(tripMembers.userId, userId)
    )).returning({ id: tripMembers.id });
    if (result.length > 0 && user && trip) {
      await this.createActivity({
        tripId,
        userId,
        activityType: "member_left",
        activityData: {
          memberName: user.displayName,
          tripName: trip.name
        }
      });
    }
    return result.length > 0;
  }
  async setTripMemberAdmin(tripId, userId, isAdmin) {
    try {
      const [updatedMember] = await db.update(tripMembers).set({ isAdmin }).where(and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.userId, userId)
      )).returning();
      if (updatedMember) {
        const user = await this.getUser(userId);
        const trip = await this.getTrip(tripId);
        if (user && trip) {
          await this.createActivity({
            tripId,
            userId,
            activityType: isAdmin ? "member_promoted_admin" : "member_demoted_admin",
            activityData: {
              memberName: user.displayName,
              tripName: trip.name
            }
          });
        }
      }
      return updatedMember || void 0;
    } catch (error) {
      console.error(`Error setting admin status for user ${userId} in trip ${tripId}:`, error);
      return void 0;
    }
  }
  async getTripAdmins(tripId) {
    return db.select().from(tripMembers).where(
      and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.isAdmin, true)
      )
    );
  }
  async getItemCategories() {
    return db.select().from(itemCategories);
  }
  async getItemCategory(id) {
    const [category] = await db.select().from(itemCategories).where(eq(itemCategories.id, id));
    return category || void 0;
  }
  async createItemCategory(insertCategory) {
    const [category] = await db.insert(itemCategories).values(insertCategory).returning();
    return category;
  }
  async getGroceryItems(tripId) {
    const items = await db.select().from(groceryItems).where(eq(groceryItems.tripId, tripId));
    const decryptedItems = await Promise.all(
      items.map(async (item) => {
        if (item.isEncrypted) {
          try {
            return await decryptGroceryItem(item);
          } catch (error) {
            console.error("Grocery item decryption error:", error);
            return { ...item, name: "[Item name could not be decrypted]", isEncrypted: false };
          }
        }
        return item;
      })
    );
    return decryptedItems;
  }
  async getGroceryItem(id) {
    const [item] = await db.select().from(groceryItems).where(eq(groceryItems.id, id));
    if (!item) return void 0;
    if (item.isEncrypted) {
      try {
        return await decryptGroceryItem(item);
      } catch (error) {
        console.error("Grocery item decryption error:", error);
        return { ...item, name: "[Item name could not be decrypted]", isEncrypted: false };
      }
    }
    return item;
  }
  async createGroceryItem(insertItem) {
    const encryptedItemData = await encryptGroceryItem(insertItem);
    const processedItem = {
      ...encryptedItemData,
      quantity: insertItem.quantity ?? null,
      isEncrypted: true
    };
    const [item] = await db.insert(groceryItems).values(processedItem).returning();
    const user = await this.getUser(insertItem.addedBy);
    const trip = await this.getTrip(insertItem.tripId);
    if (user && trip) {
      await this.createActivity({
        tripId: insertItem.tripId,
        userId: insertItem.addedBy,
        activityType: "item_added",
        activityData: {
          memberName: user.displayName,
          tripName: trip.name,
          itemName: insertItem.name,
          quantity: insertItem.quantity
        }
      });
    }
    return await decryptGroceryItem(item);
  }
  async updateGroceryItem(id, updates) {
    const [item] = await db.select().from(groceryItems).where(eq(groceryItems.id, id));
    if (!item) return void 0;
    let processedUpdates = { ...updates };
    if (updates.name !== void 0) {
      const encryptedItem = await encryptGroceryItem({ name: updates.name });
      processedUpdates.name = encryptedItem.name;
      processedUpdates.isEncrypted = true;
    }
    const [updatedItem] = await db.update(groceryItems).set(processedUpdates).where(eq(groceryItems.id, id)).returning();
    if (!updatedItem) return void 0;
    if (updates.completed !== void 0 && updates.completed !== item.completed) {
      const user = await this.getUser(item.addedBy);
      const trip = await this.getTrip(item.tripId);
      if (user && trip) {
        await this.createActivity({
          tripId: item.tripId,
          userId: item.addedBy,
          activityType: updates.completed ? "item_completed" : "item_uncompleted",
          activityData: {
            memberName: user.displayName,
            tripName: trip.name,
            itemName: updates.name || item.name
            // Use original name for activity
          }
        });
      }
    }
    if (updatedItem.isEncrypted) {
      try {
        return await decryptGroceryItem(updatedItem);
      } catch (error) {
        console.error("Grocery item decryption error:", error);
        return { ...updatedItem, name: "[Item name could not be decrypted]", isEncrypted: false };
      }
    }
    return updatedItem;
  }
  async deleteGroceryItem(id) {
    const result = await db.delete(groceryItems).where(eq(groceryItems.id, id)).returning({ id: groceryItems.id });
    return result.length > 0;
  }
  async getExpenses(tripId) {
    const expenseResults = await db.select().from(expenses).where(eq(expenses.tripId, tripId));
    const decryptedExpenses = await Promise.all(
      expenseResults.map(async (expense) => {
        if (expense.isEncrypted) {
          try {
            return await decryptExpense(expense);
          } catch (error) {
            console.error("Expense decryption error:", error);
            return { ...expense, description: "[Expense description could not be decrypted]", isEncrypted: false };
          }
        }
        return expense;
      })
    );
    return decryptedExpenses;
  }
  async getExpense(id) {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!expense) return void 0;
    if (expense.isEncrypted) {
      try {
        return await decryptExpense(expense);
      } catch (error) {
        console.error("Expense decryption error:", error);
        return { ...expense, description: "[Expense description could not be decrypted]", isEncrypted: false };
      }
    }
    return expense;
  }
  async createExpense(insertExpense) {
    const encryptedExpenseData = await encryptExpense(insertExpense);
    const [expense] = await db.insert(expenses).values({
      ...encryptedExpenseData,
      isEncrypted: true
    }).returning();
    const user = await this.getUser(insertExpense.addedBy);
    const trip = await this.getTrip(insertExpense.tripId);
    if (user && trip) {
      await this.createActivity({
        tripId: insertExpense.tripId,
        userId: insertExpense.addedBy,
        activityType: "expense_added",
        activityData: {
          memberName: user.displayName,
          tripName: trip.name,
          expenseDescription: insertExpense.description,
          amount: insertExpense.amount
        }
      });
    }
    return await decryptExpense(expense);
  }
  async getExpenseParticipants(expenseId) {
    return db.select().from(expenseParticipants).where(eq(expenseParticipants.expenseId, expenseId));
  }
  async addExpenseParticipant(insertParticipant) {
    const [participant] = await db.insert(expenseParticipants).values(insertParticipant).returning();
    return participant;
  }
  async deleteExpenseParticipant(id) {
    const result = await db.delete(expenseParticipants).where(eq(expenseParticipants.id, id));
    return !!result.rowCount && result.rowCount > 0;
  }
  async getPackingItems(tripId, userId) {
    console.time(`[DB] Packing items query for trip ${tripId}`);
    try {
      let query;
      if (userId) {
        query = db.select().from(packingItems).where(
          and(
            eq(packingItems.tripId, tripId),
            or(
              // Show all group items to everyone
              eq(packingItems.isGroupItem, true),
              // Only show personal items to their creator
              and(
                eq(packingItems.isPersonal, true),
                eq(packingItems.addedBy, userId)
              )
            )
          )
        ).orderBy(packingItems.id);
      } else {
        query = db.select().from(packingItems).where(eq(packingItems.tripId, tripId)).orderBy(packingItems.id);
      }
      const items = await query;
      const decryptedItems = await Promise.all(
        items.map(async (item) => {
          if (item.isEncrypted) {
            try {
              return await decryptPackingItem(item);
            } catch (error) {
              console.error("Packing item decryption error:", error);
              return { ...item, name: "[Item name could not be decrypted]", isEncrypted: false };
            }
          }
          return item;
        })
      );
      return decryptedItems;
    } finally {
      console.timeEnd(`[DB] Packing items query for trip ${tripId}`);
    }
  }
  async getPackingItem(id) {
    const [item] = await db.select().from(packingItems).where(eq(packingItems.id, id));
    if (!item) return void 0;
    if (item.isEncrypted) {
      try {
        return await decryptPackingItem(item);
      } catch (error) {
        console.error("Packing item decryption error:", error);
        return { ...item, name: "[Item name could not be decrypted]", isEncrypted: false };
      }
    }
    return item;
  }
  async createPackingItem(insertItem) {
    const encryptedItemData = await encryptPackingItem(insertItem);
    const itemWithDefaults = {
      ...encryptedItemData,
      quantity: insertItem.quantity || null,
      isEncrypted: true
    };
    const [item] = await db.insert(packingItems).values(itemWithDefaults).returning();
    return await decryptPackingItem(item);
  }
  async updatePackingItem(id, updates) {
    const [item] = await db.select().from(packingItems).where(eq(packingItems.id, id));
    if (!item) return void 0;
    let processedUpdates = { ...updates };
    if (updates.name !== void 0) {
      const encryptedItem = await encryptPackingItem({ name: updates.name });
      processedUpdates.name = encryptedItem.name;
      processedUpdates.isEncrypted = true;
    }
    const [updatedItem] = await db.update(packingItems).set(processedUpdates).where(eq(packingItems.id, id)).returning();
    if (!updatedItem) return void 0;
    if (updatedItem.isEncrypted) {
      try {
        return await decryptPackingItem(updatedItem);
      } catch (error) {
        console.error("Packing item decryption error:", error);
        return { ...updatedItem, name: "[Item name could not be decrypted]", isEncrypted: false };
      }
    }
    return updatedItem;
  }
  async deletePackingItem(id) {
    const result = await db.delete(packingItems).where(eq(packingItems.id, id)).returning({ id: packingItems.id });
    return result.length > 0;
  }
  async getChatMessages(tripId) {
    const messages = await db.select().from(chatMessages).where(and(
      eq(chatMessages.tripId, tripId),
      eq(chatMessages.isDeleted, false)
    )).orderBy(chatMessages.sentAt);
    return await decryptChatMessages(messages);
  }
  async getChatMessage(id) {
    const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
    if (!message) return void 0;
    return await decryptChatMessage(message);
  }
  async updateChatMessage(id, updates) {
    let processedUpdates = { ...updates };
    if (updates.message !== void 0) {
      const [originalMessage] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
      if (originalMessage && originalMessage.isEncrypted) {
        const encryptedMessage = await encryptChatMessage({ message: updates.message });
        processedUpdates.message = encryptedMessage.message;
        processedUpdates.isEncrypted = true;
      }
    }
    const [updatedMessage] = await db.update(chatMessages).set(processedUpdates).where(eq(chatMessages.id, id)).returning();
    if (!updatedMessage) return void 0;
    return await decryptChatMessage(updatedMessage);
  }
  async createChatMessage(insertMessage) {
    const encryptedMessageData = await encryptChatMessage(insertMessage);
    const [message] = await db.insert(chatMessages).values(encryptedMessageData).returning();
    return await decryptChatMessage(message);
  }
  async getTripActivities(tripId) {
    return db.select().from(activities).where(eq(activities.tripId, tripId)).orderBy(desc(activities.createdAt));
  }
  async createActivity(insertActivity) {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }
  async deleteAllGroceryItems(tripId) {
    const result = await db.delete(groceryItems).where(eq(groceryItems.tripId, tripId)).returning({ id: groceryItems.id });
    return result.length > 0;
  }
  async updateExpense(id, updates) {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!expense) return void 0;
    let processedUpdates = { ...updates };
    if (updates.description !== void 0) {
      const encryptedExpense = await encryptExpense({ description: updates.description });
      processedUpdates.description = encryptedExpense.description;
      processedUpdates.isEncrypted = true;
    }
    const [updatedExpense] = await db.update(expenses).set(processedUpdates).where(eq(expenses.id, id)).returning();
    if (!updatedExpense) return void 0;
    if (updatedExpense.isEncrypted) {
      try {
        return await decryptExpense(updatedExpense);
      } catch (error) {
        console.error("Expense decryption error:", error);
        return { ...updatedExpense, description: "[Expense description could not be decrypted]", isEncrypted: false };
      }
    }
    return updatedExpense;
  }
  async deleteExpense(id) {
    await db.delete(expenseParticipants).where(eq(expenseParticipants.expenseId, id));
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning({ id: expenses.id });
    return result.length > 0;
  }
  async deleteAllExpenses(tripId) {
    const result = await db.delete(expenses).where(eq(expenses.tripId, tripId)).returning({ id: expenses.id });
    return result.length > 0;
  }
  async deleteAllExpenseParticipants(tripId) {
    const tripExpenses = await this.getExpenses(tripId);
    const expenseIds = tripExpenses.map((expense) => expense.id);
    if (expenseIds.length === 0) return false;
    let deleted = false;
    for (const expenseId of expenseIds) {
      const result = await db.delete(expenseParticipants).where(eq(expenseParticipants.expenseId, expenseId)).returning({ id: expenseParticipants.id });
      if (result.length > 0) deleted = true;
    }
    return deleted;
  }
  async deleteAllPackingItems(tripId) {
    const result = await db.delete(packingItems).where(eq(packingItems.tripId, tripId)).returning({ id: packingItems.id });
    return result.length > 0;
  }
  async deleteAllChatMessages(tripId) {
    const result = await db.delete(chatMessages).where(eq(chatMessages.tripId, tripId)).returning({ id: chatMessages.id });
    return result.length > 0;
  }
  async deleteAllActivities(tripId) {
    const result = await db.delete(activities).where(eq(activities.tripId, tripId)).returning({ id: activities.id });
    return result.length > 0;
  }
  async deleteTripMembers(tripId) {
    const result = await db.delete(tripMembers).where(eq(tripMembers.tripId, tripId)).returning({ id: tripMembers.id });
    return result.length > 0;
  }
  // Hide Trip implementation
  async hideTrip(tripId, userId) {
    try {
      const result = await db.update(tripMembers).set({ isHidden: true }).where(and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.userId, userId)
      )).returning({ id: tripMembers.id });
      return result.length > 0;
    } catch (error) {
      console.error(`Error hiding trip ${tripId} for user ${userId}:`, error);
      return false;
    }
  }
  // Unhide Trip implementation
  async unhideTrip(tripId, userId) {
    try {
      const result = await db.update(tripMembers).set({ isHidden: false }).where(and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.userId, userId)
      )).returning({ id: tripMembers.id });
      return result.length > 0;
    } catch (error) {
      console.error(`Error unhiding trip ${tripId} for user ${userId}:`, error);
      return false;
    }
  }
  // Get Hidden Trips implementation
  async getHiddenTrips(userId) {
    try {
      const hiddenTripsQuery = await db.select().from(trips).innerJoin(tripMembers, eq(trips.id, tripMembers.tripId)).where(and(
        eq(tripMembers.userId, userId),
        eq(tripMembers.isHidden, true)
      ));
      const hiddenTrips = hiddenTripsQuery.map((row) => row.trips);
      return hiddenTrips;
    } catch (error) {
      console.error(`Error fetching hidden trips for user ${userId}:`, error);
      return [];
    }
  }
  // Debt Settlement methods
  async getDebtSettlements(tripId) {
    const settlements = await db.select().from(debtSettlements).where(eq(debtSettlements.tripId, tripId)).orderBy(desc(debtSettlements.settledAt));
    return settlements;
  }
  async createDebtSettlement(insertSettlement) {
    const [settlement] = await db.insert(debtSettlements).values(insertSettlement).returning();
    const owedBy = await this.getUser(insertSettlement.owedById);
    const owedTo = await this.getUser(insertSettlement.owedToId);
    const settledBy = await this.getUser(insertSettlement.settledById);
    const trip = await this.getTrip(insertSettlement.tripId);
    if (owedBy && owedTo && settledBy && trip) {
      await this.createActivity({
        tripId: insertSettlement.tripId,
        userId: insertSettlement.settledById,
        activityType: "debt_settled",
        activityData: {
          owedByName: owedBy.displayName,
          owedToName: owedTo.displayName,
          settledByName: settledBy.displayName,
          amount: insertSettlement.amount,
          tripName: trip.name
        }
      });
    }
    return settlement;
  }
  async getDebtSettlementsBetweenUsers(tripId, user1Id, user2Id) {
    const settlements = await db.select().from(debtSettlements).where(
      and(
        eq(debtSettlements.tripId, tripId),
        or(
          and(
            eq(debtSettlements.owedById, user1Id),
            eq(debtSettlements.owedToId, user2Id)
          ),
          and(
            eq(debtSettlements.owedById, user2Id),
            eq(debtSettlements.owedToId, user1Id)
          )
        )
      )
    ).orderBy(desc(debtSettlements.settledAt));
    return settlements;
  }
  async deleteDebtSettlement(id) {
    const result = await db.delete(debtSettlements).where(eq(debtSettlements.id, id)).returning({ id: debtSettlements.id });
    return result.length > 0;
  }
  async deleteAllDebtSettlements(tripId) {
    const result = await db.delete(debtSettlements).where(eq(debtSettlements.tripId, tripId)).returning({ id: debtSettlements.id });
    return result.length > 0;
  }
  // Spending Margin methods
  async getSpendingMargin(tripId, userId) {
    const [margin] = await db.select().from(spendingMargins).where(and(eq(spendingMargins.tripId, tripId), eq(spendingMargins.userId, userId)));
    return margin;
  }
  async setSpendingMargin(tripId, userId, budgetLimit, warningThreshold = 0.8) {
    const [margin] = await db.insert(spendingMargins).values({
      tripId,
      userId,
      budgetLimit,
      warningThreshold,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: [spendingMargins.tripId, spendingMargins.userId],
      set: {
        budgetLimit,
        warningThreshold,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return margin;
  }
  async updateSpendingMargin(tripId, userId, budgetLimit, warningThreshold = 0.8) {
    const [margin] = await db.update(spendingMargins).set({
      budgetLimit,
      warningThreshold,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and(eq(spendingMargins.tripId, tripId), eq(spendingMargins.userId, userId))).returning();
    return margin;
  }
  async deleteSpendingMargin(tripId, userId) {
    const result = await db.delete(spendingMargins).where(and(eq(spendingMargins.tripId, tripId), eq(spendingMargins.userId, userId))).returning({ id: spendingMargins.id });
    return result.length > 0;
  }
  // Itinerary methods
  async getItineraryDays(tripId) {
    const days = await db.select().from(itineraryDays).where(eq(itineraryDays.tripId, tripId)).orderBy(itineraryDays.date);
    const decryptedDays = [];
    for (const day of days) {
      if (day.isEncrypted) {
        try {
          const decryptedDay = { ...day, title: day.title };
          decryptedDays.push(decryptedDay);
        } catch (error) {
          console.error("Day decryption error:", error);
          decryptedDays.push({ ...day, title: "[Title could not be decrypted]", isEncrypted: false });
        }
      } else {
        decryptedDays.push(day);
      }
    }
    return decryptedDays;
  }
  async getItineraryDay(id) {
    const [day] = await db.select().from(itineraryDays).where(eq(itineraryDays.id, id));
    if (!day) return void 0;
    if (day.isEncrypted) {
      try {
        return { ...day, title: day.title };
      } catch (error) {
        console.error("Day decryption error:", error);
        return { ...day, title: "[Title could not be decrypted]", isEncrypted: false };
      }
    }
    return day;
  }
  async createItineraryDay(insertDay) {
    const [day] = await db.insert(itineraryDays).values({
      ...insertDay,
      isEncrypted: true
    }).returning();
    await this.createActivity({
      tripId: insertDay.tripId,
      userId: insertDay.createdBy,
      activityType: "itinerary_day_created",
      activityData: {
        dayTitle: insertDay.title,
        date: insertDay.date
      }
    });
    return day;
  }
  async updateItineraryDay(id, updates) {
    const [updatedDay] = await db.update(itineraryDays).set(updates).where(eq(itineraryDays.id, id)).returning();
    return updatedDay;
  }
  async deleteItineraryDay(id) {
    await db.delete(itineraryActivities).where(eq(itineraryActivities.dayId, id));
    const result = await db.delete(itineraryDays).where(eq(itineraryDays.id, id)).returning({ id: itineraryDays.id });
    return result.length > 0;
  }
  async deleteAllItineraryDays(tripId) {
    await db.delete(itineraryActivities).where(eq(itineraryActivities.tripId, tripId));
    const result = await db.delete(itineraryDays).where(eq(itineraryDays.tripId, tripId)).returning({ id: itineraryDays.id });
    return result.length > 0;
  }
  async getItineraryActivities(dayId, tripId) {
    let query = db.select().from(itineraryActivities);
    if (dayId) {
      query = query.where(and(
        eq(itineraryActivities.dayId, dayId),
        eq(itineraryActivities.isSuggestion, false)
      ));
    } else if (tripId) {
      query = query.where(and(
        eq(itineraryActivities.tripId, tripId),
        eq(itineraryActivities.isSuggestion, false)
      ));
    } else {
      query = query.where(eq(itineraryActivities.isSuggestion, false));
    }
    const activities2 = await query.orderBy(itineraryActivities.sortOrder);
    const decryptedActivities = [];
    for (const activity of activities2) {
      if (activity.isEncrypted) {
        try {
          decryptedActivities.push({ ...activity });
        } catch (error) {
          console.error("Activity decryption error:", error);
          decryptedActivities.push({
            ...activity,
            title: "[Title could not be decrypted]",
            description: "[Description could not be decrypted]",
            isEncrypted: false
          });
        }
      } else {
        decryptedActivities.push(activity);
      }
    }
    return decryptedActivities;
  }
  async getItineraryActivity(id) {
    const [activity] = await db.select().from(itineraryActivities).where(eq(itineraryActivities.id, id));
    if (!activity) return void 0;
    if (activity.isEncrypted) {
      try {
        return { ...activity };
      } catch (error) {
        console.error("Activity decryption error:", error);
        return {
          ...activity,
          title: "[Title could not be decrypted]",
          description: "[Description could not be decrypted]",
          isEncrypted: false
        };
      }
    }
    return activity;
  }
  async createItineraryActivity(insertActivity) {
    const [activity] = await db.insert(itineraryActivities).values({
      ...insertActivity,
      isEncrypted: true
    }).returning();
    await this.createActivity({
      tripId: insertActivity.tripId,
      userId: insertActivity.createdBy,
      activityType: "itinerary_activity_added",
      activityData: {
        activityTitle: insertActivity.title,
        category: insertActivity.category
      }
    });
    return activity;
  }
  async updateItineraryActivity(id, updates) {
    const { createdAt, updatedAt, ...safeUpdates } = updates;
    const processedUpdates = {
      ...safeUpdates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    console.log("Updating itinerary activity with data:", processedUpdates);
    const [updatedActivity] = await db.update(itineraryActivities).set(processedUpdates).where(eq(itineraryActivities.id, id)).returning();
    return updatedActivity;
  }
  async deleteItineraryActivity(id) {
    console.log(`Storage: Deleting itinerary activity with ID ${id}`);
    const votesDeleted = await db.delete(itineraryActivityVotes).where(eq(itineraryActivityVotes.activityId, id)).returning({ id: itineraryActivityVotes.id });
    console.log(`Storage: Deleted ${votesDeleted.length} votes for activity ${id}`);
    const result = await db.delete(itineraryActivities).where(eq(itineraryActivities.id, id)).returning({ id: itineraryActivities.id });
    console.log(`Storage: Delete query returned ${result.length} rows for activity ${id}`);
    return result.length > 0;
  }
  async deleteAllItineraryActivities(tripId) {
    const activities2 = await this.getItineraryActivities(void 0, tripId);
    const activityIds = activities2.map((a) => a.id);
    if (activityIds.length > 0) {
      for (const activityId of activityIds) {
        await db.delete(itineraryActivityVotes).where(eq(itineraryActivityVotes.activityId, activityId));
      }
    }
    const result = await db.delete(itineraryActivities).where(eq(itineraryActivities.tripId, tripId)).returning({ id: itineraryActivities.id });
    return result.length > 0;
  }
  async getItineraryActivityVotes(activityId) {
    const votes = await db.select().from(itineraryActivityVotes).where(eq(itineraryActivityVotes.activityId, activityId));
    return votes;
  }
  async createItineraryActivityVote(insertVote) {
    const [vote] = await db.insert(itineraryActivityVotes).values(insertVote).onConflictDoUpdate({
      target: [itineraryActivityVotes.activityId, itineraryActivityVotes.userId],
      set: {
        vote: insertVote.vote,
        createdAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return vote;
  }
  async updateItineraryActivityVote(id, updates) {
    const [updatedVote] = await db.update(itineraryActivityVotes).set(updates).where(eq(itineraryActivityVotes.id, id)).returning();
    return updatedVote;
  }
  async deleteItineraryActivityVote(activityId, userId) {
    const result = await db.delete(itineraryActivityVotes).where(and(
      eq(itineraryActivityVotes.activityId, activityId),
      eq(itineraryActivityVotes.userId, userId)
    )).returning({ id: itineraryActivityVotes.id });
    return result.length > 0;
  }
  // Collaborative suggestion methods
  async getSuggestedActivities(tripId) {
    const activities2 = await db.select().from(itineraryActivities).where(and(
      eq(itineraryActivities.tripId, tripId),
      eq(itineraryActivities.isSuggestion, true),
      eq(itineraryActivities.isApproved, false)
    )).orderBy(itineraryActivities.createdAt);
    const decryptedActivities = [];
    for (const activity of activities2) {
      if (activity.isEncrypted) {
        try {
          decryptedActivities.push(activity);
        } catch (error) {
          console.error("Activity decryption error:", error);
          decryptedActivities.push({
            ...activity,
            title: "[Title could not be decrypted]",
            description: "[Description could not be decrypted]",
            isEncrypted: false
          });
        }
      } else {
        decryptedActivities.push(activity);
      }
    }
    return decryptedActivities;
  }
  async approveActivitySuggestion(activityId, userId) {
    try {
      const [activity] = await db.update(itineraryActivities).set({
        isSuggestion: false,
        // Convert to regular itinerary item
        isApproved: true,
        approvedBy: userId,
        approvedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(itineraryActivities.id, activityId)).returning();
      return activity;
    } catch (error) {
      console.error("Error approving activity suggestion:", error);
      return void 0;
    }
  }
  async rejectActivitySuggestion(activityId, userId) {
    try {
      const [activity] = await db.update(itineraryActivities).set({
        isApproved: false,
        rejectedBy: userId,
        rejectedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(itineraryActivities.id, activityId)).returning();
      return activity;
    } catch (error) {
      console.error("Error rejecting activity suggestion:", error);
      return void 0;
    }
  }
  async deleteActivitySuggestion(activityId) {
    try {
      await db.delete(itineraryActivityVotes).where(eq(itineraryActivityVotes.activityId, activityId));
      const result = await db.delete(itineraryActivities).where(eq(itineraryActivities.id, activityId)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting activity suggestion:", error);
      return false;
    }
  }
  async updateActivitySuggestion(activityId, updates) {
    try {
      const [activity] = await db.update(itineraryActivities).set({
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(itineraryActivities.id, activityId)).returning();
      return activity;
    } catch (error) {
      console.error("Error updating activity suggestion:", error);
      return void 0;
    }
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { nanoid } from "nanoid";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt as scrypt2, randomBytes as randomBytes3, timingSafeEqual as timingSafeEqual2 } from "crypto";
import { promisify as promisify2 } from "util";
import connectPg from "connect-pg-simple";

// server/emailService.ts
import nodemailer from "nodemailer";
var EmailService = class _EmailService {
  static instance;
  transporter;
  constructor() {
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: smtpPort,
      secure: smtpPort === 465,
      // true for 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 1e4,
      // 10 seconds
      greetingTimeout: 5e3,
      // 5 seconds
      socketTimeout: 1e4
      // 10 seconds
    });
    this.verifyConnection();
  }
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("\u2713 SMTP connection verified successfully");
    } catch (error) {
      console.log("\u26A0 SMTP connection failed, will use fallback simulation");
      console.log(`   Host: ${process.env.SMTP_HOST || "smtp.gmail.com"}`);
      console.log(`   Port: ${process.env.SMTP_PORT || "587"}`);
      console.log(`   Error: ${error.message}`);
      if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
        console.log("   Suggestion: Check if SMTP_PORT is correct (should be 587 for Gmail STARTTLS)");
      }
    }
  }
  static getInstance() {
    if (!_EmailService.instance) {
      _EmailService.instance = new _EmailService();
    }
    return _EmailService.instance;
  }
  /**
   * Send password reset email using NodeMailer
   */
  async sendPasswordResetEmail(email, resetCode, userName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Password Reset Code - TripMate",
      text: this.generatePasswordResetText(resetCode, userName),
      html: this.generatePasswordResetHTML(resetCode, userName)
    };
    return this.sendEmail(mailOptions);
  }
  /**
   * Send email using NodeMailer with timeout handling
   */
  async sendEmail(mailOptions) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Email sending timeout")), 8e3);
      });
      const info = await Promise.race([
        this.transporter.sendMail(mailOptions),
        timeoutPromise
      ]);
      console.log("\n=== EMAIL SENT SUCCESSFULLY ===");
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Message ID: ${info.messageId}`);
      console.log("===============================\n");
      return true;
    } catch (error) {
      console.error("Error sending email via SMTP:", error.message);
      console.log("\n=== FALLING BACK TO EMAIL SIMULATION ===");
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log("Content:");
      console.log(mailOptions.text);
      console.log("==========================================\n");
      return true;
    }
  }
  /**
   * Generate plain text email content
   */
  generatePasswordResetText(resetCode, userName) {
    return `
Hello ${userName},

You requested a password reset for your TripMate account.

Your password reset code is: ${resetCode}

This code will expire in 1 hour. Enter this code on the password reset page to create a new password.

If you didn't request this password reset, please ignore this email. Your account remains secure.

Best regards,
The TripMate Team
    `.trim();
  }
  /**
   * Generate HTML email content
   */
  generatePasswordResetHTML(resetCode, userName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset - TripMate</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .reset-code { background: #e8f4f8; border: 2px solid #0066cc; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .code { font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 4px; }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TripMate Password Reset</h1>
    </div>
    <div class="content">
      <h2>Hello ${userName},</h2>
      <p>You requested a password reset for your TripMate account.</p>
      
      <div class="reset-code">
        <p><strong>Your password reset code is:</strong></p>
        <div class="code">${resetCode}</div>
        <p><small>This code will expire in 1 hour</small></p>
      </div>
      
      <p>Enter this code on the password reset page to create a new password.</p>
      <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>The TripMate Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
  /**
   * Send welcome email for new registrations
   */
  async sendWelcomeEmail(email, userName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Welcome to TripMate!",
      text: `Welcome to TripMate, ${userName}! Start planning amazing group trips today.`,
      html: `<h1>Welcome to TripMate!</h1><p>Hello ${userName}, welcome to TripMate! Start planning amazing group trips today.</p>`
    };
    return this.sendEmail(mailOptions);
  }
};

// server/auth.ts
var scryptAsync = promisify2(scrypt2);
async function hashPassword(password) {
  const salt = randomBytes3(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  if (!stored || !stored.includes(".")) {
    return false;
  }
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual2(hashedBuf, suppliedBuf);
}
var PostgresSessionStore = connectPg(session2);
var sessionStore = new PostgresSessionStore({
  pool,
  createTableIfMissing: true
});
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "tripmate-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 1e3 * 60 * 60 * 24 * 7,
      // 1 week
      secure: process.env.NODE_ENV === "production",
      // Use secure cookies in production
      sameSite: "lax"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password, displayName, email } = req.body;
      if (!username || !password || !displayName || !email) {
        return res.status(400).json({ message: "Missing required fields: Name, Email, Username, and Password are all required" });
      }
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email address already in use" });
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        displayName,
        email
      });
      const userResponse = { ...user, password: void 0 };
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Registration failed", error: errorMessage });
    }
  });
  app2.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const userResponse = { ...user, password: void 0 };
        return res.status(200).json(userResponse);
      });
    })(req, res, next);
  });
  app2.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userResponse = { ...req.user, password: void 0 };
    res.json(userResponse);
  });
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(200).json({
          message: "If an account with that email exists, a password reset code has been sent to your email"
        });
      }
      const resetToken = await storage.createPasswordResetToken(user.id);
      const emailService = EmailService.getInstance();
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email || email,
        resetToken.token,
        user.displayName
      );
      if (emailSent) {
        res.status(200).json({
          message: "A password reset code has been sent to your email address"
        });
      } else {
        res.status(500).json({
          message: "Failed to send password reset email. Please try again later."
        });
      }
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });
      await storage.markTokenAsUsed(resetToken.id);
      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Error in reset password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  app2.post("/api/auth/change-password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Both current and new password are required" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(req.user.id, { password: hashedPassword });
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
  app2.post("/api/auth/change-username", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { newUsername, password } = req.body;
      if (!newUsername || !password) {
        return res.status(400).json({ message: "Both username and password are required" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const existingUser = await storage.getUserByUsername(newUsername);
      if (existingUser) {
        return res.status(400).json({ message: "Username is already taken" });
      }
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Password is incorrect" });
      }
      const updatedUser = await storage.updateUser(req.user.id, { username: newUsername });
      const userResponse = { ...updatedUser, password: void 0 };
      req.login(updatedUser, (err) => {
        if (err) {
          console.error("Error updating session:", err);
          return res.status(500).json({ message: "Failed to update session" });
        }
        res.status(200).json({ message: "Username changed successfully", user: userResponse });
      });
    } catch (error) {
      console.error("Error changing username:", error);
      res.status(500).json({ message: "Failed to change username" });
    }
  });
  app2.use("/api/trips*", (req, res, next) => {
    if (req.method === "GET" && req.query.userId) {
      return next();
    }
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  });
}

// server/routes.ts
import { WebSocketServer, WebSocket } from "ws";

// server/fileUpload.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
var uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
var storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
var fileFilter = (req, file, cb) => {
  cb(null, true);
};
var upload = multer({
  storage: storage2,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
    // 100MB limit for high-quality files
    fieldNameSize: 200,
    fieldSize: 1024 * 1024
    // 1MB for other fields
  }
});
function getFileCategory(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "document";
  if (mimeType.includes("word") || mimeType.includes("document")) return "document";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "presentation";
  if (mimeType.includes("text/")) return "text";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "archive";
  return "file";
}
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
function generateFileUrl(filename) {
  return `/uploads/${filename}`;
}
function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 100MB." });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ error: "Unexpected file field." });
    }
    return res.status(400).json({ error: `Upload error: ${error.message}` });
  }
  if (error) {
    return res.status(500).json({ error: "File upload failed." });
  }
  next();
}

// server/routes.ts
import path2 from "path";
import express from "express";
import fs2 from "fs";

// server/aiService.ts
import OpenAI from "openai";
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
var AIItineraryService = class {
  async generateItinerarySuggestions(request) {
    try {
      const prompt = this.buildItineraryPrompt(request);
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert travel planner. Create detailed, realistic itineraries based on the user's preferences. Consider travel time, opening hours, local customs, and practical logistics. Always provide specific locations and realistic timing. Respond with JSON only in the exact format specified.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });
      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.itinerary || [];
    } catch (error) {
      console.error("Error generating itinerary suggestions:", error);
      throw new Error("Failed to generate itinerary suggestions. Please try again later.");
    }
  }
  async generateActivitySuggestions(destination, tripType, existingActivities = []) {
    try {
      const prompt = `Generate 6 unique activity suggestions for a ${tripType} trip to ${destination}.
      
      ${existingActivities.length > 0 ? `Avoid suggesting activities similar to these existing ones: ${existingActivities.join(", ")}` : ""}
      
      Focus on diverse activities that showcase the best of ${destination}. Include a mix of categories like sightseeing, dining, culture, adventure, and relaxation.
      
      Respond with a JSON object containing an "activities" array. Each activity should have:
      - title (string): Short, engaging name
      - description (string): Detailed description of what to expect
      - category (string): One of: sightseeing, dining, culture, adventure, relaxation, shopping, nightlife
      - estimatedDuration (string): How long it typically takes (e.g., "2-3 hours")
      - estimatedCost (number): Approximate cost per person in USD
      - location (string): Specific location or area
      - bestTimeOfDay (string): morning, afternoon, evening, or night
      - difficulty (string): easy, moderate, or challenging
      - groupSize (string): ideal group size
      - tips (string): Helpful tips or things to know`;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.8
      });
      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.activities || [];
    } catch (error) {
      console.error("Error generating activity suggestions:", error);
      throw new Error("Failed to generate activity suggestions. Please try again later.");
    }
  }
  buildItineraryPrompt(request) {
    const days = this.calculateDays(request.startDate, request.endDate);
    const existingInfo = request.existingActivities?.length ? `Consider these existing activities: ${request.existingActivities.map((a) => `${a.title} (${a.category}) on ${a.date}`).join(", ")}. ` : "";
    return `Create a ${days}-day itinerary for a ${request.tripType} trip to ${request.destination}.
    
    Trip Details:
    - Destination: ${request.destination}
    - Trip Type: ${request.tripType}
    - Start Date: ${request.startDate}
    - End Date: ${request.endDate}
    - Group Size: ${request.groupSize || "Not specified"}
    - Budget: ${request.budget || "Moderate"}
    - Interests: ${request.interests?.join(", ") || "General sightseeing"}
    
    ${existingInfo}
    
    Create a realistic day-by-day itinerary that considers:
    - Travel time between locations
    - Operating hours of attractions
    - Meal times and local dining customs
    - Weather and seasonal factors
    - Group dynamics and energy levels
    - Mix of must-see attractions and hidden gems
    
    Respond with a JSON object containing an "itinerary" array. Each day should have:
    - date (string): YYYY-MM-DD format
    - title (string): Theme or focus of the day
    - activities (array): Activities for that day
    
    Each activity should include:
    - title (string): Activity name
    - description (string): What you'll do and see
    - startTime (string): HH:MM format
    - endTime (string): HH:MM format  
    - location (string): Specific location
    - category (string): sightseeing, dining, culture, adventure, relaxation, shopping, transport
    - estimatedCost (number): Cost per person in USD
    
    Make it practical and actionable with specific times and locations.`;
  }
  calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1e3 * 60 * 60 * 24)) + 1;
  }
};
var aiItineraryService = new AIItineraryService();

// server/routes.ts
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  setupAuth(app2);
  app2.get("/api/files/:tripId/:filename", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const filename = req.params.filename;
      const tripMembers2 = await storage.getTripMembers(tripId);
      const isMember = tripMembers2.some((member) => member.userId === req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const messages = await storage.getChatMessages(tripId);
      const messageWithFile = messages.find(
        (msg) => msg.hasAttachment && msg.attachmentUrl && msg.attachmentUrl.includes(filename)
      );
      if (!messageWithFile || !messageWithFile.isFileEncrypted) {
        const filePath2 = path2.join(process.cwd(), "uploads", filename);
        if (fs2.existsSync(filePath2)) {
          return res.sendFile(filePath2);
        } else {
          return res.status(404).json({ message: "File not found" });
        }
      }
      const filePath = path2.join(process.cwd(), "uploads", filename);
      const encryptedData = await fs2.promises.readFile(filePath);
      const decryptedFileData = await decryptFile(
        encryptedData.toString("base64"),
        messageWithFile.attachmentName,
        messageWithFile.encryptionSalt,
        messageWithFile.encryptionIv
      );
      res.setHeader("Content-Type", messageWithFile.attachmentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${decryptedFileData.originalFilename}"`);
      res.send(decryptedFileData.fileBuffer);
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });
  app2.use("/uploads", express.static(path2.join(process.cwd(), "uploads")));
  app2.post("/api/trips/:tripId/chat/upload", upload.single("file"), handleUploadError, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const tripMembers2 = await storage.getTripMembers(tripId);
      const isMember = tripMembers2.some((member) => member.userId === req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const file = req.file;
      const fileCategory = getFileCategory(file.mimetype);
      const fileBuffer = await fs2.promises.readFile(file.path);
      const encryptedFileData = await encryptFile(fileBuffer, file.originalname);
      const fileUrl = generateFileUrl(file.filename);
      const messageData = {
        tripId,
        userId: req.user.id,
        message: req.body.message || `Shared a ${fileCategory}`,
        hasAttachment: true,
        attachmentUrl: fileUrl,
        attachmentName: encryptedFileData.encryptedFilename,
        // Store encrypted filename
        attachmentSize: file.size,
        attachmentType: file.mimetype,
        // Store encryption metadata for secure file access
        encryptionSalt: encryptedFileData.salt,
        encryptionIv: encryptedFileData.iv,
        isFileEncrypted: true
      };
      const message = await storage.createChatMessage(messageData);
      const encryptedBuffer = Buffer.from(encryptedFileData.encryptedData, "base64");
      await fs2.promises.writeFile(file.path, encryptedBuffer);
      res.status(200).json({
        message: "File uploaded successfully",
        chatMessage: message,
        fileInfo: {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          type: file.mimetype,
          url: fileUrl,
          category: fileCategory,
          formattedSize: formatFileSize(file.size)
        }
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file", error });
    }
  });
  app2.get("/api/auth/debug", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      session: req.session,
      user: req.user ? { ...req.user, password: "[REDACTED]" } : null
    });
  });
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!req.isAuthenticated() || req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only access your own user data" });
      }
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user", error });
    }
  });
  app2.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (!req.isAuthenticated() || req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const allowedUpdates = ["displayName", "email", "paymentPreference", "avatar", "dateOfBirth"];
      const updates = {};
      allowedUpdates.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field) && req.body[field] !== void 0) {
          if (field === "dateOfBirth" && req.body[field]) {
            const date2 = new Date(req.body[field]);
            Object.defineProperty(updates, field, {
              value: new Date(
                date2.getFullYear(),
                date2.getMonth(),
                date2.getDate()
              ),
              writable: true,
              enumerable: true,
              configurable: true
            });
          } else if (field === "paymentPreference" && req.body[field] === "none") {
            Object.defineProperty(updates, field, {
              value: null,
              writable: true,
              enumerable: true,
              configurable: true
            });
          } else {
            Object.defineProperty(updates, field, {
              value: req.body[field],
              writable: true,
              enumerable: true,
              configurable: true
            });
          }
        }
      });
      const updatedUser = await storage.updateUser(userId, updates);
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user", error });
    }
  });
  app2.get("/api/trips", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      console.log(`Fetching trips for user ID: ${userId}`);
      let trips2 = await storage.getUserTrips(userId);
      const currentDate = /* @__PURE__ */ new Date();
      const tripsToUpdate = [];
      for (const trip of trips2) {
        if (trip.endDate && new Date(trip.endDate) < currentDate && !trip.isPast) {
          console.log(`Trip ${trip.id} (${trip.name}) has ended, marking as past`);
          await storage.markTripAsPast(trip.id);
          tripsToUpdate.push(trip.id);
        }
      }
      if (tripsToUpdate.length > 0) {
        trips2 = await storage.getUserTrips(userId);
      }
      console.log(`Retrieved ${trips2.length} trips for user ${userId}`);
      const processedTrips = trips2;
      res.status(200).json(processedTrips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ message: "Failed to get trips", error });
    }
  });
  app2.get("/api/trips/hidden", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      console.log(`Fetching hidden trips for user ID: ${userId}`);
      const hiddenTrips = await storage.getHiddenTrips(userId);
      console.log(`Retrieved ${hiddenTrips.length} hidden trips for user ${userId}`);
      res.status(200).json(hiddenTrips);
    } catch (error) {
      console.error("Error fetching hidden trips:", error);
      res.status(500).json({ message: "Failed to get hidden trips", error });
    }
  });
  app2.post("/api/trips/:id/hide", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const userId = req.user.id;
      console.log(`Hiding trip ${tripId} for user ${userId}`);
      const success = await storage.hideTrip(tripId, userId);
      if (success) {
        res.status(200).json({ message: "Trip hidden successfully" });
      } else {
        res.status(400).json({ message: "Failed to hide trip" });
      }
    } catch (error) {
      console.error("Error hiding trip:", error);
      res.status(500).json({ message: "Failed to hide trip", error });
    }
  });
  app2.post("/api/trips/:id/unhide", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const userId = req.user.id;
      console.log(`Unhiding trip ${tripId} for user ${userId}`);
      const success = await storage.unhideTrip(tripId, userId);
      if (success) {
        res.status(200).json({ message: "Trip unhidden successfully" });
      } else {
        res.status(400).json({ message: "Failed to unhide trip" });
      }
    } catch (error) {
      console.error("Error unhiding trip:", error);
      res.status(500).json({ message: "Failed to unhide trip", error });
    }
  });
  app2.post("/api/trips", async (req, res) => {
    try {
      let tripData = {
        ...req.body,
        inviteCode: nanoid(8)
      };
      console.log("Raw date values received:", {
        startDate: tripData.startDate,
        endDate: tripData.endDate
      });
      if (tripData.startDate) {
        const startDate = new Date(tripData.startDate);
        console.log("Parsed start date:", startDate);
      }
      if (tripData.endDate) {
        const endDate = new Date(tripData.endDate);
        console.log("Parsed end date:", endDate);
      }
      console.log("Creating trip with data:", JSON.stringify(tripData));
      try {
        const parsedTrip = insertTripSchema.parse(tripData);
        const trip = await storage.createTrip(parsedTrip);
        res.status(201).json(trip);
      } catch (parseError) {
        console.error("Trip validation error:", parseError);
        return res.status(400).json({
          message: "Invalid trip data",
          error: parseError
        });
      }
    } catch (error) {
      console.error("Trip creation error:", error);
      res.status(500).json({
        message: "Failed to create trip",
        error: error.message || String(error)
      });
    }
  });
  app2.get("/api/trips/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      console.log(`Trip ${tripId} data debug:`);
      console.log(`- Original trip:`, JSON.stringify(trip, null, 2));
      console.log(`- Current user:`, JSON.stringify(req.user, null, 2));
      console.log(`- Trip createdById:`, trip.createdById);
      console.log(`- Trip created_by:`, trip.created_by);
      console.log(`- User ID:`, req.user.id);
      console.log(`- Creator match:`, Number(trip.createdById || trip.created_by) === Number(req.user.id));
      console.log(`Trip ${tripId} date objects in database:`, {
        startDate: trip.startDate,
        endDate: trip.endDate,
        startDateType: trip.startDate ? typeof trip.startDate : "null",
        endDateType: trip.endDate ? typeof trip.endDate : "null"
      });
      const startDate = trip.startDate ? new Date(trip.startDate) : null;
      const endDate = trip.endDate ? new Date(trip.endDate) : null;
      console.log(`Trip ${tripId} parsed date objects:`, {
        startDate,
        endDate,
        startDateType: startDate ? typeof startDate : "null",
        endDateType: endDate ? typeof endDate : "null"
      });
      const tripWithCorrectCasing = {
        ...trip,
        id: trip.id,
        name: trip.name || "",
        location: trip.location || null,
        description: trip.description || null,
        // Make sure to pass the date objects, not null
        startDate,
        endDate,
        inviteCode: trip.inviteCode || "",
        tripType: trip.tripType || null,
        // Force consistent property names and convert to the right type
        createdById: Number(trip.createdById || trip.created_by || 0),
        isPast: Boolean(trip.isPast || trip.is_past || false),
        createdAt: trip.createdAt || /* @__PURE__ */ new Date()
      };
      console.log(`Transformed trip:`, JSON.stringify(tripWithCorrectCasing, null, 2));
      res.status(200).json(tripWithCorrectCasing);
    } catch (error) {
      res.status(500).json({ message: "Failed to get trip", error });
    }
  });
  app2.patch("/api/trips/:id/mark-past", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const creatorId = trip.createdById || trip.created_by;
      if (Number(creatorId) !== Number(req.user.id)) {
        console.log("Permission denied - Trip creator check failed:");
        console.log("- Trip:", JSON.stringify(trip));
        console.log("- User ID:", req.user.id);
        console.log("- User ID Type:", typeof req.user.id);
        console.log("- Trip creator field:", creatorId);
        console.log("- Trip creator field type:", typeof creatorId);
        console.log("- Match result:", Number(creatorId) === Number(req.user.id));
        return res.status(403).json({ message: "Only trip creator can mark trips as past" });
      }
      const updatedTrip = await storage.markTripAsPast(tripId);
      if (!updatedTrip) {
        return res.status(500).json({ message: "Failed to mark trip as past" });
      }
      res.status(200).json({
        message: "Trip marked as past successfully",
        trip: updatedTrip
      });
    } catch (error) {
      console.error("Error marking trip as past:", error);
      res.status(500).json({ message: "Failed to mark trip as past", error });
    }
  });
  app2.patch("/api/trips/:id/unmark-past", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const creatorId = trip.createdById || trip.created_by;
      if (Number(creatorId) !== Number(req.user.id)) {
        console.log("Permission denied - Trip creator check failed:");
        console.log("- Trip:", JSON.stringify(trip));
        console.log("- User ID:", req.user.id);
        console.log("- Trip creator field:", creatorId);
        return res.status(403).json({ message: "Only trip creator can unmark trips as past" });
      }
      const updatedTrip = await storage.unmarkTripAsPast(tripId);
      if (!updatedTrip) {
        return res.status(500).json({ message: "Failed to unmark trip as past" });
      }
      res.status(200).json({
        message: "Trip restored to active successfully",
        trip: updatedTrip
      });
    } catch (error) {
      console.error("Error unmarking trip as past:", error);
      res.status(500).json({ message: "Failed to restore trip to active", error });
    }
  });
  app2.patch("/api/trips/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const creatorId = trip.createdById || trip.created_by;
      if (Number(creatorId) !== Number(req.user.id)) {
        console.log("Permission denied - Trip creator check failed:");
        console.log("- User ID:", req.user.id);
        console.log("- Trip creator field:", creatorId);
        return res.status(403).json({ message: "Only trip creator can update the trip" });
      }
      const allowedUpdates = ["name", "description", "location", "startDate", "endDate", "tripType"];
      const updates = {};
      allowedUpdates.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field) && req.body[field] !== void 0) {
          if (field === "startDate" || field === "endDate") {
            if (req.body[field]) {
              const date2 = new Date(req.body[field]);
              Object.defineProperty(updates, field, {
                value: new Date(
                  date2.getFullYear(),
                  date2.getMonth(),
                  date2.getDate()
                ),
                writable: true,
                enumerable: true,
                configurable: true
              });
            } else {
              Object.defineProperty(updates, field, {
                value: null,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          } else {
            Object.defineProperty(updates, field, {
              value: req.body[field],
              writable: true,
              enumerable: true,
              configurable: true
            });
          }
        }
      });
      console.log(`Updating trip ${tripId} with:`, updates);
      console.log(`Before update - trip dates:`, {
        id: trip.id,
        startDate: trip.startDate,
        endDate: trip.endDate
      });
      const updatedTrip = await storage.updateTrip(tripId, updates);
      if (!updatedTrip) {
        return res.status(500).json({ message: "Failed to update trip" });
      }
      console.log(`After update - trip dates:`, {
        id: updatedTrip.id,
        startDate: updatedTrip.startDate,
        endDate: updatedTrip.endDate
      });
      const verifiedTrip = await storage.getTrip(tripId);
      console.log(`Verification from DB - trip dates:`, {
        id: verifiedTrip?.id,
        startDate: verifiedTrip?.startDate,
        endDate: verifiedTrip?.endDate
      });
      if (updates.startDate !== void 0 || updates.endDate !== void 0) {
        await storage.createActivity({
          tripId,
          userId: req.user.id,
          activityType: "trip_dates_updated",
          activityData: {
            tripName: trip.name,
            startDate: updates.startDate,
            endDate: updates.endDate
          }
        });
      }
      res.status(200).json({
        message: "Trip updated successfully",
        trip: verifiedTrip || updatedTrip
        // Fallback to updatedTrip if verification failed
      });
    } catch (error) {
      console.error("Error updating trip:", error);
      let errorMessage = "Failed to update trip";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      res.status(500).json({ message: errorMessage });
    }
  });
  app2.delete("/api/trips/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const creatorId = trip.createdById || trip.created_by;
      if (Number(creatorId) !== Number(req.user.id)) {
        console.log("Permission denied - Trip creator check failed:");
        console.log("- Trip:", JSON.stringify(trip));
        console.log("- User ID:", req.user.id);
        console.log("- User ID Type:", typeof req.user.id);
        console.log("- Trip creator field:", creatorId);
        console.log("- Trip creator field type:", typeof creatorId);
        console.log("- Match result:", Number(creatorId) === Number(req.user.id));
        return res.status(403).json({ message: "Only trip creator can delete the trip" });
      }
      await storage.createActivity({
        tripId,
        userId: req.user.id,
        activityType: "trip_deleted",
        activityData: { tripName: trip.name }
      });
      const success = await storage.deleteTrip(tripId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete trip" });
      }
      res.status(200).json({ message: "Trip deleted successfully" });
    } catch (error) {
      console.error("Error deleting trip:", error);
      res.status(500).json({ message: "Failed to delete trip", error });
    }
  });
  app2.post("/api/trips/join", async (req, res) => {
    try {
      const { inviteCode, userId } = req.body;
      console.log(`Join request - Invite code: ${inviteCode}, User ID: ${userId}`);
      if (!inviteCode || !userId) {
        return res.status(400).json({ message: "Invite code and user ID required" });
      }
      const trip = await storage.getTripByInviteCode(inviteCode);
      if (!trip) {
        console.log(`Trip not found for invite code: ${inviteCode}`);
        return res.status(404).json({ message: "Trip not found with this invite code" });
      }
      console.log(`Trip found with ID: ${trip.id}, Name: ${trip.name}`);
      try {
        const existingMember = await storage.getTripMember(trip.id, userId);
        if (existingMember) {
          console.log(`User ${userId} is already a member of trip ${trip.id}`);
          return res.status(200).json({
            message: "You're already a member of this trip",
            tripId: trip.id
          });
        }
        const memberData = insertTripMemberSchema.parse({
          tripId: trip.id,
          userId
        });
        const member = await storage.addTripMember(memberData);
        console.log(`User ${userId} successfully joined trip ${trip.id}`);
        res.status(201).json({ message: "Joined trip successfully", tripId: trip.id });
      } catch (memberError) {
        console.error("Error adding member to trip:", memberError);
        res.status(500).json({ message: "Failed to add you to the trip", error: memberError.message });
      }
    } catch (error) {
      console.error("Error joining trip:", error);
      res.status(400).json({ message: "Failed to join trip", error: error.message });
    }
  });
  app2.get("/api/trips/:tripId/members", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const members = await storage.getTripMembers(tripId);
      const membersWithDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          if (!user) return member;
          const { password, ...userDetails } = user;
          return {
            ...member,
            user: userDetails
          };
        })
      );
      res.status(200).json(membersWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to get trip members", error });
    }
  });
  app2.post("/api/trips/:tripId/leave", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const userId = req.user.id;
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.createdById === userId) {
        return res.status(400).json({
          message: "Trip owner cannot leave the trip. You can delete the trip instead."
        });
      }
      const member = await storage.getTripMember(tripId, userId);
      if (!member) {
        return res.status(400).json({ message: "You are not a member of this trip" });
      }
      const removed = await storage.removeTripMember(tripId, userId);
      if (removed) {
        res.status(200).json({ message: "Successfully left the trip" });
      } else {
        res.status(500).json({ message: "Failed to leave trip" });
      }
    } catch (error) {
      console.error("Error leaving trip:", error);
      res.status(500).json({ message: "Failed to leave trip", error });
    }
  });
  app2.delete("/api/trips/:tripId/members/:userId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const memberUserId = parseInt(req.params.userId);
      const currentUserId = req.user.id;
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.createdById !== currentUserId) {
        return res.status(403).json({
          message: "Only the trip owner can remove members"
        });
      }
      if (memberUserId === currentUserId) {
        return res.status(400).json({
          message: "Trip owner cannot remove themselves. Delete the trip instead."
        });
      }
      const member = await storage.getTripMember(tripId, memberUserId);
      if (!member) {
        return res.status(400).json({ message: "User is not a member of this trip" });
      }
      const removed = await storage.removeTripMember(tripId, memberUserId);
      if (removed) {
        res.status(200).json({ message: "Member removed successfully" });
      } else {
        res.status(500).json({ message: "Failed to remove member" });
      }
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member", error });
    }
  });
  app2.post("/api/trips/:tripId/restore", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const userId = req.user.id;
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const creatorId = trip.createdById || trip.created_by;
      const isTripOwner = Number(creatorId) === Number(userId);
      const member = await storage.getTripMember(tripId, userId);
      if (!isTripOwner && !member) {
        return res.status(403).json({ message: "Only trip members can restore trips" });
      }
      if (!trip.isPast) {
        return res.status(400).json({ message: "Trip is already active" });
      }
      const restoredTrip = await storage.unmarkTripAsPast(tripId);
      if (restoredTrip) {
        res.status(200).json({
          message: "Trip restored to active status successfully",
          trip: restoredTrip
        });
      } else {
        res.status(500).json({ message: "Failed to restore trip" });
      }
    } catch (error) {
      console.error("Error restoring trip:", error);
      res.status(500).json({ message: "Failed to restore trip", error });
    }
  });
  app2.post("/api/trips/:id/invite-expiration", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const { expirationMinutes } = req.body;
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const creatorId = trip.createdById || trip.created_by;
      if (Number(creatorId) !== Number(req.user.id)) {
        return res.status(403).json({ message: "Only trip owner can set invite expiration" });
      }
      let expiresAt = null;
      if (expirationMinutes && expirationMinutes > 0) {
        expiresAt = /* @__PURE__ */ new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
      }
      const updatedTrip = await storage.updateInviteCodeExpiration(tripId, expiresAt);
      if (updatedTrip) {
        res.status(200).json({
          message: "Invite code expiration updated successfully",
          trip: updatedTrip,
          expiresAt
        });
      } else {
        res.status(500).json({ message: "Failed to update invite code expiration" });
      }
    } catch (error) {
      console.error("Error updating invite code expiration:", error);
      res.status(500).json({ message: "Failed to update invite code expiration", error });
    }
  });
  app2.post("/api/trips/:id/regenerate-invite", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const { expirationMinutes } = req.body;
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const creatorId = trip.createdById || trip.created_by;
      if (Number(creatorId) !== Number(req.user.id)) {
        return res.status(403).json({ message: "Only trip owner can regenerate invite code" });
      }
      let expiresAt = null;
      if (expirationMinutes && expirationMinutes > 0) {
        expiresAt = /* @__PURE__ */ new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
      }
      const updatedTrip = await storage.regenerateInviteCode(tripId, expiresAt);
      if (updatedTrip) {
        res.status(200).json({
          message: "Invite code regenerated successfully",
          trip: updatedTrip,
          newInviteCode: updatedTrip.inviteCode,
          expiresAt
        });
      } else {
        res.status(500).json({ message: "Failed to regenerate invite code" });
      }
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      res.status(500).json({ message: "Failed to regenerate invite code", error });
    }
  });
  app2.post("/api/trips/:id/members/:userId/admin", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const { isAdmin } = req.body;
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const creatorId = trip.createdById || trip.created_by;
      const isOwner = Number(creatorId) === Number(req.user.id);
      const currentUserMember = await storage.getTripMember(tripId, req.user.id);
      const isCurrentUserAdmin = currentUserMember?.isAdmin === true;
      if (!isOwner && !isCurrentUserAdmin) {
        return res.status(403).json({ message: "Only trip owners and admins can manage admin roles" });
      }
      if (Number(userId) === Number(creatorId)) {
        return res.status(400).json({ message: "Cannot change admin status of trip owner" });
      }
      const updatedMember = await storage.setTripMemberAdmin(tripId, userId, isAdmin);
      if (updatedMember) {
        res.json({
          message: `Member ${isAdmin ? "promoted to admin" : "removed from admin"}`,
          member: updatedMember
        });
      } else {
        res.status(500).json({ message: "Failed to update admin status" });
      }
    } catch (error) {
      console.error("Error updating admin status:", error);
      res.status(500).json({ message: "Failed to update admin status" });
    }
  });
  app2.get("/api/trips/:id/admins", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.id);
      const admins = await storage.getTripAdmins(tripId);
      const adminsWithUserDetails = await Promise.all(
        admins.map(async (admin) => {
          const user = await storage.getUser(admin.userId);
          return {
            ...admin,
            user: user ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatar: user.avatar
            } : null
          };
        })
      );
      res.json(adminsWithUserDetails);
    } catch (error) {
      console.error("Error fetching trip admins:", error);
      res.status(500).json({ message: "Failed to fetch trip admins" });
    }
  });
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getItemCategories();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get categories", error });
    }
  });
  app2.get("/api/trips/:tripId/grocery", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const items = await storage.getGroceryItems(tripId);
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to get grocery items", error });
    }
  });
  app2.post("/api/trips/:tripId/grocery", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const userId = req.body.addedBy || 0;
      const itemName = req.body.name;
      const itemData = {
        ...req.body,
        tripId
      };
      const parsedItem = insertGroceryItemSchema.parse(itemData);
      const item = await storage.createGroceryItem(parsedItem);
      await sendNotification(
        tripId,
        userId,
        "grocery_add",
        "New Grocery Item Added",
        `${itemName} has been added to the grocery list`,
        itemName
      );
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid item data", error });
    }
  });
  app2.patch("/api/grocery/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getGroceryItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      const updatedItem = await storage.updateGroceryItem(itemId, req.body);
      const userId = req.body.modifiedBy || item.addedBy || 0;
      const isCompleted = req.body.completed === true;
      const notificationMessage = isCompleted ? `Grocery item '${item.name}' has been marked complete` : `'${item.name}' needs to be collected`;
      await sendNotification(
        item.tripId,
        userId,
        "grocery_update",
        isCompleted ? "Item Completed" : "Item Needs Collection",
        notificationMessage,
        item.name
      );
      res.status(200).json(updatedItem);
    } catch (error) {
      res.status(400).json({ message: "Failed to update item", error });
    }
  });
  app2.delete("/api/grocery/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getGroceryItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      const success = await storage.deleteGroceryItem(itemId);
      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }
      const userId = parseInt(req.query.userId) || item.addedBy || 0;
      await sendNotification(
        item.tripId,
        userId,
        "grocery_delete",
        "Grocery Item Removed",
        `${item.name} has been removed from the grocery list`,
        item.name
      );
      res.status(200).json({ message: "Item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item", error });
    }
  });
  app2.get("/api/trips/:tripId/expenses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const expenses2 = await storage.getExpenses(tripId);
      const expensesWithParticipants = await Promise.all(
        expenses2.map(async (expense) => {
          const participants = await storage.getExpenseParticipants(expense.id);
          return {
            ...expense,
            participants
          };
        })
      );
      res.status(200).json(expensesWithParticipants);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to get expenses", error });
    }
  });
  app2.post("/api/trips/:tripId/expenses", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const { participants, ...expenseData } = req.body;
      const userId = expenseData.paidBy || 0;
      const parsedExpense = insertExpenseSchema.parse({
        ...expenseData,
        tripId
      });
      const expense = await storage.createExpense(parsedExpense);
      if (Array.isArray(participants)) {
        await Promise.all(
          participants.map(
            (userId2) => storage.addExpenseParticipant({
              expenseId: expense.id,
              userId: userId2
            })
          )
        );
      }
      const savedParticipants = await storage.getExpenseParticipants(expense.id);
      await sendNotification(
        tripId,
        userId,
        "expense_add",
        "New Expense Added",
        `New expense: ${expense.description} ($${expense.amount})`,
        expense.description
      );
      res.status(201).json({
        ...expense,
        participants: savedParticipants
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid expense data", error });
    }
  });
  app2.patch("/api/expenses/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const expenseId = parseInt(req.params.id);
      const expense = await storage.getExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      const updatableFields = ["description", "amount", "category", "paidBy"];
      const updates = {};
      for (const field of updatableFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          Object.defineProperty(updates, field, {
            value: req.body[field],
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      if (req.body.participants && Array.isArray(req.body.participants)) {
        const existingParticipants = await storage.getExpenseParticipants(expenseId);
        for (const participant of existingParticipants) {
          await storage.deleteExpenseParticipant(participant.id);
        }
        await Promise.all(
          req.body.participants.map(
            (userId) => storage.addExpenseParticipant({
              expenseId,
              userId
            })
          )
        );
      }
      const updatedExpense = await storage.updateExpense(expenseId, updates);
      if (!updatedExpense) {
        return res.status(500).json({ message: "Failed to update expense" });
      }
      const trip = await storage.getTrip(expense.tripId);
      if (trip) {
        await storage.createActivity({
          tripId: expense.tripId,
          userId: req.user.id,
          activityType: "expense_updated",
          activityData: {
            description: expense.description,
            tripName: trip.name
          }
        });
        await sendNotification(
          expense.tripId,
          req.user.id,
          "expense_update",
          "Expense Updated",
          `Expense updated: ${updatedExpense.description} ($${updatedExpense.amount})`,
          updatedExpense.description
        );
      }
      const participants = await storage.getExpenseParticipants(expenseId);
      res.status(200).json({
        ...updatedExpense,
        participants
      });
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense", error });
    }
  });
  app2.delete("/api/expenses/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const expenseId = parseInt(req.params.id);
      const expense = await storage.getExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      const trip = await storage.getTrip(expense.tripId);
      const success = await storage.deleteExpense(expenseId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete expense" });
      }
      if (trip) {
        await storage.createActivity({
          tripId: expense.tripId,
          userId: req.user.id,
          activityType: "expense_deleted",
          activityData: {
            amount: expense.amount.toString(),
            description: expense.description,
            tripName: trip.name
          }
        });
        await sendNotification(
          expense.tripId,
          req.user.id,
          "expense_delete",
          "Expense Deleted",
          `Expense deleted: ${expense.description} ($${expense.amount})`,
          expense.description
        );
      }
      res.status(200).json({
        message: "Expense deleted successfully",
        success: true
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense", error });
    }
  });
  app2.get("/api/trips/:tripId/packing", async (req, res) => {
    try {
      const startTime = Date.now();
      const tripId = parseInt(req.params.tripId);
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      console.log(`[Performance] Packing items request start for trip ${tripId}, user ${currentUserId}`);
      const items = await storage.getPackingItems(tripId, currentUserId);
      const duration = Date.now() - startTime;
      console.log(`[Performance] Packing items fetched in ${duration}ms - Found ${items.length} items`);
      res.set("Cache-Control", "private, max-age=10");
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to get packing items", error });
    }
  });
  app2.post("/api/trips/:tripId/packing", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const itemName = req.body.name;
      console.log(`Creating packing item "${itemName}" with user ID: ${currentUserId}`);
      const itemData = {
        ...req.body,
        tripId,
        addedBy: currentUserId
        // Override with authenticated user ID
      };
      const parsedItem = insertPackingItemSchema.parse(itemData);
      console.log("Parsed packing item data:", parsedItem);
      const item = await storage.createPackingItem(parsedItem);
      console.log("Created packing item:", item);
      await sendNotification(
        tripId,
        currentUserId,
        "packing_add",
        "New Packing Item Added",
        `${itemName} has been added to the packing list by ${req.user?.displayName || "a user"}`,
        itemName
      );
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid item data", error });
    }
  });
  app2.patch("/api/packing/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getPackingItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      const updatedItem = await storage.updatePackingItem(itemId, req.body);
      const userId = req.body.modifiedBy || item.addedBy || 0;
      const updateType = req.body.packed !== void 0 ? "status" : "details";
      let title = "Packing Item Updated";
      let message;
      if (updateType === "status") {
        const isPacked = req.body.packed === true;
        title = isPacked ? "Item Packed" : "Item Needs Packing";
        message = isPacked ? `Packing item '${item.name}' has been marked complete` : `'${item.name}' needs to be packed`;
      } else {
        message = `${item.name} has been updated`;
      }
      await sendNotification(
        item.tripId,
        userId,
        "packing_update",
        title,
        message,
        item.name
      );
      res.status(200).json(updatedItem);
    } catch (error) {
      res.status(400).json({ message: "Failed to update item", error });
    }
  });
  app2.delete("/api/packing/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getPackingItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      const success = await storage.deletePackingItem(itemId);
      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }
      const userId = parseInt(req.query.userId) || item.addedBy || 0;
      await sendNotification(
        item.tripId,
        userId,
        "packing_delete",
        "Packing Item Removed",
        `${item.name} has been removed from the packing list`,
        item.name
      );
      res.status(200).json({ message: "Item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item", error });
    }
  });
  app2.get("/api/trips/:tripId/chat", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const messages = await storage.getChatMessages(tripId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat messages", error });
    }
  });
  app2.post("/api/trips/:tripId/chat", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const userId = req.body.senderId || 0;
      const messageData = {
        ...req.body,
        tripId
      };
      const parsedMessage = insertChatMessageSchema.parse(messageData);
      const message = await storage.createChatMessage(parsedMessage);
      const user = await storage.getUser(userId);
      const senderName = user ? user.displayName || user.username : `User ${userId}`;
      if (!req.body.isSystem) {
        await sendNotification(
          tripId,
          userId,
          "chat_message",
          "New Message",
          `${senderName}: ${req.body.content.substring(0, 30)}${req.body.content.length > 30 ? "..." : ""}`,
          req.body.content
        );
      }
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data", error });
    }
  });
  app2.get("/api/recent-activities", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId);
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      const userTrips = await storage.getUserTrips(userId);
      if (userTrips.length === 0) {
        return res.status(200).json([]);
      }
      const activitiesPromises = userTrips.map((trip) => storage.getTripActivities(trip.id));
      const activitiesArrays = await Promise.all(activitiesPromises);
      const allActivities = activitiesArrays.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
      res.status(200).json(allActivities);
    } catch (error) {
      console.error("Error fetching all activities:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Failed to get activities", error: errorMessage });
    }
  });
  app2.get("/api/trips/:tripId/activities", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const activities2 = await storage.getTripActivities(tripId);
      res.status(200).json(activities2);
    } catch (error) {
      console.error("Error fetching trip activities:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Failed to get activities", error: errorMessage });
    }
  });
  app2.get("/api/trips/:tripId/spending-margin", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const userId = req.user.id;
      const margin = await storage.getSpendingMargin(tripId, userId);
      res.status(200).json(margin || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to get spending margin", error });
    }
  });
  app2.post("/api/trips/:tripId/spending-margin", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const userId = req.user.id;
      const { budgetLimit, warningThreshold = 0.8 } = req.body;
      if (!budgetLimit || budgetLimit <= 0) {
        return res.status(400).json({ message: "Valid budget limit is required" });
      }
      const margin = await storage.setSpendingMargin(tripId, userId, budgetLimit, warningThreshold);
      await sendNotification(
        tripId,
        userId,
        "budget_set",
        "Budget Limit Set",
        `Personal spending limit set to $${budgetLimit}`,
        "Budget Management"
      );
      res.status(201).json(margin);
    } catch (error) {
      res.status(400).json({ message: "Failed to set spending margin", error });
    }
  });
  app2.patch("/api/trips/:tripId/spending-margin", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const userId = req.user.id;
      const { budgetLimit, warningThreshold = 0.8 } = req.body;
      if (!budgetLimit || budgetLimit <= 0) {
        return res.status(400).json({ message: "Valid budget limit is required" });
      }
      const margin = await storage.updateSpendingMargin(tripId, userId, budgetLimit, warningThreshold);
      await sendNotification(
        tripId,
        userId,
        "budget_update",
        "Budget Limit Updated",
        `Personal spending limit updated to $${budgetLimit}`,
        "Budget Management"
      );
      res.status(200).json(margin);
    } catch (error) {
      res.status(400).json({ message: "Failed to update spending margin", error });
    }
  });
  app2.delete("/api/trips/:tripId/spending-margin", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const userId = req.user.id;
      const success = await storage.deleteSpendingMargin(tripId, userId);
      if (success) {
        await sendNotification(
          tripId,
          userId,
          "budget_remove",
          "Budget Limit Removed",
          "Personal spending limit has been removed",
          "Budget Management"
        );
        res.status(200).json({ message: "Spending margin removed successfully" });
      } else {
        res.status(404).json({ message: "Spending margin not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove spending margin", error });
    }
  });
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/api/ws",
    // Enable ping/pong
    clientTracking: true,
    // Set increased timeout (45 seconds)
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below 10 is recommended for non-binary data
      threshold: 1024,
      // Don't compress small payloads
      concurrencyLimit: 10
      // Limits concurrent compression calls
    }
  });
  const clients = /* @__PURE__ */ new Map();
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws2) => {
      const metadata = clients.get(ws2);
      if (metadata === void 0) {
        clients.set(ws2, { isAlive: true });
        return;
      }
      if (metadata.isAlive === false) {
        console.log(`Terminating non-responsive client: userId=${metadata.userId}, tripId=${metadata.tripId}`);
        clients.delete(ws2);
        try {
          ws2.close();
        } catch (closeError) {
          console.error("Error closing connection:", closeError);
        }
        try {
          if (ws2.readyState !== WebSocket.CLOSED) {
            ws2.terminate();
          }
        } catch (termError) {
          console.error("Error terminating connection:", termError);
        }
        return;
      }
      metadata.isAlive = false;
      clients.set(ws2, metadata);
      try {
        if (ws2.readyState === WebSocket.OPEN) {
          ws2.ping();
        }
      } catch (error) {
        console.error("Error sending ping:", error);
        clients.delete(ws2);
        try {
          ws2.terminate();
        } catch (termError) {
          console.error("Error terminating connection after ping error:", termError);
        }
      }
    });
  }, 3e4);
  const broadcastToTrip = (tripId, data) => {
    clients.forEach((metadata, client) => {
      if (client.readyState === WebSocket.OPEN && metadata.tripId === tripId) {
        client.send(JSON.stringify(data));
      }
    });
  };
  const sendNotification = async (tripId, userId, type, title, message, itemName) => {
    try {
      const user = await storage.getUser(userId);
      const userName = user ? user.displayName || user.username : `User ${userId}`;
      const notification = {
        type,
        title,
        message,
        tripId,
        userId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        itemName,
        userName
      };
      broadcastToTrip(tripId, {
        type: "notification",
        payload: notification,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`Notification sent - Type: ${type}, Trip: ${tripId}, User: ${userId}`);
      await storage.createActivity({
        tripId,
        userId,
        activityType: type,
        activityData: { itemName, message }
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };
  wss.on("connection", (ws2) => {
    console.log("WebSocket client connected");
    clients.set(ws2, { isAlive: true });
    ws2.on("pong", () => {
      const metadata = clients.get(ws2);
      if (metadata) {
        metadata.isAlive = true;
        clients.set(ws2, metadata);
      }
    });
    ws2.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload, timestamp: timestamp2 } = message;
        console.log(`Received message of type: ${type}`, payload);
        switch (type) {
          case "auth":
            if (payload.userId) {
              clients.set(ws2, { ...clients.get(ws2), userId: payload.userId });
            }
            break;
          case "join_trip":
            if (payload.tripId) {
              clients.set(ws2, { ...clients.get(ws2), tripId: payload.tripId });
            }
            break;
          case "connected":
            const metadata = clients.get(ws2);
            if (metadata) {
              metadata.isAlive = true;
              clients.set(ws2, metadata);
              try {
                ws2.send(JSON.stringify({
                  type: "connected",
                  payload: { pong: Date.now() },
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                }));
              } catch (error) {
                console.error("Error sending pong:", error);
              }
            }
            break;
          case "typing_indicator":
            if (payload.tripId && payload.userId) {
              broadcastToTrip(payload.tripId, {
                type: "typing_indicator",
                payload: {
                  userId: payload.userId,
                  isTyping: payload.isTyping,
                  tripId: payload.tripId
                },
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
            break;
          case "message_read":
            if (payload.messageId && payload.userId && payload.tripId) {
              try {
                const message2 = await storage.getChatMessage(payload.messageId);
                if (!message2) {
                  throw new Error("Message not found");
                }
                let readBy = message2.readBy || [];
                if (!readBy.includes(payload.userId)) {
                  readBy.push(payload.userId);
                  await storage.updateChatMessage(payload.messageId, { readBy });
                  broadcastToTrip(payload.tripId, {
                    type: "message_read",
                    payload: {
                      messageId: payload.messageId,
                      userId: payload.userId,
                      readBy,
                      tripId: payload.tripId
                    },
                    timestamp: (/* @__PURE__ */ new Date()).toISOString()
                  });
                }
              } catch (error) {
                console.error("Error marking message as read:", error);
                ws2.send(JSON.stringify({
                  type: "error",
                  payload: { message: "Failed to mark message as read" },
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                }));
              }
            }
            break;
          case "message_reaction":
            if (payload.messageId && payload.userId && payload.reaction && payload.tripId) {
              try {
                const message2 = await storage.getChatMessage(payload.messageId);
                if (!message2) {
                  throw new Error("Message not found");
                }
                let reactions = message2.reactions || {};
                if (payload.toggle) {
                  if (!reactions[payload.reaction]) {
                    reactions[payload.reaction] = [];
                  }
                  const userIndex = reactions[payload.reaction].indexOf(payload.userId);
                  if (userIndex === -1) {
                    reactions[payload.reaction].push(payload.userId);
                  } else {
                    reactions[payload.reaction].splice(userIndex, 1);
                    if (reactions[payload.reaction].length === 0) {
                      delete reactions[payload.reaction];
                    }
                  }
                } else {
                  if (!reactions[payload.reaction]) {
                    reactions[payload.reaction] = [];
                  }
                  if (!reactions[payload.reaction].includes(payload.userId)) {
                    reactions[payload.reaction].push(payload.userId);
                  }
                }
                await storage.updateChatMessage(payload.messageId, { reactions });
                broadcastToTrip(payload.tripId, {
                  type: "message_reaction",
                  payload: {
                    messageId: payload.messageId,
                    userId: payload.userId,
                    reaction: payload.reaction,
                    reactions,
                    tripId: payload.tripId
                  },
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                });
              } catch (error) {
                console.error("Error updating message reaction:", error);
                ws2.send(JSON.stringify({
                  type: "error",
                  payload: { message: "Failed to update message reaction" },
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                }));
              }
            }
            break;
          case "message_edit":
            if (payload.messageId && payload.userId && payload.message && payload.tripId) {
              try {
                const message2 = await storage.getChatMessage(payload.messageId);
                if (!message2) {
                  throw new Error("Message not found");
                }
                if (message2.userId !== payload.userId) {
                  throw new Error("You can only edit your own messages");
                }
                const updatedMessage = await storage.updateChatMessage(payload.messageId, {
                  message: payload.message,
                  isEdited: true,
                  editedAt: /* @__PURE__ */ new Date()
                });
                broadcastToTrip(payload.tripId, {
                  type: "message_edit",
                  payload: updatedMessage,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                });
              } catch (error) {
                console.error("Error editing message:", error);
                ws2.send(JSON.stringify({
                  type: "error",
                  payload: { message: "Failed to edit message" },
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                }));
              }
            }
            break;
          case "message_delete":
            if (payload.messageId && payload.userId && payload.tripId) {
              try {
                const message2 = await storage.getChatMessage(payload.messageId);
                if (!message2) {
                  throw new Error("Message not found");
                }
                if (message2.userId !== payload.userId) {
                  throw new Error("You can only delete your own messages");
                }
                const updatedMessage = await storage.updateChatMessage(payload.messageId, {
                  isDeleted: true
                });
                broadcastToTrip(payload.tripId, {
                  type: "message_delete",
                  payload: {
                    messageId: payload.messageId,
                    userId: payload.userId,
                    tripId: payload.tripId
                  },
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                });
              } catch (error) {
                console.error("Error deleting message:", error);
                ws2.send(JSON.stringify({
                  type: "error",
                  payload: { message: "Failed to delete message" },
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                }));
              }
            }
            break;
          case "chat_message":
            if (payload.tripId && payload.userId && payload.message) {
              const messageData = {
                tripId: payload.tripId,
                userId: payload.userId,
                message: payload.message,
                readBy: [payload.userId]
                // The sender has read the message
              };
              try {
                const savedMessage = await storage.createChatMessage(messageData);
                broadcastToTrip(payload.tripId, {
                  type: "chat_message",
                  payload: savedMessage,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                });
                await storage.createActivity({
                  tripId: payload.tripId,
                  userId: payload.userId,
                  activityType: "chat_message",
                  activityData: { messageId: savedMessage.id }
                });
                if (!payload.isSystem) {
                  const user = await storage.getUser(payload.userId);
                  const senderName = user ? user.displayName || user.username : `User ${payload.userId}`;
                  await sendNotification(
                    payload.tripId,
                    payload.userId,
                    "chat_message",
                    "New Message",
                    `${senderName}: ${payload.message.substring(0, 30)}${payload.message.length > 30 ? "..." : ""}`,
                    payload.message
                  );
                }
              } catch (error) {
                console.error("Failed to save chat message:", error);
                ws2.send(JSON.stringify({
                  type: "error",
                  payload: { message: "Failed to save chat message" },
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                }));
              }
            }
            break;
          case "item_updated":
            if (payload.tripId) {
              broadcastToTrip(payload.tripId, message);
            }
            break;
          case "expense_added":
            if (payload.tripId) {
              broadcastToTrip(payload.tripId, message);
            }
            break;
          default:
            console.log("Unknown message type:", type);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });
    ws2.on("close", () => {
      console.log("WebSocket client disconnected");
      clients.delete(ws2);
    });
    ws2.send(JSON.stringify({
      type: "connected",
      payload: { message: "Connected to TripMate server" },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
  });
  app2.get("/api/trips/:tripId/debt-settlements", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const settlements = await storage.getDebtSettlements(tripId);
      res.status(200).json(settlements);
    } catch (error) {
      console.error("Error fetching debt settlements:", error);
      res.status(500).json({ message: "Failed to get debt settlements", error });
    }
  });
  app2.post("/api/trips/:tripId/debt-settlements", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      try {
        const settlementData = {
          ...req.body,
          tripId,
          settledById: req.user.id
          // The current user is marking as settled
        };
        const parsedSettlement = insertDebtSettlementSchema.parse(settlementData);
        const settlement = await storage.createDebtSettlement(parsedSettlement);
        broadcastToTrip(tripId, {
          type: "debt_settled",
          payload: settlement,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        res.status(201).json(settlement);
      } catch (parseError) {
        console.error("Settlement validation error:", parseError);
        return res.status(400).json({
          message: "Invalid settlement data",
          error: parseError
        });
      }
    } catch (error) {
      console.error("Settlement creation error:", error);
      res.status(500).json({
        message: "Failed to create settlement",
        error: error.message || String(error)
      });
    }
  });
  app2.get("/api/trips/:tripId/debt-settlements/between", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const user1Id = parseInt(req.query.user1Id);
      const user2Id = parseInt(req.query.user2Id);
      if (!user1Id || !user2Id) {
        return res.status(400).json({ message: "Both user IDs are required" });
      }
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const settlements = await storage.getDebtSettlementsBetweenUsers(tripId, user1Id, user2Id);
      res.status(200).json(settlements);
    } catch (error) {
      console.error("Error fetching debt settlements between users:", error);
      res.status(500).json({ message: "Failed to get debt settlements", error });
    }
  });
  app2.delete("/api/debt-settlements/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const settlementId = parseInt(req.params.id);
      console.log(`Attempting to delete settlement with ID: ${settlementId}`);
      const deleted = await storage.deleteDebtSettlement(settlementId);
      if (deleted) {
        console.log(`Settlement deleted successfully: ${settlementId}`);
        res.status(200).json({ message: "Settlement deleted successfully" });
      } else {
        console.log(`Settlement not found or could not be deleted: ${settlementId}`);
        res.status(404).json({ message: "Settlement not found or could not be deleted" });
      }
    } catch (error) {
      console.error("Error deleting debt settlement:", error);
      res.status(500).json({
        message: "Failed to delete settlement",
        error: error.message || String(error)
      });
    }
  });
  app2.get("/api/trips/:tripId/itinerary/days", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const days = await storage.getItineraryDays(tripId);
      res.status(200).json(days);
    } catch (error) {
      console.error("Error fetching itinerary days:", error);
      res.status(500).json({ message: "Failed to get itinerary days", error });
    }
  });
  app2.post("/api/trips/:tripId/itinerary/days", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const dayData = insertItineraryDaySchema.parse({
        ...req.body,
        tripId,
        createdBy: req.user.id
      });
      const newDay = await storage.createItineraryDay(dayData);
      broadcastToTrip(tripId, {
        type: "itinerary_day_added",
        data: newDay
      });
      res.status(201).json(newDay);
    } catch (error) {
      console.error("Error creating itinerary day:", error);
      res.status(500).json({ message: "Failed to create itinerary day", error });
    }
  });
  app2.patch("/api/itinerary/days/:dayId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const dayId = parseInt(req.params.dayId);
      const day = await storage.getItineraryDay(dayId);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }
      const isMember = await storage.getTripMember(day.tripId, req.user.id);
      const trip = await storage.getTrip(day.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const updatedDay = await storage.updateItineraryDay(dayId, req.body);
      broadcastToTrip(day.tripId, {
        type: "itinerary_day_updated",
        data: updatedDay
      });
      res.status(200).json(updatedDay);
    } catch (error) {
      console.error("Error updating itinerary day:", error);
      res.status(500).json({ message: "Failed to update itinerary day", error });
    }
  });
  app2.delete("/api/itinerary/days/:dayId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const dayId = parseInt(req.params.dayId);
      const day = await storage.getItineraryDay(dayId);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }
      const isMember = await storage.getTripMember(day.tripId, req.user.id);
      const trip = await storage.getTrip(day.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const deleted = await storage.deleteItineraryDay(dayId);
      if (deleted) {
        broadcastToTrip(day.tripId, {
          type: "itinerary_day_deleted",
          data: { dayId }
        });
        res.status(200).json({ message: "Day deleted successfully" });
      } else {
        res.status(404).json({ message: "Day not found" });
      }
    } catch (error) {
      console.error("Error deleting itinerary day:", error);
      res.status(500).json({ message: "Failed to delete itinerary day", error });
    }
  });
  app2.get("/api/trips/:tripId/itinerary", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const activities2 = await storage.getItineraryActivities(void 0, tripId);
      const days = await storage.getItineraryDays(tripId);
      const dayMap = days.reduce((map, day, index) => {
        map[day.id] = index + 1;
        return map;
      }, {});
      const flattenedItems = activities2.map((activity) => ({
        id: activity.id,
        tripId: activity.tripId,
        day: dayMap[activity.dayId] || 1,
        // Use actual day from dayId mapping
        time: activity.startTime || "",
        title: activity.title,
        description: activity.description || "",
        location: activity.location || "",
        createdAt: activity.createdAt.toISOString()
      }));
      res.status(200).json(flattenedItems);
    } catch (error) {
      console.error("Error fetching itinerary:", error);
      res.status(500).json({ message: "Failed to get itinerary", error });
    }
  });
  app2.post("/api/trips/:tripId/itinerary", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const { day, time, title, description, location } = req.body;
      if (!title?.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      const dayTitle = `Day ${day || 1}`;
      const existingDays = await storage.getItineraryDays(tripId);
      let existingDay = existingDays.find((d) => d.title === dayTitle);
      if (!existingDay) {
        const dayData = {
          tripId,
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          // Use today's date
          title: dayTitle,
          createdBy: req.user.id
        };
        existingDay = await storage.createItineraryDay(dayData);
      }
      const activityData = {
        dayId: existingDay.id,
        tripId,
        title: title.trim(),
        description: description?.trim() || null,
        startTime: time || null,
        endTime: null,
        location: location?.trim() || null,
        category: "general",
        estimatedCost: null,
        actualCost: null,
        notes: null,
        createdBy: req.user.id,
        sortOrder: 0,
        isCompleted: false,
        isAiGenerated: false
      };
      const newActivity = await storage.createItineraryActivity(activityData);
      const responseItem = {
        id: newActivity.id,
        tripId: newActivity.tripId,
        day: day || 1,
        time: newActivity.startTime || "",
        title: newActivity.title,
        description: newActivity.description || "",
        location: newActivity.location || "",
        createdAt: newActivity.createdAt.toISOString()
      };
      broadcastToTrip(tripId, {
        type: "itinerary_item_added",
        data: responseItem
      });
      res.status(201).json(responseItem);
    } catch (error) {
      console.error("Error creating itinerary item:", error);
      res.status(500).json({ message: "Failed to create itinerary item", error: error.message });
    }
  });
  app2.patch("/api/itinerary/:itemId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const itemId = parseInt(req.params.itemId);
      const activity = await storage.getItineraryActivity(itemId);
      if (!activity) {
        return res.status(404).json({ message: "Itinerary item not found" });
      }
      const isMember = await storage.getTripMember(activity.tripId, req.user.id);
      const trip = await storage.getTrip(activity.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const { day, time, title, description, location } = req.body;
      const updateData = {
        title: title?.trim() || activity.title,
        description: description?.trim() || activity.description,
        startTime: time || activity.startTime,
        location: location?.trim() || activity.location,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const updatedActivity = await storage.updateItineraryActivity(itemId, updateData);
      if (!updatedActivity) {
        return res.status(404).json({ message: "Failed to update itinerary item" });
      }
      const responseItem = {
        id: updatedActivity.id,
        tripId: updatedActivity.tripId,
        day: day || 1,
        time: updatedActivity.startTime || "",
        title: updatedActivity.title,
        description: updatedActivity.description || "",
        location: updatedActivity.location || "",
        createdAt: updatedActivity.createdAt.toISOString()
      };
      broadcastToTrip(activity.tripId, {
        type: "itinerary_item_updated",
        data: responseItem
      });
      res.status(200).json(responseItem);
    } catch (error) {
      console.error("Error updating itinerary item:", error);
      res.status(500).json({ message: "Failed to update itinerary item", error: error.message });
    }
  });
  app2.delete("/api/itinerary/:itemId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const itemId = parseInt(req.params.itemId);
      const activity = await storage.getItineraryActivity(itemId);
      if (!activity) {
        return res.status(404).json({ message: "Itinerary item not found" });
      }
      const isMember = await storage.getTripMember(activity.tripId, req.user.id);
      const trip = await storage.getTrip(activity.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const deleted = await storage.deleteItineraryActivity(itemId);
      if (deleted) {
        broadcastToTrip(activity.tripId, {
          type: "itinerary_item_deleted",
          data: { itemId }
        });
        res.status(200).json({ message: "Itinerary item deleted successfully" });
      } else {
        res.status(404).json({ message: "Itinerary item not found" });
      }
    } catch (error) {
      console.error("Error deleting itinerary item:", error);
      res.status(500).json({ message: "Failed to delete itinerary item", error: error.message });
    }
  });
  app2.get("/api/trips/:tripId/itinerary/activities", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const dayId = req.query.dayId ? parseInt(req.query.dayId) : void 0;
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const activities2 = await storage.getItineraryActivities(dayId, tripId);
      res.status(200).json(activities2);
    } catch (error) {
      console.error("Error fetching itinerary activities:", error);
      res.status(500).json({ message: "Failed to get itinerary activities", error });
    }
  });
  app2.post("/api/itinerary/days/:dayId/activities", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const dayId = parseInt(req.params.dayId);
      const day = await storage.getItineraryDay(dayId);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }
      const isMember = await storage.getTripMember(day.tripId, req.user.id);
      const trip = await storage.getTrip(day.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const activityData = insertItineraryActivitySchema.parse({
        ...req.body,
        dayId,
        tripId: day.tripId,
        createdBy: req.user.id
      });
      const newActivity = await storage.createItineraryActivity(activityData);
      broadcastToTrip(day.tripId, {
        type: "itinerary_activity_added",
        data: newActivity
      });
      res.status(201).json(newActivity);
    } catch (error) {
      console.error("Error creating itinerary activity:", error);
      res.status(500).json({ message: "Failed to create itinerary activity", error });
    }
  });
  app2.post("/api/trips/:tripId/itinerary/suggestions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const { day, time, title, description, location } = req.body;
      if (!title?.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      const dayTitle = `Day ${day || 1}`;
      const existingDays = await storage.getItineraryDays(tripId);
      let existingDay = existingDays.find((d) => d.title === dayTitle);
      if (!existingDay) {
        const dayData = {
          tripId,
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          title: dayTitle,
          createdBy: req.user.id
        };
        existingDay = await storage.createItineraryDay(dayData);
      }
      const activityData = {
        dayId: existingDay.id,
        tripId,
        title: title.trim(),
        description: description?.trim() || null,
        startTime: time || null,
        endTime: null,
        location: location?.trim() || null,
        category: "general",
        estimatedCost: null,
        actualCost: null,
        notes: null,
        createdBy: req.user.id,
        sortOrder: 0,
        isCompleted: false,
        isAiGenerated: false,
        isSuggestion: true,
        isApproved: false
      };
      const newSuggestion = await storage.createItineraryActivity(activityData);
      const responseSuggestion = {
        id: newSuggestion.id,
        tripId: newSuggestion.tripId,
        day: day || 1,
        time: newSuggestion.startTime || "",
        title: newSuggestion.title,
        description: newSuggestion.description || "",
        location: newSuggestion.location || "",
        createdAt: newSuggestion.createdAt.toISOString(),
        isSuggestion: true,
        isApproved: false,
        createdBy: newSuggestion.createdBy,
        votes: []
      };
      broadcastToTrip(tripId, {
        type: "activity_suggested",
        data: responseSuggestion
      });
      res.status(201).json(responseSuggestion);
    } catch (error) {
      console.error("Error creating activity suggestion:", error);
      res.status(500).json({ message: "Failed to create activity suggestion", error: error.message });
    }
  });
  app2.get("/api/trips/:tripId/itinerary/suggestions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const suggestions = await storage.getSuggestedActivities(tripId);
      const days = await storage.getItineraryDays(tripId);
      const dayMap = days.reduce((map, day, index) => {
        map[day.id] = index + 1;
        return map;
      }, {});
      const suggestionsWithVotes = await Promise.all(
        suggestions.map(async (suggestion) => {
          const votes = await storage.getItineraryActivityVotes(suggestion.id);
          return {
            id: suggestion.id,
            tripId: suggestion.tripId,
            day: dayMap[suggestion.dayId] || 1,
            time: suggestion.startTime || "",
            title: suggestion.title,
            description: suggestion.description || "",
            location: suggestion.location || "",
            createdAt: suggestion.createdAt.toISOString(),
            isSuggestion: true,
            isApproved: suggestion.isApproved,
            createdBy: suggestion.createdBy,
            votes
          };
        })
      );
      res.status(200).json(suggestionsWithVotes);
    } catch (error) {
      console.error("Error fetching activity suggestions:", error);
      res.status(500).json({ message: "Failed to get activity suggestions", error });
    }
  });
  app2.post("/api/trips/:tripId/itinerary/suggestions/:suggestionId/vote", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const suggestionId = parseInt(req.params.suggestionId);
      const { vote } = req.body;
      if (!["up", "down", "interested"].includes(vote)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const voteData = {
        activityId: suggestionId,
        userId: req.user.id,
        vote
      };
      const newVote = await storage.createItineraryActivityVote(voteData);
      broadcastToTrip(tripId, {
        type: "suggestion_voted",
        data: { suggestionId, vote: newVote }
      });
      res.status(201).json(newVote);
    } catch (error) {
      console.error("Error voting on suggestion:", error);
      res.status(500).json({ message: "Failed to vote on suggestion", error: error.message });
    }
  });
  app2.post("/api/trips/:tripId/itinerary/suggestions/:suggestionId/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const suggestionId = parseInt(req.params.suggestionId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const member = await storage.getTripMember(tripId, req.user.id);
      if (trip.createdById !== req.user.id && (!member || !member.isAdmin)) {
        return res.status(403).json({ message: "Only trip creators and admins can approve suggestions" });
      }
      const approvedActivity = await storage.approveActivitySuggestion(suggestionId, req.user.id);
      if (!approvedActivity) {
        return res.status(404).json({ message: "Activity suggestion not found" });
      }
      broadcastToTrip(tripId, {
        type: "suggestion_approved",
        data: { suggestionId, approvedBy: req.user.id }
      });
      res.status(200).json({ success: true, activity: approvedActivity });
    } catch (error) {
      console.error("Error approving suggestion:", error);
      res.status(500).json({ message: "Failed to approve suggestion", error: error.message });
    }
  });
  app2.post("/api/trips/:tripId/itinerary/suggestions/:suggestionId/reject", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const suggestionId = parseInt(req.params.suggestionId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const member = await storage.getTripMember(tripId, req.user.id);
      if (trip.createdById !== req.user.id && (!member || !member.isAdmin)) {
        return res.status(403).json({ message: "Only trip creators and admins can reject suggestions" });
      }
      const rejectedActivity = await storage.rejectActivitySuggestion(suggestionId, req.user.id);
      if (!rejectedActivity) {
        return res.status(404).json({ message: "Activity suggestion not found" });
      }
      broadcastToTrip(tripId, {
        type: "suggestion_rejected",
        data: { suggestionId, rejectedBy: req.user.id }
      });
      res.status(200).json({ success: true, activity: rejectedActivity });
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
      res.status(500).json({ message: "Failed to reject suggestion", error: error.message });
    }
  });
  app2.delete("/api/trips/:tripId/itinerary/suggestions/:suggestionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const suggestionId = parseInt(req.params.suggestionId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const member = await storage.getTripMember(tripId, req.user.id);
      if (trip.createdById !== req.user.id && (!member || !member.isAdmin)) {
        return res.status(403).json({ message: "Only trip creators and admins can delete suggestions" });
      }
      const deleted = await storage.deleteActivitySuggestion(suggestionId);
      if (!deleted) {
        return res.status(404).json({ message: "Activity suggestion not found" });
      }
      broadcastToTrip(tripId, {
        type: "suggestion_deleted",
        data: { suggestionId, deletedBy: req.user.id }
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting suggestion:", error);
      res.status(500).json({ message: "Failed to delete suggestion", error: error.message });
    }
  });
  app2.put("/api/trips/:tripId/itinerary/suggestions/:suggestionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const suggestionId = parseInt(req.params.suggestionId);
      const { day, time, title, description, location } = req.body;
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const member = await storage.getTripMember(tripId, req.user.id);
      if (trip.createdById !== req.user.id && (!member || !member.isAdmin)) {
        return res.status(403).json({ message: "Only trip creators and admins can update suggestions" });
      }
      const updateData = {
        title,
        description,
        location
      };
      if (time) {
        updateData.startTime = time;
      }
      const updated = await storage.updateActivitySuggestion(suggestionId, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Activity suggestion not found" });
      }
      broadcastToTrip(tripId, {
        type: "suggestion_updated",
        data: { suggestionId, updatedBy: req.user.id }
      });
      res.status(200).json({ success: true, suggestion: updated });
    } catch (error) {
      console.error("Error updating suggestion:", error);
      res.status(500).json({ message: "Failed to update suggestion", error: error.message });
    }
  });
  app2.patch("/api/itinerary/activities/:activityId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const activityId = parseInt(req.params.activityId);
      const activity = await storage.getItineraryActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      const isMember = await storage.getTripMember(activity.tripId, req.user.id);
      const trip = await storage.getTrip(activity.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      console.log("Update request body:", req.body);
      const updatedActivity = await storage.updateItineraryActivity(activityId, req.body);
      broadcastToTrip(activity.tripId, {
        type: "itinerary_activity_updated",
        data: updatedActivity
      });
      res.status(200).json(updatedActivity);
    } catch (error) {
      console.error("Error updating itinerary activity:", error);
      res.status(500).json({ message: "Failed to update itinerary activity", error });
    }
  });
  app2.delete("/api/itinerary/activities/:activityId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const activityId = parseInt(req.params.activityId);
      const activity = await storage.getItineraryActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      const isMember = await storage.getTripMember(activity.tripId, req.user.id);
      const trip = await storage.getTrip(activity.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      console.log(`Attempting to delete itinerary activity ${activityId}`);
      const deleted = await storage.deleteItineraryActivity(activityId);
      console.log(`Delete result: ${deleted}`);
      if (deleted) {
        broadcastToTrip(activity.tripId, {
          type: "itinerary_activity_deleted",
          data: { activityId }
        });
        res.status(200).json({ message: "Activity deleted successfully" });
      } else {
        res.status(404).json({ message: "Activity not found" });
      }
    } catch (error) {
      console.error("Error deleting itinerary activity:", error);
      res.status(500).json({ message: "Failed to delete itinerary activity", error });
    }
  });
  app2.post("/api/itinerary/activities/:activityId/vote", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const activityId = parseInt(req.params.activityId);
      const { vote } = req.body;
      if (!vote || !["up", "down", "interested"].includes(vote)) {
        return res.status(400).json({ message: "Valid vote is required (up, down, interested)" });
      }
      const activity = await storage.getItineraryActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      const isMember = await storage.getTripMember(activity.tripId, req.user.id);
      const trip = await storage.getTrip(activity.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const voteData = insertItineraryActivityVoteSchema.parse({
        activityId,
        userId: req.user.id,
        vote
      });
      const newVote = await storage.createItineraryActivityVote(voteData);
      const allVotes = await storage.getItineraryActivityVotes(activityId);
      broadcastToTrip(activity.tripId, {
        type: "itinerary_activity_vote_updated",
        data: { activityId, votes: allVotes }
      });
      res.status(201).json(newVote);
    } catch (error) {
      console.error("Error voting on itinerary activity:", error);
      res.status(500).json({ message: "Failed to vote on activity", error });
    }
  });
  app2.get("/api/itinerary/activities/:activityId/votes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const activityId = parseInt(req.params.activityId);
      const activity = await storage.getItineraryActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      const isMember = await storage.getTripMember(activity.tripId, req.user.id);
      const trip = await storage.getTrip(activity.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const votes = await storage.getItineraryActivityVotes(activityId);
      res.status(200).json(votes);
    } catch (error) {
      console.error("Error fetching activity votes:", error);
      res.status(500).json({ message: "Failed to get activity votes", error });
    }
  });
  app2.post("/api/trips/:tripId/itinerary/generate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const existingActivities = await storage.getItineraryActivities(void 0, tripId);
      const existingActivitySummaries = existingActivities.map((a) => ({
        title: a.title,
        category: a.category || "general",
        date: "unknown"
        // We'd need to get the day info for this
      }));
      const aiRequest = {
        destination: trip.location || "Unknown destination",
        tripType: trip.tripType || "general",
        startDate: typeof trip.startDate === "string" ? trip.startDate : (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        endDate: typeof trip.endDate === "string" ? trip.endDate : (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        groupSize: req.body.groupSize,
        budget: req.body.budget,
        interests: req.body.interests,
        existingActivities: existingActivitySummaries
      };
      const suggestions = await aiItineraryService.generateItinerarySuggestions(aiRequest);
      res.status(200).json(suggestions);
    } catch (error) {
      console.error("Error generating AI itinerary:", error);
      res.status(500).json({ message: "Failed to generate itinerary suggestions", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.post("/api/trips/:tripId/itinerary/suggest-activities", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      const existingActivities = await storage.getItineraryActivities(void 0, tripId);
      const existingTitles = existingActivities.map((a) => a.title);
      const suggestions = await aiItineraryService.generateActivitySuggestions(
        trip.location || "Unknown destination",
        trip.tripType || "general",
        existingTitles
      );
      res.status(200).json(suggestions);
    } catch (error) {
      console.error("Error generating activity suggestions:", error);
      res.status(500).json({ message: "Failed to generate activity suggestions", error: error instanceof Error ? error.message : String(error) });
    }
  });
  httpServer.on("close", () => {
    console.log("Cleaning up WebSocket server");
    clearInterval(pingInterval);
    wss.clients.forEach((ws2) => {
      ws2.terminate();
    });
  });
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use("/api", (req, res, next) => {
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
