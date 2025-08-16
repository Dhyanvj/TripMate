import { randomBytes } from "crypto";
import { CustomPasswordReset } from "./passwordReset";
import { 
  encryptChatMessage, decryptChatMessage, decryptChatMessages,
  encryptPackingItem, decryptPackingItem,
  encryptExpense, decryptExpense,
  encryptTrip, decryptTrip,
  encryptUser, decryptUser,
  encryptItineraryActivity, decryptItineraryActivity
} from "./encryption";
import { 
  User, InsertUser, Trip, InsertTrip, TripMember, InsertTripMember,
  Expense, InsertExpense, ExpenseParticipant, InsertExpenseParticipant,
  PackingItem, InsertPackingItem, ChatMessage, InsertChatMessage, 
  Activity, InsertActivity, DebtSettlement, InsertDebtSettlement,
  PasswordResetToken, InsertPasswordResetToken,
  ItineraryDay, InsertItineraryDay, ItineraryActivity, InsertItineraryActivity,
  ItineraryActivityVote, InsertItineraryActivityVote,
  ItemCategory, InsertItemCategory,
  // Import the table definitions
  users, trips, tripMembers, expenses, expenseParticipants, packingItems, chatMessages, activities, debtSettlements,
  passwordResetTokens, spendingMargins, insertSpendingMarginSchema,
  itineraryDays, itineraryActivities, itineraryActivityVotes, itemCategories
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import session from "express-session";
import MemoryStoreFactory from "memorystore";
import connectPgFactory from "connect-pg-simple";

export interface IStorage {
  // Session storage
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // Password Reset methods
  createPasswordResetToken(userId: number): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(tokenId: number): Promise<boolean>;
  
  // Trip methods
  getTrip(id: number): Promise<Trip | undefined>;
  getTripByInviteCode(inviteCode: string): Promise<Trip | undefined>;
  getUserTrips(userId: number): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined>;
  markTripAsPast(id: number): Promise<Trip | undefined>;
  unmarkTripAsPast(id: number): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  
  // Trip Member methods
  getTripMembers(tripId: number): Promise<TripMember[]>;
  getTripMember(tripId: number, userId: number): Promise<TripMember | undefined>;
  addTripMember(member: InsertTripMember): Promise<TripMember>;
  removeTripMember(tripId: number, userId: number): Promise<boolean>;
  deleteTripMembers(tripId: number): Promise<boolean>;
  setTripMemberAdmin(tripId: number, userId: number, isAdmin: boolean): Promise<TripMember | undefined>;
  getTripAdmins(tripId: number): Promise<TripMember[]>;
  
  // Hide/Unhide Trip methods
  hideTrip(tripId: number, userId: number): Promise<boolean>;
  unhideTrip(tripId: number, userId: number): Promise<boolean>;
  getHiddenTrips(userId: number): Promise<Trip[]>;
  
  // Item Category methods
  getItemCategories(): Promise<ItemCategory[]>;
  getItemCategory(id: number): Promise<ItemCategory | undefined>;
  createItemCategory(category: InsertItemCategory): Promise<ItemCategory>;
  
  // Grocery Item methods

  
  // Expense methods
  getExpenses(tripId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  deleteAllExpenses(tripId: number): Promise<boolean>;
  
  // Expense Participant methods
  getExpenseParticipants(expenseId: number): Promise<ExpenseParticipant[]>;
  addExpenseParticipant(participant: InsertExpenseParticipant): Promise<ExpenseParticipant>;
  deleteExpenseParticipant(id: number): Promise<boolean>;
  deleteAllExpenseParticipants(tripId: number): Promise<boolean>;
  
  // Packing Item methods
  getPackingItems(tripId: number): Promise<PackingItem[]>;
  getPackingItem(id: number): Promise<PackingItem | undefined>;
  createPackingItem(item: InsertPackingItem): Promise<PackingItem>;
  updatePackingItem(id: number, updates: Partial<PackingItem>): Promise<PackingItem | undefined>;
  deletePackingItem(id: number): Promise<boolean>;
  deleteAllPackingItems(tripId: number): Promise<boolean>;
  
  // Chat Message methods
  getChatMessages(tripId: number): Promise<ChatMessage[]>;
  getChatMessage(id: number): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessage(id: number, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined>;
  deleteAllChatMessages(tripId: number): Promise<boolean>;
  
  // Activity methods
  getTripActivities(tripId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  deleteAllActivities(tripId: number): Promise<boolean>;
  cleanupOldActivities(): Promise<number>;
  
  // Debt Settlement methods
  getDebtSettlements(tripId: number): Promise<DebtSettlement[]>;
  createDebtSettlement(settlement: InsertDebtSettlement): Promise<DebtSettlement>;
  getDebtSettlementsBetweenUsers(tripId: number, user1Id: number, user2Id: number): Promise<DebtSettlement[]>;
  deleteDebtSettlement(id: number): Promise<boolean>;
  deleteAllDebtSettlements(tripId: number): Promise<boolean>;
  
  // Spending Margin methods
  getSpendingMargin(tripId: number, userId: number): Promise<any>;
  setSpendingMargin(tripId: number, userId: number, budgetLimit: number, warningThreshold?: number): Promise<any>;
  updateSpendingMargin(tripId: number, userId: number, budgetLimit: number, warningThreshold?: number): Promise<any>;
  deleteSpendingMargin(tripId: number, userId: number): Promise<boolean>;
  
  // Itinerary methods
  getItineraryDays(tripId: number): Promise<ItineraryDay[]>;
  getItineraryDay(id: number): Promise<ItineraryDay | undefined>;
  createItineraryDay(day: InsertItineraryDay): Promise<ItineraryDay>;
  updateItineraryDay(id: number, updates: Partial<ItineraryDay>): Promise<ItineraryDay | undefined>;
  deleteItineraryDay(id: number): Promise<boolean>;
  deleteAllItineraryDays(tripId: number): Promise<boolean>;
  
  getItineraryActivities(dayId?: number, tripId?: number): Promise<ItineraryActivity[]>;
  getItineraryActivity(id: number): Promise<ItineraryActivity | undefined>;
  createItineraryActivity(activity: InsertItineraryActivity): Promise<ItineraryActivity>;
  updateItineraryActivity(id: number, updates: Partial<ItineraryActivity>): Promise<ItineraryActivity | undefined>;
  deleteItineraryActivity(id: number): Promise<boolean>;
  deleteAllItineraryActivities(tripId: number): Promise<boolean>;
  
  getItineraryActivityVotes(activityId: number): Promise<ItineraryActivityVote[]>;
  createItineraryActivityVote(vote: InsertItineraryActivityVote): Promise<ItineraryActivityVote>;
  updateItineraryActivityVote(id: number, updates: Partial<ItineraryActivityVote>): Promise<ItineraryActivityVote | undefined>;
  deleteItineraryActivityVote(activityId: number, userId: number): Promise<boolean>;
  
  // Collaborative suggestion methods
  getSuggestedActivities(tripId: number): Promise<ItineraryActivity[]>;
  approveActivitySuggestion(activityId: number, userId: number): Promise<ItineraryActivity | undefined>;
  rejectActivitySuggestion(activityId: number, userId: number): Promise<ItineraryActivity | undefined>;
  deleteActivitySuggestion(activityId: number): Promise<boolean>;
  updateActivitySuggestion(activityId: number, updates: Partial<ItineraryActivity>): Promise<ItineraryActivity | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private tripMembers: Map<number, TripMember>;
  private itemCategories: Map<number, ItemCategory>;
  private expenses: Map<number, Expense>;
  private expenseParticipants: Map<number, ExpenseParticipant>;
  private packingItems: Map<number, PackingItem>;
  private chatMessages: Map<number, ChatMessage>;
  private activities: Map<number, Activity>;
  private debtSettlements: Map<number, DebtSettlement>;
  
  // Session store for auth
  public sessionStore: session.Store;
  
  private passwordResetTokens: Map<number, PasswordResetToken>;
  
  private currentIds: {
    user: number;
    trip: number;
    tripMember: number;
    itemCategory: number;
    groceryItem: number;
    expense: number;
    expenseParticipant: number;
    packingItem: number;
    chatMessage: number;
    activity: number;
    debtSettlement: number;
    passwordResetToken: number;
  };

  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.tripMembers = new Map();
    this.itemCategories = new Map();
    this.expenses = new Map();
    this.expenseParticipants = new Map();
    this.packingItems = new Map();
    this.chatMessages = new Map();
    this.activities = new Map();
    this.debtSettlements = new Map();
    this.passwordResetTokens = new Map();
    
    // Initialize in-memory session store
    const MemoryStore = MemoryStoreFactory(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired sessions every 24h
    });
    
    this.currentIds = {
      user: 1,
      trip: 1,
      tripMember: 1,
      itemCategory: 1,
      groceryItem: 1,
      expense: 1,
      expenseParticipant: 1,
      packingItem: 1,
      chatMessage: 1,
      activity: 1,
      debtSettlement: 1,
      passwordResetToken: 1
    };
    
    // Initialize with default data
    this.initializeDefaultData();
  }
  
  private initializeDefaultData() {
    // Add default item categories
    const categories = [
      { name: "Food", colorClass: "green" },
      { name: "Drinks", colorClass: "blue" },
      { name: "Toiletries", colorClass: "blue" },
      { name: "Other", colorClass: "amber" }
    ];
    
    categories.forEach(cat => {
      this.createItemCategory({
        name: cat.name,
        colorClass: cat.colorClass
      });
    });
    
    // Add test user
    this.createUser({
      username: "testuser",
      password: "password123",
      displayName: "Test User",
      email: "test@example.com",
      avatar: "",
      paymentPreference: ""
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    // Decrypt user data before returning
    return await decryptUser(user);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(
      (user) => user.username === username
    );
    if (!user) return undefined;
    
    // Decrypt user data before returning
    return await decryptUser(user);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Encrypt user data before storing
    const encryptedUserData = await encryptUser(insertUser);
    
    const id = this.currentIds.user++;
    // Ensure all nullable fields are explicitly set to null if undefined
    const user: User = { 
      ...encryptedUserData, 
      id,
      email: encryptedUserData.email ?? null,
      avatar: insertUser.avatar ?? null,
      paymentPreference: insertUser.paymentPreference ?? null,
      isEncrypted: true
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Password Reset methods
  async createPasswordResetToken(userId: number): Promise<PasswordResetToken> {
    const id = this.currentIds.passwordResetToken++;
    
    // Generate a unique reset code using our custom implementation
    const resetCode = CustomPasswordReset.generateResetCode();
    const expiresAt = CustomPasswordReset.generateExpirationTime();
    
    const token: PasswordResetToken = {
      id,
      userId,
      token: resetCode,
      expiresAt,
      createdAt: new Date(),
      used: false
    };
    
    this.passwordResetTokens.set(id, token);
    return token;
  }
  
  // Generate unique reset code without external libraries
  private generateUniqueResetCode(): string {
    const crypto = require('crypto');
    
    // Generate 6 random bytes and convert to hex (12 characters)
    const randomHex = crypto.randomBytes(6).toString('hex');
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36); // Base36 encoding for shorter string
    
    // Combine and create final code
    const resetCode = `${randomHex}${timestamp}`.toUpperCase();
    
    return resetCode;
  }
  
  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const resetToken = Array.from(this.passwordResetTokens.values()).find(
      (resetToken) => resetToken.token === token && !resetToken.used
    );
    
    // Check if token exists and is not expired
    if (resetToken && resetToken.expiresAt > new Date()) {
      return resetToken;
    }
    
    return undefined;
  }
  
  async markTokenAsUsed(tokenId: number): Promise<boolean> {
    const token = this.passwordResetTokens.get(tokenId);
    if (!token) return false;
    
    const updatedToken = { ...token, used: true };
    this.passwordResetTokens.set(tokenId, updatedToken);
    return true;
  }
  
  // Trip methods
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }
  
  async getTripByInviteCode(inviteCode: string): Promise<Trip | undefined> {
    return Array.from(this.trips.values()).find(
      (trip) => trip.inviteCode === inviteCode
    );
  }
  
  async getUserTrips(userId: number): Promise<Trip[]> {
    const userTripIds = Array.from(this.tripMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.tripId);
    
    const trips = Array.from(this.trips.values())
      .filter(trip => userTripIds.includes(trip.id) || trip.createdById === userId);
    
    // Automatically restore trips if their end date extends beyond current date
    for (const trip of trips) {
      if (trip.isPast && trip.endDate) {
        const currentDate = new Date();
        const endDate = new Date(trip.endDate);
        
        // Compare dates without time components
        const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        if (endDateOnly > currentDateOnly) {
          await this.unmarkTripAsPast(trip.id);
          trip.isPast = false; // Update the local copy
        }
      }
    }
    
    return trips;
  }
  
  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = this.currentIds.trip++;
    const trip: Trip = { 
      ...insertTrip, 
      id,
      createdAt: new Date(),
      // Ensure all nullable fields are explicitly set
      location: insertTrip.location ?? null,
      description: insertTrip.description ?? null,
      startDate: insertTrip.startDate ?? null,
      endDate: insertTrip.endDate ?? null,
      tripType: insertTrip.tripType ?? null,
      isPast: insertTrip.isPast ?? false
    };
    this.trips.set(id, trip);
    
    // Automatically add creator as a member
    await this.addTripMember({
      tripId: id,
      userId: insertTrip.createdById
    });
    
    // Create activity
    await this.createActivity({
      tripId: id,
      userId: insertTrip.createdById,
      activityType: 'trip_created',
      activityData: { tripName: insertTrip.name }
    });
    
    return trip;
  }
  
  async updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    
    const updatedTrip = { ...trip, ...updates };
    this.trips.set(id, updatedTrip);
    return updatedTrip;
  }
  
  async markTripAsPast(id: number): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    
    const updatedTrip = { ...trip, isPast: true };
    this.trips.set(id, updatedTrip);
    
    // Create activity
    await this.createActivity({
      tripId: id,
      userId: trip.createdById,
      activityType: 'trip_marked_past',
      activityData: { tripName: trip.name }
    });
    
    return updatedTrip;
  }
  
  async unmarkTripAsPast(id: number): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    
    const updatedTrip = { ...trip, isPast: false };
    this.trips.set(id, updatedTrip);
    
    // Create activity
    await this.createActivity({
      tripId: id,
      userId: trip.createdById,
      activityType: 'trip_restored_active',
      activityData: { tripName: trip.name }
    });
    
    return updatedTrip;
  }
  
  async deleteTrip(id: number): Promise<boolean> {
    // Delete all related data
    await this.deleteAllPackingItems(id);
    await this.deleteAllExpenses(id);
    await this.deleteAllExpenseParticipants(id);
    await this.deleteAllChatMessages(id);
    await this.deleteAllActivities(id);
    await this.deleteTripMembers(id);
    
    // Finally, delete the trip
    return this.trips.delete(id);
  }
  
  // Trip Member methods
  async getTripMembers(tripId: number): Promise<TripMember[]> {
    return Array.from(this.tripMembers.values())
      .filter(member => member.tripId === tripId);
  }
  
  async getTripMember(tripId: number, userId: number): Promise<TripMember | undefined> {
    return Array.from(this.tripMembers.values())
      .find(member => member.tripId === tripId && member.userId === userId);
  }
  
  async addTripMember(insertMember: InsertTripMember): Promise<TripMember> {
    // Check if already a member
    const existingMember = await this.getTripMember(insertMember.tripId, insertMember.userId);
    if (existingMember) return existingMember;
    
    const id = this.currentIds.tripMember++;
    const member: TripMember = {
      ...insertMember,
      id,
      joinedAt: new Date()
    };
    this.tripMembers.set(id, member);
    
    // Create activity
    const user = await this.getUser(insertMember.userId);
    const trip = await this.getTrip(insertMember.tripId);
    if (user && trip) {
      await this.createActivity({
        tripId: insertMember.tripId,
        userId: insertMember.userId,
        activityType: 'member_joined',
        activityData: { 
          memberName: user.displayName,
          tripName: trip.name
        }
      });
    }
    
    return member;
  }
  
  async removeTripMember(tripId: number, userId: number): Promise<boolean> {
    const member = Array.from(this.tripMembers.values())
      .find(m => m.tripId === tripId && m.userId === userId);
    
    if (!member) return false;
    
    return this.tripMembers.delete(member.id);
  }

  async deleteTripMembers(tripId: number): Promise<boolean> {
    let deleted = false;
    
    // Find all members for this trip
    const membersToDelete = Array.from(this.tripMembers.values())
      .filter(member => member.tripId === tripId);
    
    // Delete each member
    for (const member of membersToDelete) {
      this.tripMembers.delete(member.id);
      deleted = true;
    }
    
    return deleted;
  }

  async setTripMemberAdmin(tripId: number, userId: number, isAdmin: boolean): Promise<TripMember | undefined> {
    const member = Array.from(this.tripMembers.values())
      .find(m => m.tripId === tripId && m.userId === userId);
    
    if (member) {
      member.isAdmin = isAdmin;
      this.tripMembers.set(member.id, member);
      return member;
    }
    return undefined;
  }

  async getTripAdmins(tripId: number): Promise<TripMember[]> {
    return Array.from(this.tripMembers.values())
      .filter(member => member.tripId === tripId && member.isAdmin === true);
  }
  
  // Hide/Unhide trip methods for in-memory storage
  async hideTrip(tripId: number, userId: number): Promise<boolean> {
    const member = Array.from(this.tripMembers.values())
      .find(m => m.tripId === tripId && m.userId === userId);
    
    if (member) {
      member.isHidden = true;
      return true;
    }
    return false;
  }
  
  async unhideTrip(tripId: number, userId: number): Promise<boolean> {
    const member = Array.from(this.tripMembers.values())
      .find(m => m.tripId === tripId && m.userId === userId);
    
    if (member) {
      member.isHidden = false;
      return true;
    }
    return false;
  }
  
  async getHiddenTrips(userId: number): Promise<Trip[]> {
    // Get all trip memberships where this user has hidden the trip
    const hiddenMemberships = Array.from(this.tripMembers.values())
      .filter(member => member.userId === userId && member.isHidden === true);
    
    // Get the trip IDs
    const tripIds = hiddenMemberships.map(member => member.tripId);
    
    // Get the actual trip objects
    const hiddenTrips = Array.from(this.trips.values())
      .filter(trip => tripIds.includes(trip.id));
    
    return hiddenTrips;
  }
  
  // Item Category methods
  async getItemCategories(): Promise<ItemCategory[]> {
    return Array.from(this.itemCategories.values());
  }
  
  async getItemCategory(id: number): Promise<ItemCategory | undefined> {
    return this.itemCategories.get(id);
  }
  
  async createItemCategory(insertCategory: InsertItemCategory): Promise<ItemCategory> {
    const id = this.currentIds.itemCategory++;
    const category: ItemCategory = { 
      ...insertCategory, 
      id,
      colorClass: insertCategory.colorClass ?? null 
    };
    this.itemCategories.set(id, category);
    return category;
  }
  
  // Grocery Item methods

  
  // Expense methods
  async getExpenses(tripId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => expense.tripId === tripId);
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }
  
  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.currentIds.expense++;
    const expense: Expense = { 
      ...insertExpense,
      id,
      paidAt: insertExpense.paidAt || new Date(),
      // Set default for nullable field
      category: insertExpense.category ?? null,
      isEncrypted: false
    };
    this.expenses.set(id, expense);
    
    // Create activity
    const user = await this.getUser(insertExpense.addedBy);
    const trip = await this.getTrip(insertExpense.tripId);
    if (user && trip) {
      await this.createActivity({
        tripId: insertExpense.tripId,
        userId: insertExpense.addedBy,
        activityType: 'expense_added',
        activityData: { 
          memberName: user.displayName,
          tripName: trip.name,
          expenseDescription: insertExpense.description,
          amount: insertExpense.amount
        }
      });
    }
    
    return expense;
  }
  
  async updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...updates };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    // First, delete all participants for this expense
    const participantsToDelete = Array.from(this.expenseParticipants.values())
      .filter(participant => participant.expenseId === id);
    
    for (const participant of participantsToDelete) {
      this.expenseParticipants.delete(participant.id);
    }
    
    // Then delete the expense itself
    return this.expenses.delete(id);
  }
  
  async deleteAllExpenses(tripId: number): Promise<boolean> {
    let deleted = false;
    const expenses = Array.from(this.expenses.values())
      .filter(expense => expense.tripId === tripId);
    
    for (const expense of expenses) {
      this.expenses.delete(expense.id);
      deleted = true;
    }
    
    return deleted;
  }
  
  // Expense Participant methods
  async getExpenseParticipants(expenseId: number): Promise<ExpenseParticipant[]> {
    return Array.from(this.expenseParticipants.values())
      .filter(participant => participant.expenseId === expenseId);
  }
  
  async addExpenseParticipant(insertParticipant: InsertExpenseParticipant): Promise<ExpenseParticipant> {
    const id = this.currentIds.expenseParticipant++;
    const participant: ExpenseParticipant = { ...insertParticipant, id };
    this.expenseParticipants.set(id, participant);
    return participant;
  }
  
  async deleteExpenseParticipant(id: number): Promise<boolean> {
    return this.expenseParticipants.delete(id);
  }
  
  async deleteAllExpenseParticipants(tripId: number): Promise<boolean> {
    // First get all expenses for this trip
    const tripExpenses = await this.getExpenses(tripId);
    const expenseIds = tripExpenses.map(expense => expense.id);
    
    let deleted = false;
    
    // Delete participants for each expense
    for (const expenseId of expenseIds) {
      const participants = Array.from(this.expenseParticipants.values())
        .filter(participant => participant.expenseId === expenseId);
      
      for (const participant of participants) {
        this.expenseParticipants.delete(participant.id);
        deleted = true;
      }
    }
    
    return deleted;
  }
  
  // Packing Item methods
  async getPackingItems(tripId: number): Promise<PackingItem[]> {
    return Array.from(this.packingItems.values())
      .filter(item => item.tripId === tripId);
  }
  
  async getPackingItem(id: number): Promise<PackingItem | undefined> {
    return this.packingItems.get(id);
  }
  
  async createPackingItem(insertItem: InsertPackingItem): Promise<PackingItem> {
    const id = this.currentIds.packingItem++;
    const item: PackingItem = { 
      ...insertItem,
      id,
      addedAt: new Date(),
      // Set defaults for optional fields
      quantity: insertItem.quantity ?? null,
      assignedTo: insertItem.assignedTo ?? null,
      isPacked: insertItem.isPacked ?? false,
      isGroupItem: insertItem.isGroupItem ?? false
    };
    this.packingItems.set(id, item);
    return item;
  }
  
  async updatePackingItem(id: number, updates: Partial<PackingItem>): Promise<PackingItem | undefined> {
    const item = this.packingItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...updates };
    this.packingItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deletePackingItem(id: number): Promise<boolean> {
    return this.packingItems.delete(id);
  }
  
  async deleteAllPackingItems(tripId: number): Promise<boolean> {
    let deleted = false;
    const items = Array.from(this.packingItems.values())
      .filter(item => item.tripId === tripId);
    
    for (const item of items) {
      this.packingItems.delete(item.id);
      deleted = true;
    }
    
    return deleted;
  }
  
  // Chat Message methods
  async getChatMessages(tripId: number): Promise<ChatMessage[]> {
    const messages = Array.from(this.chatMessages.values())
      .filter(message => message.tripId === tripId && !message.isDeleted)
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    
    // Decrypt messages before returning
    return await decryptChatMessages(messages);
  }
  
  async getChatMessage(id: number): Promise<ChatMessage | undefined> {
    const message = this.chatMessages.get(id);
    if (!message) return undefined;
    
    // Decrypt message before returning
    return await decryptChatMessage(message);
  }
  
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    // Encrypt the message before storing
    const encryptedMessageData = await encryptChatMessage(insertMessage);
    
    const id = this.currentIds.chatMessage++;
    const message: ChatMessage = { 
      ...encryptedMessageData,
      id,
      sentAt: new Date(),
      // Set defaults for optional fields
      isPoll: insertMessage.isPoll ?? false,
      pollOptions: insertMessage.pollOptions ?? null,
      isEdited: insertMessage.isEdited ?? false,
      editedAt: insertMessage.editedAt ?? null,
      readBy: insertMessage.readBy ?? [],
      reactions: insertMessage.reactions ?? {},
      isDeleted: insertMessage.isDeleted ?? false,
      isEncrypted: true
    };
    this.chatMessages.set(id, message);
    return message;
  }
  
  async updateChatMessage(id: number, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined> {
    const message = this.chatMessages.get(id);
    if (!message) {
      return undefined;
    }
    
    const updatedMessage = {
      ...message,
      ...updates
    };
    
    this.chatMessages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  async deleteAllChatMessages(tripId: number): Promise<boolean> {
    let deleted = false;
    const messages = Array.from(this.chatMessages.values())
      .filter(message => message.tripId === tripId);
    
    for (const message of messages) {
      this.chatMessages.delete(message.id);
      deleted = true;
    }
    
    return deleted;
  }
  
  // Activity methods
  async getTripActivities(tripId: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.tripId === tripId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.currentIds.activity++;
    // Ensure activityData is always defined with a default value
    const activityDataWithDefault = insertActivity.activityData ?? {};
    
    // Create complete activity object with type assertion to satisfy TypeScript
    const activity = {
      ...insertActivity,
      id,
      createdAt: new Date(),
      activityData: activityDataWithDefault
    } as Activity;
    
    this.activities.set(id, activity);
    return activity;
  }
  
  async deleteAllActivities(tripId: number): Promise<boolean> {
    let deleted = false;
    const activities = Array.from(this.activities.values())
      .filter(activity => activity.tripId === tripId);
    
    for (const activity of activities) {
      this.activities.delete(activity.id);
      deleted = true;
    }
    
    return deleted;
  }

  async cleanupOldActivities(): Promise<number> {
    try {
      // Calculate the date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      console.log(`Cleaning up activities older than ${thirtyDaysAgo.toISOString()}`);
      
      // Filter out activities older than 30 days
      const activitiesToDelete = Array.from(this.activities.values())
        .filter(activity => activity.createdAt < thirtyDaysAgo);
      
      // Delete old activities
      for (const activity of activitiesToDelete) {
        this.activities.delete(activity.id);
      }
      
      const deletedCount = activitiesToDelete.length;
      console.log(`Cleaned up ${deletedCount} old activities`);
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old activities:', error);
      return 0;
    }
  }
  
  // Debt Settlement methods
  async getDebtSettlements(tripId: number): Promise<DebtSettlement[]> {
    return Array.from(this.debtSettlements.values())
      .filter(settlement => settlement.tripId === tripId);
  }
  
  async createDebtSettlement(insertSettlement: InsertDebtSettlement): Promise<DebtSettlement> {
    const id = this.currentIds.debtSettlement++;
    const settlement: DebtSettlement = {
      ...insertSettlement,
      id,
      settledAt: new Date(),
      notes: insertSettlement.notes ?? null
    };
    this.debtSettlements.set(id, settlement);
    
    // Create activity
    const owedBy = await this.getUser(insertSettlement.owedById);
    const owedTo = await this.getUser(insertSettlement.owedToId);
    const settledBy = await this.getUser(insertSettlement.settledById);
    const trip = await this.getTrip(insertSettlement.tripId);
    
    if (owedBy && owedTo && settledBy && trip) {
      await this.createActivity({
        tripId: insertSettlement.tripId,
        userId: insertSettlement.settledById,
        activityType: 'debt_settled',
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
  
  async getDebtSettlementsBetweenUsers(tripId: number, user1Id: number, user2Id: number): Promise<DebtSettlement[]> {
    return Array.from(this.debtSettlements.values())
      .filter(settlement => 
        settlement.tripId === tripId && 
        ((settlement.owedById === user1Id && settlement.owedToId === user2Id) ||
         (settlement.owedById === user2Id && settlement.owedToId === user1Id))
      );
  }
  
  async deleteDebtSettlement(id: number): Promise<boolean> {
    return this.debtSettlements.delete(id);
  }
  
  async deleteAllDebtSettlements(tripId: number): Promise<boolean> {
    let deleted = false;
    const settlements = Array.from(this.debtSettlements.values())
      .filter(settlement => settlement.tripId === tripId);
    
    for (const settlement of settlements) {
      this.debtSettlements.delete(settlement.id);
      deleted = true;
    }
    
    return deleted;
  }
}

export class DatabaseStorage implements IStorage {
  // Session store for auth
  public sessionStore: session.Store;
  
  constructor() {
    // Initialize PostgreSQL session store
    const PostgresSessionStore = connectPgFactory(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool: pool, 
      createTableIfMissing: true 
    });
  }

  async hideTrip(tripId: number, userId: number): Promise<boolean> {
    try {
      // Update the trip member record to set isHidden to true
      const [updated] = await db
        .update(tripMembers)
        .set({ isHidden: true })
        .where(and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        ))
        .returning();
      
      return !!updated;
    } catch (error) {
      console.error("Error hiding trip:", error);
      return false;
    }
  }
  
  async unhideTrip(tripId: number, userId: number): Promise<boolean> {
    try {
      // Update the trip member record to set isHidden to false
      const [updated] = await db
        .update(tripMembers)
        .set({ isHidden: false })
        .where(and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        ))
        .returning();
      
      return !!updated;
    } catch (error) {
      console.error("Error unhiding trip:", error);
      return false;
    }
  }
  
  async getHiddenTrips(userId: number): Promise<Trip[]> {
    try {
      console.log(`Fetching hidden trips for user ID: ${userId}`);
      
      // Find trips where the user is a member and has hidden the trip
      const hiddenTripMembers = await db
        .select()
        .from(tripMembers)
        .where(and(
          eq(tripMembers.userId, userId),
          eq(tripMembers.isHidden, true)
        ));
      
      // If no hidden trips, return empty array
      if (hiddenTripMembers.length === 0) {
        console.log(`Retrieved 0 hidden trips for user ${userId}`);
        return [];
      }
      
      // Extract trip IDs
      const tripIds = hiddenTripMembers.map(member => member.tripId);
      
      // Fetch the actual trip data for each trip ID
      const hiddenTrips: Trip[] = [];
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
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    
    // Only decrypt if data is encrypted
    if (user.isEncrypted) {
      try {
        return await decryptUser(user);
      } catch (error) {
        console.error('User decryption error, returning unencrypted data:', error);
        return { ...user, isEncrypted: false };
      }
    }
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return undefined;
    
    // Only decrypt if data is encrypted
    if (user.isEncrypted) {
      try {
        return await decryptUser(user);
      } catch (error) {
        console.error('User decryption error, returning unencrypted data:', error);
        return { ...user, isEncrypted: false };
      }
    }
    
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return undefined;
    
    // Only decrypt if data is encrypted
    if (user.isEncrypted) {
      try {
        return await decryptUser(user);
      } catch (error) {
        console.error('User decryption error, returning unencrypted data:', error);
        return { ...user, isEncrypted: false };
      }
    }
    
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Encrypt user data before storing
    const encryptedUserData = await encryptUser(insertUser);
    
    const [user] = await db
      .insert(users)
      .values({
        ...encryptedUserData,
        isEncrypted: true
      })
      .returning();
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    try {
      console.log(`Updating user ${id} with:`, updates);
      
      // Get raw user data from database to check encryption status
      const [rawUser] = await db.select().from(users).where(eq(users.id, id));
      if (!rawUser) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      let formattedUpdates = { ...updates };
      
      // Encrypt sensitive data if updating encrypted fields on an encrypted user
      if (rawUser.isEncrypted && (updates.displayName !== undefined || updates.email !== undefined)) {
        console.log(`User ${id} is encrypted, encrypting updated fields...`);
        const encryptableUpdates: any = {};
        
        // Only encrypt the fields that are being updated
        if (updates.displayName !== undefined) {
          encryptableUpdates.displayName = updates.displayName;
        }
        if (updates.email !== undefined) {
          encryptableUpdates.email = updates.email;
        }
        
        // Encrypt the sensitive fields
        const encryptedUpdates = await encryptUser(encryptableUpdates);
        console.log(`Encrypted fields for user ${id}:`, Object.keys(encryptedUpdates));
        
        // Merge encrypted updates with other formatted updates
        formattedUpdates = {
          ...formattedUpdates,
          ...encryptedUpdates
        };
      }
      
      console.log(`Formatted updates for user ${id}:`, formattedUpdates);
      
      const [updatedUser] = await db
        .update(users)
        .set(formattedUpdates)
        .where(eq(users.id, id))
        .returning();
        
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
  async createPasswordResetToken(userId: number): Promise<PasswordResetToken> {
    // Generate a unique reset code using our custom implementation
    const resetCode = CustomPasswordReset.generateResetCode();
    const expiresAt = CustomPasswordReset.generateExpirationTime();
    
    const [token] = await db
      .insert(passwordResetTokens)
      .values({
        userId,
        token: resetCode,
        expiresAt,
        used: false
      })
      .returning();
      
    return token;
  }
  
  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const now = new Date();
    
    // Get token that hasn't been used and hasn't expired
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          sql`${passwordResetTokens.expiresAt} > ${now}`
        )
      );
      
    return resetToken || undefined;
  }
  
  async markTokenAsUsed(tokenId: number): Promise<boolean> {
    const result = await db
      .update(passwordResetTokens)
      .set({
        used: true
      })
      .where(eq(passwordResetTokens.id, tokenId));
      
    return result.count > 0;
  }

  private generateInviteCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  async getTrip(id: number): Promise<Trip | undefined> {
    try {
      // Use Drizzle ORM to get the trip
      const [rawTrip] = await db.select().from(trips).where(eq(trips.id, id));
      
      if (!rawTrip) {
        return undefined;
      }
      
      // Only decrypt if data is encrypted, but preserve encryption flag
      if (rawTrip.isEncrypted) {
        try {
          const decrypted = await decryptTrip(rawTrip);
          // IMPORTANT: Keep isEncrypted: true so other methods know to maintain encryption
          return { ...decrypted, isEncrypted: true };
        } catch (error) {
          console.error('Trip decryption error, returning unencrypted data:', error);
          return { ...rawTrip, isEncrypted: false };
        }
      }
      
      return rawTrip;
    } catch (error) {
      console.error(`Error fetching trip ${id}:`, error);
      return undefined;
    }
  }
  
  async getTripByInviteCode(inviteCode: string): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.inviteCode, inviteCode));
    
    // Check if the invite code has expired
    if (trip && trip.inviteCodeExpiresAt) {
      const now = new Date();
      if (now > trip.inviteCodeExpiresAt) {
        // Invite code has expired, invalidate it
        await this.invalidateInviteCode(trip.id);
        return undefined;
      }
    }
    
    return trip || undefined;
  }

  async invalidateInviteCode(tripId: number): Promise<boolean> {
    try {
      const result = await db
        .update(trips)
        .set({ 
          inviteCode: this.generateInviteCode(), // Generate new code to ensure uniqueness
          inviteCodeExpiresAt: null 
        })
        .where(eq(trips.id, tripId));
      return true;
    } catch (error) {
      console.error("Error invalidating invite code:", error);
      return false;
    }
  }

  async updateInviteCodeExpiration(tripId: number, expiresAt: Date | null): Promise<Trip | undefined> {
    try {
      const [updatedTrip] = await db
        .update(trips)
        .set({ inviteCodeExpiresAt: expiresAt })
        .where(eq(trips.id, tripId))
        .returning();
      return updatedTrip || undefined;
    } catch (error) {
      console.error("Error updating invite code expiration:", error);
      return undefined;
    }
  }

  async regenerateInviteCode(tripId: number, expiresAt: Date | null = null): Promise<Trip | undefined> {
    try {
      const newInviteCode = this.generateInviteCode();
      const [updatedTrip] = await db
        .update(trips)
        .set({ 
          inviteCode: newInviteCode,
          inviteCodeExpiresAt: expiresAt 
        })
        .where(eq(trips.id, tripId))
        .returning();
      return updatedTrip || undefined;
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      return undefined;
    }
  }
  
  async getUserTrips(userId: number): Promise<Trip[]> {
    try {
      // Get trips where user is the creator
      const ownedTrips = await db
        .select()
        .from(trips)
        .where(eq(trips.createdById, userId));
      
      // Get trips where user is a member (but not creator) and not hidden by the user
      const memberTripsQuery = await db
        .select()
        .from(trips)
        .innerJoin(tripMembers, eq(trips.id, tripMembers.tripId))
        .where(and(
          eq(tripMembers.userId, userId),
          eq(tripMembers.isHidden, false)
        ));
      
      // Extract just the trip part from the join result
      const memberTrips = memberTripsQuery.map(row => row.trips);
      
      // Combine and deduplicate
      const allTrips = [...ownedTrips, ...memberTrips];
      const uniqueTrips = allTrips.filter((trip, index, self) => 
        index === self.findIndex(t => t.id === trip.id)
      );
      
      // Decrypt all trips before returning but preserve encryption status
      const decryptedTrips = await Promise.all(
        uniqueTrips.map(async (trip) => {
          if (trip.isEncrypted) {
            try {
              const decrypted = await decryptTrip(trip);
              // Keep the original encryption flag so updateTrip knows to maintain encryption
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
      return []; // Return empty array on error
    }
  }
  
  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    console.log(`Creating trip for user ID: ${insertTrip.createdById}`, insertTrip);
    
    let trip;
    
    try {
      // Encrypt trip data before storing (including dates and invite code)
      console.log('Encrypting trip data...');
      const encryptedTripData = await encryptTrip(insertTrip);
      console.log('Trip data encrypted successfully:', {
        originalName: insertTrip.name,
        encryptedName: encryptedTripData.name?.substring(0, 20) + '...',
        hasEncryptedLocation: !!encryptedTripData.location,
        hasEncryptedDescription: !!encryptedTripData.description,
        hasEncryptedStartDate: !!encryptedTripData.startDate,
        hasEncryptedEndDate: !!encryptedTripData.endDate,
        hasEncryptedInviteCode: !!encryptedTripData.inviteCode
      });
      
      // Use the encrypted data directly - dates and invite codes are already encrypted
      const formattedTrip = {
        ...encryptedTripData,
        isEncrypted: true
      };
      
      console.log('Formatted trip for database insertion:', {
        ...formattedTrip,
        name: formattedTrip.name?.substring(0, 20) + '...',
        location: formattedTrip.location?.substring(0, 20) + '...',
        description: formattedTrip.description?.substring(0, 20) + '...'
      });
      
      [trip] = await db
        .insert(trips)
        .values(formattedTrip)
        .returning();
        
      console.log(`Trip created successfully with ID: ${trip.id}`);
      
    } catch (encryptionError) {
      console.error('Trip encryption failed, creating unencrypted trip:', encryptionError);
      
      // Fallback: create unencrypted trip
      const fallbackTrip = {
        ...insertTrip,
        isEncrypted: false,
        startDate: insertTrip.startDate instanceof Date 
          ? insertTrip.startDate.toISOString().split('T')[0] 
          : insertTrip.startDate,
        endDate: insertTrip.endDate instanceof Date 
          ? insertTrip.endDate.toISOString().split('T')[0] 
          : insertTrip.endDate
      };
      
      [trip] = await db
        .insert(trips)
        .values(fallbackTrip)
        .returning();
        
      console.log(`Fallback trip created successfully with ID: ${trip.id}`);
    }
      
    // Automatically add creator as a member
    await this.addTripMember({
      tripId: trip.id,
      userId: insertTrip.createdById
    });
    
    console.log(`Creator (user ID: ${insertTrip.createdById}) added as member of trip ${trip.id}`);
    
    // Create activity (use original name for activity logging)
    await this.createActivity({
      tripId: trip.id,
      userId: insertTrip.createdById,
      activityType: 'trip_created',
      activityData: { tripName: insertTrip.name }
    });
    
    console.log(`Trip created activity logged for trip ${trip.id}`);
    
    // Verify the trip exists in the database
    const verifyTrip = await this.getTrip(trip.id);
    console.log(`Verification - Trip exists in database: ${!!verifyTrip}`);
    
    // Return the original unencrypted trip data for the frontend
    // This ensures success messages show readable trip names
    // But preserve encryption flag so updates maintain encryption
    return {
      ...trip,
      name: insertTrip.name,
      description: insertTrip.description,
      location: insertTrip.location,
      isEncrypted: true // Keep encryption flag so updates work correctly
    };
  }
  
  async updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined> {
    try {
      console.log(`Updating trip ${id} with:`, updates);
      
      // Check if this trip should be encrypted
      const existingTrip = await this.getTrip(id);
      if (!existingTrip) return undefined;
      
      // Format date fields for the database (Postgres date column)
      let formattedUpdates = { ...updates };
      
      if (updates.startDate !== undefined) {
        // Handle both Date objects and ISO strings
        if (typeof updates.startDate === 'object' && updates.startDate instanceof Date) {
          formattedUpdates.startDate = updates.startDate.toISOString().split('T')[0];
        } else if (typeof updates.startDate === 'string') {
          // If it's a string, ensure it's in YYYY-MM-DD format
          const date = new Date(updates.startDate);
          formattedUpdates.startDate = date.toISOString().split('T')[0];
        } else {
          formattedUpdates.startDate = updates.startDate; // null case
        }
      }
      
      if (updates.endDate !== undefined) {
        // Handle both Date objects and ISO strings
        if (typeof updates.endDate === 'object' && updates.endDate instanceof Date) {
          formattedUpdates.endDate = updates.endDate.toISOString().split('T')[0];
        } else if (typeof updates.endDate === 'string') {
          // If it's a string, ensure it's in YYYY-MM-DD format
          const date = new Date(updates.endDate);
          formattedUpdates.endDate = date.toISOString().split('T')[0];
        } else {
          formattedUpdates.endDate = updates.endDate; // null case
        }
      }
      
      // Encrypt sensitive data if updating fields on an encrypted trip
      if (existingTrip.isEncrypted && (
        updates.name !== undefined || 
        updates.description !== undefined || 
        updates.location !== undefined ||
        updates.startDate !== undefined ||
        updates.endDate !== undefined ||
        updates.inviteCode !== undefined
      )) {
        console.log(`Trip ${id} is encrypted, encrypting updated fields...`);
        const encryptableUpdates: any = {};
        
        // Only encrypt the fields that are being updated
        if (updates.name !== undefined) {
          encryptableUpdates.name = updates.name;
        }
        if (updates.description !== undefined) {
          encryptableUpdates.description = updates.description;
        }
        if (updates.location !== undefined) {
          encryptableUpdates.location = updates.location;
        }
        if (updates.startDate !== undefined) {
          encryptableUpdates.startDate = updates.startDate;
        }
        if (updates.endDate !== undefined) {
          encryptableUpdates.endDate = updates.endDate;
        }
        if (updates.inviteCode !== undefined) {
          encryptableUpdates.inviteCode = updates.inviteCode;
        }
        
        // Encrypt the sensitive fields
        const encryptedUpdates = await encryptTrip(encryptableUpdates);
        console.log(`Encrypted fields for trip ${id}:`, Object.keys(encryptedUpdates));
        
        // Merge encrypted updates with other formatted updates, but use encrypted dates
        formattedUpdates = {
          ...formattedUpdates,
          ...encryptedUpdates
        };
      }
      
      console.log(`Formatted updates for trip ${id}:`, formattedUpdates);
      
      // Update the trip with the formatted values
      const [updatedTrip] = await db
        .update(trips)
        .set(formattedUpdates)
        .where(eq(trips.id, id))
        .returning();
        
      if (updatedTrip) {
        return updatedTrip;
      }
      return undefined;
    } catch (error) {
      console.error(`Error updating trip ${id}:`, error);
      return undefined;
    }
  }
  
  async markTripAsPast(id: number): Promise<Trip | undefined> {
    try {
      // Get the trip first to make sure it exists
      const trip = await this.getTrip(id);
      if (!trip) return undefined;
      
      // Use the Drizzle ORM to update the isPast field
      const [updatedTrip] = await db
        .update(trips)
        .set({ isPast: true })
        .where(eq(trips.id, id))
        .returning();
      
      if (!updatedTrip) return undefined;
      
      // Create activity for marking as past
      await this.createActivity({
        tripId: id,
        userId: trip.createdById,
        activityType: 'trip_marked_past',
        activityData: { tripName: trip.name }
      });
      
      return updatedTrip;
    } catch (error) {
      console.error(`Error marking trip ${id} as past:`, error);
      return undefined;
    }
  }
  
  async unmarkTripAsPast(id: number): Promise<Trip | undefined> {
    try {
      // Get the trip first to make sure it exists
      const trip = await this.getTrip(id);
      if (!trip) return undefined;
      
      // Use the Drizzle ORM to update the isPast field to false
      const [updatedTrip] = await db
        .update(trips)
        .set({ isPast: false })
        .where(eq(trips.id, id))
        .returning();
      
      if (!updatedTrip) return undefined;
      
      // Create activity for unmarking as past (restoring to active)
      await this.createActivity({
        tripId: id,
        userId: trip.createdById,
        activityType: 'trip_restored_active',
        activityData: { tripName: trip.name }
      });
      
      return updatedTrip;
    } catch (error) {
      console.error(`Error unmarking trip ${id} as past:`, error);
      return undefined;
    }
  }
  
  async deleteTrip(id: number): Promise<boolean> {
    try {
      // Delete all related data
      await this.deleteAllPackingItems(id);
      await this.deleteAllExpenses(id);
      await this.deleteAllExpenseParticipants(id);
      await this.deleteAllChatMessages(id);
      await this.deleteAllActivities(id);
      await this.deleteTripMembers(id);
      
      // Finally, delete the trip
      const result = await db
        .delete(trips)
        .where(eq(trips.id, id))
        .returning({ id: trips.id });
      
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting trip ${id}:`, error);
      return false;
    }
  }
  
  async getTripMembers(tripId: number): Promise<TripMember[]> {
    return db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId));
  }
  
  async getTripMember(tripId: number, userId: number): Promise<TripMember | undefined> {
    const [member] = await db
      .select()
      .from(tripMembers)
      .where(
        and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        )
      );
    return member || undefined;
  }
  
  async addTripMember(insertMember: InsertTripMember): Promise<TripMember> {
    // Check if already a member
    const existingMember = await this.getTripMember(insertMember.tripId, insertMember.userId);
    if (existingMember) return existingMember;
    
    // Ensure isHidden is explicitly set to false for new members
    const memberData = {
      ...insertMember,
      isHidden: insertMember.isHidden ?? false
    };
    
    const [member] = await db
      .insert(tripMembers)
      .values(memberData)
      .returning();
      
    // Create activity
    const user = await this.getUser(insertMember.userId);
    const trip = await this.getTrip(insertMember.tripId);
    if (user && trip) {
      await this.createActivity({
        tripId: insertMember.tripId,
        userId: insertMember.userId,
        activityType: 'member_joined',
        activityData: { 
          memberName: user.displayName,
          tripName: trip.name
        }
      });
    }
      
    return member;
  }

  async removeTripMember(tripId: number, userId: number): Promise<boolean> {
    // Get user and trip info for activity logging
    const user = await this.getUser(userId);
    const trip = await this.getTrip(tripId);
    
    const result = await db
      .delete(tripMembers)
      .where(and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.userId, userId)
      ))
      .returning({ id: tripMembers.id });
      
    if (result.length > 0 && user && trip) {
      // Create activity for member leaving
      await this.createActivity({
        tripId,
        userId,
        activityType: 'member_left',
        activityData: { 
          memberName: user.displayName,
          tripName: trip.name
        }
      });
    }
      
    return result.length > 0;
  }

  async setTripMemberAdmin(tripId: number, userId: number, isAdmin: boolean): Promise<TripMember | undefined> {
    try {
      const [updatedMember] = await db
        .update(tripMembers)
        .set({ isAdmin })
        .where(and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        ))
        .returning();

      if (updatedMember) {
        // Create activity for admin role change
        const user = await this.getUser(userId);
        const trip = await this.getTrip(tripId);
        if (user && trip) {
          await this.createActivity({
            tripId,
            userId,
            activityType: isAdmin ? 'member_promoted_admin' : 'member_demoted_admin',
            activityData: { 
              memberName: user.displayName,
              tripName: trip.name
            }
          });
        }
      }

      return updatedMember || undefined;
    } catch (error) {
      console.error(`Error setting admin status for user ${userId} in trip ${tripId}:`, error);
      return undefined;
    }
  }

  async getTripAdmins(tripId: number): Promise<TripMember[]> {
    return db.select().from(tripMembers).where(
      and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.isAdmin, true)
      )
    );
  }
  
  async getItemCategories(): Promise<ItemCategory[]> {
    return db.select().from(itemCategories);
  }
  
  async getItemCategory(id: number): Promise<ItemCategory | undefined> {
    const [category] = await db
      .select()
      .from(itemCategories)
      .where(eq(itemCategories.id, id));
    return category || undefined;
  }
  
  async createItemCategory(insertCategory: InsertItemCategory): Promise<ItemCategory> {
    const [category] = await db
      .insert(itemCategories)
      .values(insertCategory)
      .returning();
    return category;
  }
  

  
  async getExpenses(tripId: number): Promise<Expense[]> {
    const expenseResults = await db
      .select()
      .from(expenses)
      .where(eq(expenses.tripId, tripId));
    
    // Decrypt each expense if encrypted
    const decryptedExpenses = await Promise.all(
      expenseResults.map(async (expense) => {
        if (expense.isEncrypted) {
          try {
            return await decryptExpense(expense);
          } catch (error) {
            console.error('Expense decryption error:', error);
            return { ...expense, description: '[Expense description could not be decrypted]', isEncrypted: false };
          }
        }
        return expense;
      })
    );
    
    return decryptedExpenses;
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    
    if (!expense) return undefined;
    
    // Decrypt expense if encrypted
    if (expense.isEncrypted) {
      try {
        return await decryptExpense(expense);
      } catch (error) {
        console.error('Expense decryption error:', error);
        return { ...expense, description: '[Expense description could not be decrypted]', isEncrypted: false };
      }
    }
    
    return expense;
  }
  
  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    // Encrypt expense data before storing
    const encryptedExpenseData = await encryptExpense(insertExpense);
    
    const [expense] = await db
      .insert(expenses)
      .values({
        ...encryptedExpenseData,
        isEncrypted: true
      })
      .returning();
      
    // Create activity (use original description for activity logging)
    const user = await this.getUser(insertExpense.addedBy);
    const trip = await this.getTrip(insertExpense.tripId);
    if (user && trip) {
      await this.createActivity({
        tripId: insertExpense.tripId,
        userId: insertExpense.addedBy,
        activityType: 'expense_added',
        activityData: { 
          memberName: user.displayName,
          tripName: trip.name,
          expenseDescription: insertExpense.description,
          amount: insertExpense.amount
        }
      });
    }
    
    // Decrypt the expense before returning it to the client
    return await decryptExpense(expense);
  }
  
  async getExpenseParticipants(expenseId: number): Promise<ExpenseParticipant[]> {
    return db
      .select()
      .from(expenseParticipants)
      .where(eq(expenseParticipants.expenseId, expenseId));
  }
  
  async addExpenseParticipant(insertParticipant: InsertExpenseParticipant): Promise<ExpenseParticipant> {
    const [participant] = await db
      .insert(expenseParticipants)
      .values(insertParticipant)
      .returning();
    return participant;
  }
  
  async deleteExpenseParticipant(id: number): Promise<boolean> {
    const result = await db
      .delete(expenseParticipants)
      .where(eq(expenseParticipants.id, id));
    
    return !!result.rowCount && result.rowCount > 0;
  }
  
  async getPackingItems(tripId: number, userId?: number): Promise<PackingItem[]> {
    // If userId is provided, filter personal items by that user
    // This allows the API endpoint to get only the appropriate personal items
    console.time(`[DB] Packing items query for trip ${tripId}`);
    
    try {
      let query;
      
      if (userId) {
        // Following the same logic as expenses:
        // 1. Show all group items
        // 2. Show personal items only for the current user
        query = db
          .select()
          .from(packingItems)
          .where(
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
          )
          .orderBy(packingItems.id);
      } else {
        // For backward compatibility and admin purposes
        query = db
          .select()
          .from(packingItems)
          .where(eq(packingItems.tripId, tripId))
          .orderBy(packingItems.id);
      }
      
      const items = await query;
      
      // Decrypt each item if encrypted
      const decryptedItems = await Promise.all(
        items.map(async (item) => {
          if (item.isEncrypted) {
            try {
              return await decryptPackingItem(item);
            } catch (error) {
              console.error('Packing item decryption error:', error);
              return { ...item, name: '[Item name could not be decrypted]', isEncrypted: false };
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
  
  async getPackingItem(id: number): Promise<PackingItem | undefined> {
    const [item] = await db
      .select()
      .from(packingItems)
      .where(eq(packingItems.id, id));
    
    if (!item) return undefined;
    
    // Decrypt item if encrypted
    if (item.isEncrypted) {
      try {
        return await decryptPackingItem(item);
      } catch (error) {
        console.error('Packing item decryption error:', error);
        return { ...item, name: '[Item name could not be decrypted]', isEncrypted: false };
      }
    }
    
    return item;
  }
  
  async createPackingItem(insertItem: InsertPackingItem): Promise<PackingItem> {
    // Encrypt packing item data before storing
    const encryptedItemData = await encryptPackingItem(insertItem);
    
    // Make sure quantity field is properly handled
    const itemWithDefaults = {
      ...encryptedItemData,
      quantity: insertItem.quantity || null,
      isEncrypted: true
    };
    
    const [item] = await db
      .insert(packingItems)
      .values(itemWithDefaults)
      .returning();
    
    // Decrypt the item before returning it to the client
    return await decryptPackingItem(item);
  }
  
  async updatePackingItem(id: number, updates: Partial<PackingItem>): Promise<PackingItem | undefined> {
    // First get the raw item data without decryption to avoid errors
    const [item] = await db
      .select()
      .from(packingItems)
      .where(eq(packingItems.id, id));
    
    if (!item) return undefined;
    
    // Check if we're updating the name and need to encrypt it
    let processedUpdates = { ...updates };
    
    if (updates.name !== undefined) {
      // Always encrypt the new name content for security
      const encryptedItem = await encryptPackingItem({ name: updates.name });
      processedUpdates.name = encryptedItem.name;
      processedUpdates.isEncrypted = true;
    }
    
    const [updatedItem] = await db
      .update(packingItems)
      .set(processedUpdates)
      .where(eq(packingItems.id, id))
      .returning();
    
    if (!updatedItem) return undefined;
    
    // Decrypt the item before returning it to the client
    if (updatedItem.isEncrypted) {
      try {
        return await decryptPackingItem(updatedItem);
      } catch (error) {
        console.error('Packing item decryption error:', error);
        return { ...updatedItem, name: '[Item name could not be decrypted]', isEncrypted: false };
      }
    }
    
    return updatedItem;
  }
  
  async deletePackingItem(id: number): Promise<boolean> {
    const result = await db
      .delete(packingItems)
      .where(eq(packingItems.id, id))
      .returning({ id: packingItems.id });
    return result.length > 0;
  }
  
  async getChatMessages(tripId: number): Promise<ChatMessage[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.tripId, tripId),
        eq(chatMessages.isDeleted, false)
      ))
      .orderBy(chatMessages.sentAt);
    
    // Decrypt messages before returning
    return await decryptChatMessages(messages);
  }
  
  async getChatMessage(id: number): Promise<ChatMessage | undefined> {
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, id));
    
    if (!message) return undefined;
    
    // Decrypt message before returning
    return await decryptChatMessage(message);
  }
  
  async updateChatMessage(id: number, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined> {
    // Check if we're updating the message content and need to encrypt it
    let processedUpdates = { ...updates };
    
    if (updates.message !== undefined) {
      // Get the original message to check if it's encrypted
      const [originalMessage] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
      
      if (originalMessage && originalMessage.isEncrypted) {
        // Encrypt the new message content
        const encryptedMessage = await encryptChatMessage({ message: updates.message });
        processedUpdates.message = encryptedMessage.message;
        processedUpdates.isEncrypted = true;
      }
    }
    
    const [updatedMessage] = await db
      .update(chatMessages)
      .set(processedUpdates)
      .where(eq(chatMessages.id, id))
      .returning();
    
    if (!updatedMessage) return undefined;
    
    // Decrypt the message before returning it to the client
    return await decryptChatMessage(updatedMessage);
  }
  
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    // Encrypt the message before storing
    const encryptedMessageData = await encryptChatMessage(insertMessage);
    
    const [message] = await db
      .insert(chatMessages)
      .values(encryptedMessageData)
      .returning();
    
    // Decrypt the message before returning
    return await decryptChatMessage(message);
  }
  
  async getTripActivities(tripId: number): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(eq(activities.tripId, tripId))
      .orderBy(desc(activities.createdAt));
  }
  
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return activity;
  }

  async cleanupOldActivities(): Promise<number> {
    try {
      // Calculate the date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      console.log(`Cleaning up activities older than ${thirtyDaysAgo.toISOString()}`);
      
      // Delete activities older than 30 days
      const result = await db
        .delete(activities)
        .where(sql`${activities.createdAt} < ${thirtyDaysAgo}`)
        .returning({ id: activities.id });
      
      const deletedCount = result.length;
      console.log(`Cleaned up ${deletedCount} old activities`);
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old activities:', error);
      return 0;
    }
  }
  
  async updateExpense(id: number, updates: Partial<Expense>): Promise<Expense | undefined> {
    // First get the raw expense data without decryption to avoid errors
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    
    if (!expense) return undefined;
    
    // Check if we're updating the description and need to encrypt it
    let processedUpdates = { ...updates };
    
    if (updates.description !== undefined) {
      // Always encrypt the new description content for security
      const encryptedExpense = await encryptExpense({ description: updates.description });
      processedUpdates.description = encryptedExpense.description;
      processedUpdates.isEncrypted = true;
    }
    
    // Update the expense
    const [updatedExpense] = await db
      .update(expenses)
      .set(processedUpdates)
      .where(eq(expenses.id, id))
      .returning();
    
    if (!updatedExpense) return undefined;
    
    // Decrypt the expense before returning it to the client
    if (updatedExpense.isEncrypted) {
      try {
        return await decryptExpense(updatedExpense);
      } catch (error) {
        console.error('Expense decryption error:', error);
        return { ...updatedExpense, description: '[Expense description could not be decrypted]', isEncrypted: false };
      }
    }
    
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    // First, delete all participants for this expense
    await db
      .delete(expenseParticipants)
      .where(eq(expenseParticipants.expenseId, id));
    
    // Then delete the expense itself
    const result = await db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id });
    
    return result.length > 0;
  }
  
  async deleteAllExpenses(tripId: number): Promise<boolean> {
    const result = await db
      .delete(expenses)
      .where(eq(expenses.tripId, tripId))
      .returning({ id: expenses.id });
    return result.length > 0;
  }
  
  async deleteAllExpenseParticipants(tripId: number): Promise<boolean> {
    // Get all expenses for this trip first
    const tripExpenses = await this.getExpenses(tripId);
    const expenseIds = tripExpenses.map(expense => expense.id);
    
    if (expenseIds.length === 0) return false;
    
    // Delete all participants for these expenses
    let deleted = false;
    for (const expenseId of expenseIds) {
      const result = await db
        .delete(expenseParticipants)
        .where(eq(expenseParticipants.expenseId, expenseId))
        .returning({ id: expenseParticipants.id });
      
      if (result.length > 0) deleted = true;
    }
    
    return deleted;
  }
  
  async deleteAllPackingItems(tripId: number): Promise<boolean> {
    const result = await db
      .delete(packingItems)
      .where(eq(packingItems.tripId, tripId))
      .returning({ id: packingItems.id });
    return result.length > 0;
  }
  
  async deleteAllChatMessages(tripId: number): Promise<boolean> {
    const result = await db
      .delete(chatMessages)
      .where(eq(chatMessages.tripId, tripId))
      .returning({ id: chatMessages.id });
    return result.length > 0;
  }
  
  async deleteAllActivities(tripId: number): Promise<boolean> {
    const result = await db
      .delete(activities)
      .where(eq(activities.tripId, tripId))
      .returning({ id: activities.id });
    return result.length > 0;
  }
  
  async deleteTripMembers(tripId: number): Promise<boolean> {
    const result = await db
      .delete(tripMembers)
      .where(eq(tripMembers.tripId, tripId))
      .returning({ id: tripMembers.id });
    return result.length > 0;
  }
  
  // Hide Trip implementation
  async hideTrip(tripId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(tripMembers)
        .set({ isHidden: true })
        .where(and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        ))
        .returning({ id: tripMembers.id });
        
      return result.length > 0;
    } catch (error) {
      console.error(`Error hiding trip ${tripId} for user ${userId}:`, error);
      return false;
    }
  }
  
  // Unhide Trip implementation
  async unhideTrip(tripId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(tripMembers)
        .set({ isHidden: false })
        .where(and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        ))
        .returning({ id: tripMembers.id });
        
      return result.length > 0;
    } catch (error) {
      console.error(`Error unhiding trip ${tripId} for user ${userId}:`, error);
      return false;
    }
  }
  
  // Get Hidden Trips implementation
  async getHiddenTrips(userId: number): Promise<Trip[]> {
    try {
      // Get all trips that are hidden for this user
      const hiddenTripsQuery = await db
        .select()
        .from(trips)
        .innerJoin(tripMembers, eq(trips.id, tripMembers.tripId))
        .where(and(
          eq(tripMembers.userId, userId),
          eq(tripMembers.isHidden, true)
        ));
        
      // Extract just the trips
      const hiddenTrips = hiddenTripsQuery.map(row => row.trips);
      
      return hiddenTrips;
    } catch (error) {
      console.error(`Error fetching hidden trips for user ${userId}:`, error);
      return [];
    }
  }
  
  // Debt Settlement methods
  async getDebtSettlements(tripId: number): Promise<DebtSettlement[]> {
    const settlements = await db
      .select()
      .from(debtSettlements)
      .where(eq(debtSettlements.tripId, tripId))
      .orderBy(desc(debtSettlements.settledAt));
    return settlements;
  }
  
  async createDebtSettlement(insertSettlement: InsertDebtSettlement): Promise<DebtSettlement> {
    const [settlement] = await db
      .insert(debtSettlements)
      .values(insertSettlement)
      .returning();
    
    // Create activity
    const owedBy = await this.getUser(insertSettlement.owedById);
    const owedTo = await this.getUser(insertSettlement.owedToId);
    const settledBy = await this.getUser(insertSettlement.settledById);
    const trip = await this.getTrip(insertSettlement.tripId);
    
    if (owedBy && owedTo && settledBy && trip) {
      await this.createActivity({
        tripId: insertSettlement.tripId,
        userId: insertSettlement.settledById,
        activityType: 'debt_settled',
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
  
  async getDebtSettlementsBetweenUsers(tripId: number, user1Id: number, user2Id: number): Promise<DebtSettlement[]> {
    const settlements = await db
      .select()
      .from(debtSettlements)
      .where(
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
      )
      .orderBy(desc(debtSettlements.settledAt));
    return settlements;
  }
  
  async deleteDebtSettlement(id: number): Promise<boolean> {
    const result = await db
      .delete(debtSettlements)
      .where(eq(debtSettlements.id, id))
      .returning({ id: debtSettlements.id });
    return result.length > 0;
  }
  
  async deleteAllDebtSettlements(tripId: number): Promise<boolean> {
    const result = await db
      .delete(debtSettlements)
      .where(eq(debtSettlements.tripId, tripId))
      .returning({ id: debtSettlements.id });
    return result.length > 0;
  }

  // Spending Margin methods
  async getSpendingMargin(tripId: number, userId: number) {
    const [margin] = await db
      .select()
      .from(spendingMargins)
      .where(and(eq(spendingMargins.tripId, tripId), eq(spendingMargins.userId, userId)));
    return margin;
  }

  async setSpendingMargin(tripId: number, userId: number, budgetLimit: number, warningThreshold: number = 0.8) {
    const [margin] = await db
      .insert(spendingMargins)
      .values({
        tripId,
        userId,
        budgetLimit,
        warningThreshold,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [spendingMargins.tripId, spendingMargins.userId],
        set: {
          budgetLimit,
          warningThreshold,
          updatedAt: new Date()
        }
      })
      .returning();
    return margin;
  }

  async updateSpendingMargin(tripId: number, userId: number, budgetLimit: number, warningThreshold: number = 0.8) {
    const [margin] = await db
      .update(spendingMargins)
      .set({
        budgetLimit,
        warningThreshold,
        updatedAt: new Date()
      })
      .where(and(eq(spendingMargins.tripId, tripId), eq(spendingMargins.userId, userId)))
      .returning();
    return margin;
  }

  async deleteSpendingMargin(tripId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(spendingMargins)
      .where(and(eq(spendingMargins.tripId, tripId), eq(spendingMargins.userId, userId)))
      .returning({ id: spendingMargins.id });
    return result.length > 0;
  }

  // Itinerary methods
  async getItineraryDays(tripId: number): Promise<ItineraryDay[]> {
    const days = await db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.tripId, tripId))
      .orderBy(itineraryDays.date);
    
    // Decrypt days if encrypted
    const decryptedDays = [];
    for (const day of days) {
      if (day.isEncrypted) {
        try {
          // Basic decryption for title
          const decryptedDay = { ...day, title: day.title }; // TODO: Add decryption if needed
          decryptedDays.push(decryptedDay);
        } catch (error) {
          console.error('Day decryption error:', error);
          decryptedDays.push({ ...day, title: '[Title could not be decrypted]', isEncrypted: false });
        }
      } else {
        decryptedDays.push(day);
      }
    }
    
    return decryptedDays;
  }

  async getItineraryDay(id: number): Promise<ItineraryDay | undefined> {
    const [day] = await db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.id, id));
    
    if (!day) return undefined;
    
    // Decrypt day if encrypted
    if (day.isEncrypted) {
      try {
        return { ...day, title: day.title }; // TODO: Add decryption if needed
      } catch (error) {
        console.error('Day decryption error:', error);
        return { ...day, title: '[Title could not be decrypted]', isEncrypted: false };
      }
    }
    
    return day;
  }

  async createItineraryDay(insertDay: InsertItineraryDay): Promise<ItineraryDay> {
    const [day] = await db
      .insert(itineraryDays)
      .values({
        ...insertDay,
        isEncrypted: true
      })
      .returning();
      
    // Create activity
    await this.createActivity({
      tripId: insertDay.tripId,
      userId: insertDay.createdBy,
      activityType: 'itinerary_day_created',
      activityData: { 
        dayTitle: insertDay.title,
        date: insertDay.date
      }
    });
    
    return day;
  }

  async updateItineraryDay(id: number, updates: Partial<ItineraryDay>): Promise<ItineraryDay | undefined> {
    const [updatedDay] = await db
      .update(itineraryDays)
      .set(updates)
      .where(eq(itineraryDays.id, id))
      .returning();
      
    return updatedDay;
  }

  async deleteItineraryDay(id: number): Promise<boolean> {
    // First delete all activities for this day
    await db
      .delete(itineraryActivities)
      .where(eq(itineraryActivities.dayId, id));
    
    // Then delete the day itself
    const result = await db
      .delete(itineraryDays)
      .where(eq(itineraryDays.id, id))
      .returning({ id: itineraryDays.id });
    
    return result.length > 0;
  }

  async deleteAllItineraryDays(tripId: number): Promise<boolean> {
    // First delete all activities for all days in this trip
    await db
      .delete(itineraryActivities)
      .where(eq(itineraryActivities.tripId, tripId));
    
    // Then delete all days for this trip
    const result = await db
      .delete(itineraryDays)
      .where(eq(itineraryDays.tripId, tripId))
      .returning({ id: itineraryDays.id });
    
    return result.length > 0;
  }

  async getItineraryActivities(dayId?: number, tripId?: number): Promise<ItineraryActivity[]> {
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
    
    const activities = await query.orderBy(itineraryActivities.sortOrder);
    
    // Decrypt activities if encrypted
    const decryptedActivities = [];
    for (const activity of activities) {
      try {
        const decryptedActivity = await decryptItineraryActivity(activity);
        decryptedActivities.push(decryptedActivity);
      } catch (error) {
        console.error('Activity decryption error:', error);
        decryptedActivities.push({ 
          ...activity, 
          title: '[Title could not be decrypted]', 
          description: '[Description could not be decrypted]',
          location: '[Location could not be decrypted]',
          isEncrypted: false 
        });
      }
    }
    
    return decryptedActivities;
  }

  async getItineraryActivity(id: number): Promise<ItineraryActivity | undefined> {
    const [activity] = await db
      .select()
      .from(itineraryActivities)
      .where(eq(itineraryActivities.id, id));
    
    if (!activity) return undefined;
    
    // Decrypt activity if encrypted
    try {
      return await decryptItineraryActivity(activity);
    } catch (error) {
      console.error('Activity decryption error:', error);
      return { 
        ...activity, 
        title: '[Title could not be decrypted]',
        description: '[Description could not be decrypted]',
        location: '[Location could not be decrypted]',
        isEncrypted: false 
      };
    }
  }

  async createItineraryActivity(insertActivity: InsertItineraryActivity): Promise<ItineraryActivity> {
    // Encrypt the activity before storing
    const encryptedActivityData = await encryptItineraryActivity(insertActivity);
    
    const [activity] = await db
      .insert(itineraryActivities)
      .values(encryptedActivityData)
      .returning();
      
    // Create activity log
    await this.createActivity({
      tripId: insertActivity.tripId,
      userId: insertActivity.createdBy,
      activityType: 'itinerary_activity_added',
      activityData: { 
        activityTitle: insertActivity.title,
        category: insertActivity.category
      }
    });
    
    // Return decrypted activity for immediate use
    return await decryptItineraryActivity(activity);
  }

  async updateItineraryActivity(id: number, updates: Partial<ItineraryActivity>): Promise<ItineraryActivity | undefined> {
    // Remove timestamp fields from updates that might cause issues
    const { createdAt, updatedAt, ...safeUpdates } = updates;
    
    // Check if we're updating encrypted fields and need to encrypt them
    let processedUpdates = { ...safeUpdates };
    
    if (updates.title !== undefined || updates.description !== undefined || updates.location !== undefined) {
      // Always encrypt the new data for security
      const encryptedUpdates = await encryptItineraryActivity({
        title: updates.title,
        description: updates.description,
        location: updates.location
      });
      
      if (updates.title !== undefined) processedUpdates.title = encryptedUpdates.title;
      if (updates.description !== undefined) processedUpdates.description = encryptedUpdates.description;
      if (updates.location !== undefined) processedUpdates.location = encryptedUpdates.location;
      processedUpdates.isEncrypted = true;
    }
    
    processedUpdates.updatedAt = new Date();
    
    console.log('Updating itinerary activity with data:', processedUpdates);
    
    const [updatedActivity] = await db
      .update(itineraryActivities)
      .set(processedUpdates)
      .where(eq(itineraryActivities.id, id))
      .returning();
      
    if (!updatedActivity) return undefined;
    
    // Return decrypted activity for immediate use
    return await decryptItineraryActivity(updatedActivity);
  }

  async deleteItineraryActivity(id: number): Promise<boolean> {
    console.log(`Storage: Deleting itinerary activity with ID ${id}`);
    
    // First delete all votes for this activity
    const votesDeleted = await db
      .delete(itineraryActivityVotes)
      .where(eq(itineraryActivityVotes.activityId, id))
      .returning({ id: itineraryActivityVotes.id });
    
    console.log(`Storage: Deleted ${votesDeleted.length} votes for activity ${id}`);
    
    // Then delete the activity itself
    const result = await db
      .delete(itineraryActivities)
      .where(eq(itineraryActivities.id, id))
      .returning({ id: itineraryActivities.id });
    
    console.log(`Storage: Delete query returned ${result.length} rows for activity ${id}`);
    
    return result.length > 0;
  }

  async deleteAllItineraryActivities(tripId: number): Promise<boolean> {
    // First get all activities for this trip
    const activities = await this.getItineraryActivities(undefined, tripId);
    const activityIds = activities.map(a => a.id);
    
    // Delete all votes for these activities
    if (activityIds.length > 0) {
      for (const activityId of activityIds) {
        await db
          .delete(itineraryActivityVotes)
          .where(eq(itineraryActivityVotes.activityId, activityId));
      }
    }
    
    // Then delete all activities for this trip
    const result = await db
      .delete(itineraryActivities)
      .where(eq(itineraryActivities.tripId, tripId))
      .returning({ id: itineraryActivities.id });
    
    return result.length > 0;
  }

  async getItineraryActivityVotes(activityId: number): Promise<ItineraryActivityVote[]> {
    const votes = await db
      .select()
      .from(itineraryActivityVotes)
      .where(eq(itineraryActivityVotes.activityId, activityId));
    
    return votes;
  }

  async createItineraryActivityVote(insertVote: InsertItineraryActivityVote): Promise<ItineraryActivityVote> {
    const [vote] = await db
      .insert(itineraryActivityVotes)
      .values(insertVote)
      .onConflictDoUpdate({
        target: [itineraryActivityVotes.activityId, itineraryActivityVotes.userId],
        set: {
          vote: insertVote.vote,
          createdAt: new Date()
        }
      })
      .returning();
    
    return vote;
  }

  async updateItineraryActivityVote(id: number, updates: Partial<ItineraryActivityVote>): Promise<ItineraryActivityVote | undefined> {
    const [updatedVote] = await db
      .update(itineraryActivityVotes)
      .set(updates)
      .where(eq(itineraryActivityVotes.id, id))
      .returning();
      
    return updatedVote;
  }

  async deleteItineraryActivityVote(activityId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(itineraryActivityVotes)
      .where(and(
        eq(itineraryActivityVotes.activityId, activityId),
        eq(itineraryActivityVotes.userId, userId)
      ))
      .returning({ id: itineraryActivityVotes.id });
    
    return result.length > 0;
  }

  // Collaborative suggestion methods
  async getSuggestedActivities(tripId: number): Promise<ItineraryActivity[]> {
    const activities = await db
      .select()
      .from(itineraryActivities)
      .where(and(
        eq(itineraryActivities.tripId, tripId),
        eq(itineraryActivities.isSuggestion, true),
        eq(itineraryActivities.isApproved, false)
      ))
      .orderBy(itineraryActivities.createdAt);
    
    // Decrypt activities if encrypted
    const decryptedActivities = [];
    for (const activity of activities) {
      try {
        const decryptedActivity = await decryptItineraryActivity(activity);
        decryptedActivities.push(decryptedActivity);
      } catch (error) {
        console.error('Activity decryption error:', error);
        decryptedActivities.push({ 
          ...activity, 
          title: '[Title could not be decrypted]',
          description: '[Description could not be decrypted]',
          location: '[Location could not be decrypted]',
          isEncrypted: false 
        });
      }
    }
    
    return decryptedActivities;
  }

  async approveActivitySuggestion(activityId: number, userId: number): Promise<ItineraryActivity | undefined> {
    try {
      const [activity] = await db
        .update(itineraryActivities)
        .set({
          isSuggestion: false,  // Convert to regular itinerary item
          isApproved: true,
          approvedBy: userId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(itineraryActivities.id, activityId))
        .returning();
      
      if (!activity) return undefined;
      
      // Return decrypted activity for immediate use
      return await decryptItineraryActivity(activity);
    } catch (error) {
      console.error("Error approving activity suggestion:", error);
      return undefined;
    }
  }

  async rejectActivitySuggestion(activityId: number, userId: number): Promise<ItineraryActivity | undefined> {
    try {
      const [activity] = await db
        .update(itineraryActivities)
        .set({
          isApproved: false,
          rejectedBy: userId,
          rejectedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(itineraryActivities.id, activityId))
        .returning();
      
      if (!activity) return undefined;
      
      // Return decrypted activity for immediate use
      return await decryptItineraryActivity(activity);
    } catch (error) {
      console.error("Error rejecting activity suggestion:", error);
      return undefined;
    }
  }

  async deleteActivitySuggestion(activityId: number): Promise<boolean> {
    try {
      // First delete all votes for this activity
      await db
        .delete(itineraryActivityVotes)
        .where(eq(itineraryActivityVotes.activityId, activityId));
      
      // Then delete the activity itself
      const result = await db
        .delete(itineraryActivities)
        .where(eq(itineraryActivities.id, activityId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting activity suggestion:", error);
      return false;
    }
  }

  async updateActivitySuggestion(activityId: number, updates: Partial<ItineraryActivity>): Promise<ItineraryActivity | undefined> {
    try {
      // Check if we're updating encrypted fields and need to encrypt them
      let processedUpdates = { ...updates };
      
      if (updates.title !== undefined || updates.description !== undefined || updates.location !== undefined) {
        // Always encrypt the new data for security
        const encryptedUpdates = await encryptItineraryActivity({
          title: updates.title,
          description: updates.description,
          location: updates.location
        });
        
        if (updates.title !== undefined) processedUpdates.title = encryptedUpdates.title;
        if (updates.description !== undefined) processedUpdates.description = encryptedUpdates.description;
        if (updates.location !== undefined) processedUpdates.location = encryptedUpdates.location;
        processedUpdates.isEncrypted = true;
      }
      
      const [activity] = await db
        .update(itineraryActivities)
        .set({
          ...processedUpdates,
          updatedAt: new Date()
        })
        .where(eq(itineraryActivities.id, activityId))
        .returning();
      
      if (!activity) return undefined;
      
      // Return decrypted activity for immediate use
      return await decryptItineraryActivity(activity);
    } catch (error) {
      console.error("Error updating activity suggestion:", error);
      return undefined;
    }
  }
}

// Use database storage instead of in-memory storage
export const storage = new DatabaseStorage();
