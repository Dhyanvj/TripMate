import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatar: text("avatar"),
  dateOfBirth: date("date_of_birth"),
  paymentPreference: text("payment_preference"),
  isEncrypted: boolean("is_encrypted").default(true),
  // Note: these fields aren't in the database yet, we'll use paymentPreference for now
  // venmoHandle: text("venmo_handle"),
  // paypalHandle: text("paypal_handle"),
});

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  used: boolean("used").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
  avatar: true,
  dateOfBirth: true,
  paymentPreference: true,
});

// Trips
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  description: text("description"),
  startDate: text("start_date"), // Changed to text to support both encrypted strings and date strings
  endDate: text("end_date"),     // Changed to text to support both encrypted strings and date strings
  createdById: integer("created_by").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  inviteCodeExpiresAt: timestamp("invite_code_expires_at"), // When the invite code expires
  tripType: text("trip_type"),
  isPast: boolean("is_past").default(false).notNull(),
  isEncrypted: boolean("is_encrypted").default(true),
});

// Create a modified insert schema that accepts string dates
export const insertTripSchema = createInsertSchema(trips)
  .pick({
    name: true,
    location: true,
    description: true,
    createdById: true,
    inviteCode: true,
    tripType: true,
    isPast: true,
  })
  .extend({
    // Date fields can now be strings (encrypted) or date strings (YYYY-MM-DD format for unencrypted)
    startDate: z.union([z.string(), z.date(), z.null()]).nullable()
      .transform(val => {
        if (!val) return null;
        if (typeof val === 'string') return val; // Keep string as-is (could be encrypted or date string)
        // Convert Date to YYYY-MM-DD string
        return val.toISOString().split('T')[0];
      }),
    endDate: z.union([z.string(), z.date(), z.null()]).nullable()
      .transform(val => {
        if (!val) return null;
        if (typeof val === 'string') return val; // Keep string as-is (could be encrypted or date string)
        // Convert Date to YYYY-MM-DD string
        return val.toISOString().split('T')[0];
      }),
  });

// Trip Members
export const tripMembers = pgTable("trip_members", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(), // Added to support hiding trips per user
  isAdmin: boolean("is_admin").default(false).notNull(), // Added to support admin permissions
}, (table) => {
  return {
    unq: unique().on(table.tripId, table.userId)
  };
});

export const insertTripMemberSchema = createInsertSchema(tripMembers).pick({
  tripId: true,
  userId: true,
  isHidden: true,
  isAdmin: true,
});

// Item Categories
export const itemCategories = pgTable("item_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  colorClass: text("color_class"),
});

export const insertItemCategorySchema = createInsertSchema(itemCategories).pick({
  name: true,
  colorClass: true,
});



// Expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  paidBy: integer("paid_by").notNull(),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
  addedBy: integer("added_by").notNull(),
  category: text("category"),
  isPersonal: boolean("is_personal").default(false).notNull(),
  isEncrypted: boolean("is_encrypted").default(true),
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  tripId: true,
  description: true,
  amount: true,
  paidBy: true,
  paidAt: true,
  addedBy: true,
  category: true,
  isPersonal: true,
});

// Expense Participants
export const expenseParticipants = pgTable("expense_participants", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull(),
  userId: integer("user_id").notNull(),
}, (table) => {
  return {
    unq: unique().on(table.expenseId, table.userId)
  };
});

export const insertExpenseParticipantSchema = createInsertSchema(expenseParticipants).pick({
  expenseId: true,
  userId: true,
});

// Packing Items
export const packingItems = pgTable("packing_items", {
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
  isEncrypted: boolean("is_encrypted").default(true),
});

export const insertPackingItemSchema = createInsertSchema(packingItems).pick({
  tripId: true,
  name: true,
  quantity: true,
  isPacked: true,
  isGroupItem: true,
  isPersonal: true,
  assignedTo: true,
  addedBy: true,
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  isPoll: boolean("is_poll").default(false).notNull(),
  pollOptions: jsonb("poll_options"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  readBy: jsonb("read_by").default([]), // Array of user IDs who have read the message
  reactions: jsonb("reactions").default({}), // Object with emoji as keys and arrays of user IDs as values
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
  encryptionIv: text("encryption_iv"),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
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
  isEncrypted: true,
});

// Activities
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  activityType: text("activity_type").notNull(),
  activityData: jsonb("activity_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  tripId: true,
  userId: true,
  activityType: true,
  activityData: true,
});

// Spending Margins
export const spendingMargins = pgTable("spending_margins", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  budgetLimit: real("budget_limit").notNull(),
  warningThreshold: real("warning_threshold").default(0.8), // 80% by default
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.tripId, table.userId), // One margin per user per trip
}));

export const insertSpendingMarginSchema = createInsertSchema(spendingMargins).pick({
  tripId: true,
  userId: true,
  budgetLimit: true,
  warningThreshold: true,
});

// Debt Settlements
export const debtSettlements = pgTable("debt_settlements", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  owedById: integer("owed_by_id").notNull(), // Person who owed the money
  owedToId: integer("owed_to_id").notNull(), // Person who was owed the money
  amount: real("amount").notNull(),
  settledAt: timestamp("settled_at").defaultNow().notNull(),
  settledById: integer("settled_by_id").notNull(), // Person who marked it as settled
  notes: text("notes"),
});

// Itinerary Days
export const itineraryDays = pgTable("itinerary_days", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  title: text("title").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isEncrypted: boolean("is_encrypted").default(true),
});

// Itinerary Activities
export const itineraryActivities = pgTable("itinerary_activities", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id").notNull(),
  tripId: integer("trip_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: text("start_time"), // HH:MM format
  endTime: text("end_time"), // HH:MM format
  location: text("location"),
  category: text("category"), // e.g., "sightseeing", "dining", "transport", "accommodation"
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
  isApproved: boolean("is_approved").default(true), // Default true for regular activities
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectedBy: integer("rejected_by"),
  rejectedAt: timestamp("rejected_at"),
});

// Itinerary Activity Votes (for collaborative planning)
export const itineraryActivityVotes = pgTable("itinerary_activity_votes", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull(),
  userId: integer("user_id").notNull(),
  vote: text("vote").notNull(), // "up", "down", "interested"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.activityId, table.userId), // One vote per user per activity
}));

export const insertDebtSettlementSchema = createInsertSchema(debtSettlements).pick({
  tripId: true,
  owedById: true,
  owedToId: true,
  amount: true,
  settledAt: true,
  settledById: true,
  notes: true,
});

export const insertItineraryDaySchema = createInsertSchema(itineraryDays).pick({
  tripId: true,
  date: true,
  title: true,
  createdBy: true,
});

export const insertItineraryActivitySchema = createInsertSchema(itineraryActivities).pick({
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
  rejectedBy: true,
});

export const insertItineraryActivityVoteSchema = createInsertSchema(itineraryActivityVotes).pick({
  activityId: true,
  userId: true,
  vote: true,
});

// Password Reset Token Schema
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type TripMember = typeof tripMembers.$inferSelect;
export type InsertTripMember = z.infer<typeof insertTripMemberSchema>;

export type ItemCategory = typeof itemCategories.$inferSelect;
export type InsertItemCategory = z.infer<typeof insertItemCategorySchema>;



export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type ExpenseParticipant = typeof expenseParticipants.$inferSelect;
export type InsertExpenseParticipant = z.infer<typeof insertExpenseParticipantSchema>;

export type PackingItem = typeof packingItems.$inferSelect;
export type InsertPackingItem = z.infer<typeof insertPackingItemSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Define the structure for activity data
export interface ActivityData {
  tripName?: string;
  memberName?: string;
  itemName?: string;
  amount?: number | string;
  expenseName?: string;
  [key: string]: any; // Allow for additional properties
}

export type DebtSettlement = typeof debtSettlements.$inferSelect;
export type InsertDebtSettlement = z.infer<typeof insertDebtSettlementSchema>;

export type ItineraryDay = typeof itineraryDays.$inferSelect;
export type InsertItineraryDay = z.infer<typeof insertItineraryDaySchema>;

export type ItineraryActivity = typeof itineraryActivities.$inferSelect;
export type InsertItineraryActivity = z.infer<typeof insertItineraryActivitySchema>;

export type ItineraryActivityVote = typeof itineraryActivityVotes.$inferSelect;
export type InsertItineraryActivityVote = z.infer<typeof insertItineraryActivityVoteSchema>;
