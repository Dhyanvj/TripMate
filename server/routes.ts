import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema, insertGroceryItemSchema, 
  insertExpenseSchema, insertExpenseParticipantSchema, 
  insertPackingItemSchema, insertChatMessageSchema, 
  insertTripMemberSchema, insertDebtSettlementSchema,
  insertItineraryDaySchema, insertItineraryActivitySchema, insertItineraryActivityVoteSchema,
  Expense, expenseParticipants } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { setupAuth } from "./auth";
import { WebSocketServer, WebSocket } from "ws";
import { upload, handleUploadError, getFileCategory, formatFileSize, generateFileUrl } from "./fileUpload";
import { encryptFile, decryptFile } from "./encryption";
import path from "path";
import express from "express";
import fs from "fs";
import { aiItineraryService } from "./aiService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup authentication
  setupAuth(app);

  // Secure file download endpoint that decrypts files
  app.get('/api/files/:tripId/:filename', async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const filename = req.params.filename;

      // Check if user is a member of the trip
      const tripMembers = await storage.getTripMembers(tripId);
      const isMember = tripMembers.some(member => member.userId === req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }

      // Find the chat message with this file attachment
      const messages = await storage.getChatMessages(tripId);
      const messageWithFile = messages.find(msg => 
        msg.hasAttachment && msg.attachmentUrl && msg.attachmentUrl.includes(filename)
      );

      if (!messageWithFile || !messageWithFile.isFileEncrypted) {
        // For non-encrypted files, serve normally
        const filePath = path.join(process.cwd(), 'uploads', filename);
        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        } else {
          return res.status(404).json({ message: "File not found" });
        }
      }

      // Decrypt the file
      const filePath = path.join(process.cwd(), 'uploads', filename);
      const encryptedData = await fs.promises.readFile(filePath);
      
      const decryptedFileData = await decryptFile(
        encryptedData.toString('base64'),
        messageWithFile.attachmentName!,
        messageWithFile.encryptionSalt!,
        messageWithFile.encryptionIv!
      );

      // Set appropriate headers
      res.setHeader('Content-Type', messageWithFile.attachmentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${decryptedFileData.originalFilename}"`);
      
      // Send decrypted file
      res.send(decryptedFileData.fileBuffer);
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Serve static files for uploads (high-quality images and files) - fallback for non-encrypted files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // File upload endpoint for chat attachments
  app.post("/api/trips/:tripId/chat/upload", upload.single('file'), handleUploadError, async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check if user is a member of the trip
      const tripMembers = await storage.getTripMembers(tripId);
      const isMember = tripMembers.some(member => member.userId === req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }

      const file = req.file;
      const fileCategory = getFileCategory(file.mimetype);

      // Read and encrypt the file
      const fileBuffer = await fs.promises.readFile(file.path);
      const encryptedFileData = await encryptFile(fileBuffer, file.originalname);
      
      // Store encrypted file data in database or secure storage
      // For now, we'll store the encrypted data in the message metadata
      const fileUrl = generateFileUrl(file.filename);

      // Create chat message with encrypted file attachment
      const messageData = {
        tripId,
        userId: req.user.id,
        message: req.body.message || `Shared a ${fileCategory}`,
        hasAttachment: true,
        attachmentUrl: fileUrl,
        attachmentName: encryptedFileData.encryptedFilename, // Store encrypted filename
        attachmentSize: file.size,
        attachmentType: file.mimetype,
        // Store encryption metadata for secure file access
        encryptionSalt: encryptedFileData.salt,
        encryptionIv: encryptedFileData.iv,
        isFileEncrypted: true
      };

      const message = await storage.createChatMessage(messageData);
      
      // Write encrypted file data to disk (overwrite original)
      const encryptedBuffer = Buffer.from(encryptedFileData.encryptedData, 'base64');
      await fs.promises.writeFile(file.path, encryptedBuffer);

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

  // Debug endpoint to check auth status
  app.get("/api/auth/debug", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      session: req.session,
      user: req.user ? { ...req.user, password: "[REDACTED]" } : null
    });
  });

  // User endpoints are now handled by setupAuth

  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Ensure the requesting user can only access their own data
      if (!req.isAuthenticated() || req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only access your own user data" });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user", error });
    }
  });
  
  // Update user profile endpoint
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure the authenticated user is updating their own profile
      if (!req.isAuthenticated() || req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only allow certain fields to be updated for security
      const allowedUpdates = ['displayName', 'email', 'paymentPreference', 'avatar', 'dateOfBirth'];
      const updates: Record<string, any> = {};
      
      allowedUpdates.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(req.body, field) && req.body[field] !== undefined) {
          // Process date fields properly
          if (field === 'dateOfBirth' && req.body[field]) {
            const date = new Date(req.body[field]);
            // Store as date without time component
            Object.defineProperty(updates, field, {
              value: new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
              ),
              writable: true,
              enumerable: true,
              configurable: true
            });
          } else if (field === 'paymentPreference' && req.body[field] === 'none') {
            // If payment preference is 'none', set it to null in the database
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
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, updates);
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user", error });
    }
  });

  // Trip endpoints
  app.get("/api/trips", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      
      console.log(`Fetching trips for user ID: ${userId}`);
      let trips = await storage.getUserTrips(userId);
      
      // Check for trips with end dates in the past and automatically mark them
      const currentDate = new Date();
      const tripsToUpdate = [];
      
      for (const trip of trips) {
        if (trip.endDate && new Date(trip.endDate) < currentDate && !trip.isPast) {
          console.log(`Trip ${trip.id} (${trip.name}) has ended, marking as past`);
          await storage.markTripAsPast(trip.id);
          tripsToUpdate.push(trip.id);
        }
      }
      
      // If any trips were updated, fetch the trips again
      if (tripsToUpdate.length > 0) {
        trips = await storage.getUserTrips(userId);
      }
      
      console.log(`Retrieved ${trips.length} trips for user ${userId}`);
      
      // Keep date fields as strings - they'll be processed client-side
      // This approach ensures consistent serialization between client and server
      const processedTrips = trips;
      
      res.status(200).json(processedTrips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ message: "Failed to get trips", error });
    }
  });
  
  // Get hidden trips
  app.get("/api/trips/hidden", async (req, res) => {
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
  
  // Hide trip
  app.post("/api/trips/:id/hide", async (req, res) => {
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
  
  // Unhide trip
  app.post("/api/trips/:id/unhide", async (req, res) => {
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

  app.post("/api/trips", async (req, res) => {
    try {
      // Process the data and normalize dates before creating trip
      let tripData = {
        ...req.body,
        inviteCode: nanoid(8)
      };
      
      // If dates are provided, normalize them to remove time component
      // Log the raw date values received from the client
      console.log("Raw date values received:", {
        startDate: tripData.startDate,
        endDate: tripData.endDate
      });
      
      if (tripData.startDate) {
        const startDate = new Date(tripData.startDate);
        // Keep the original input date without modification
        // We'll let the schema transformer handle the conversion
        console.log("Parsed start date:", startDate);
      }
      
      if (tripData.endDate) {
        const endDate = new Date(tripData.endDate);
        // Keep the original input date without modification
        // We'll let the schema transformer handle the conversion
        console.log("Parsed end date:", endDate);
      }
      
      console.log("Creating trip with data:", JSON.stringify(tripData));
      
      try {
        // Parse and validate the trip data with our schema that handles date conversions
        const parsedTrip = insertTripSchema.parse(tripData);
        const trip = await storage.createTrip(parsedTrip);
        
        res.status(201).json(trip);
      } catch (parseError: any) {
        console.error("Trip validation error:", parseError);
        return res.status(400).json({ 
          message: "Invalid trip data", 
          error: parseError
        });
      }
    } catch (error: any) {
      console.error("Trip creation error:", error);
      res.status(500).json({ 
        message: "Failed to create trip", 
        error: error.message || String(error) 
      });
    }
  });

  app.get("/api/trips/:id", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Enhanced debugging - log full trip and user details
      console.log(`Trip ${tripId} data debug:`);
      console.log(`- Original trip:`, JSON.stringify(trip, null, 2));
      console.log(`- Current user:`, JSON.stringify(req.user, null, 2));
      console.log(`- Trip createdById:`, trip.createdById);
      console.log(`- Trip created_by:`, (trip as any).created_by);
      console.log(`- User ID:`, req.user.id);
      console.log(`- Creator match:`, Number(trip.createdById || (trip as any).created_by) === Number(req.user.id));
      
      // Add explicit debug logging for dates
      console.log(`Trip ${tripId} date objects in database:`, {
        startDate: trip.startDate,
        endDate: trip.endDate,
        startDateType: trip.startDate ? typeof trip.startDate : 'null',
        endDateType: trip.endDate ? typeof trip.endDate : 'null'
      });
      
      // Force all properties to be properly formatted for the client
      // Ensure date fields are properly parsed from database (either as Date objects or ISO strings)
      const startDate = trip.startDate ? new Date(trip.startDate) : null;
      const endDate = trip.endDate ? new Date(trip.endDate) : null;
      
      console.log(`Trip ${tripId} parsed date objects:`, {
        startDate,
        endDate,
        startDateType: startDate ? typeof startDate : 'null',
        endDateType: endDate ? typeof endDate : 'null'
      });
      
      const tripWithCorrectCasing = {
        ...trip,
        id: trip.id,
        name: trip.name || "",
        location: trip.location || null,
        description: trip.description || null,
        // Make sure to pass the date objects, not null
        startDate: startDate,
        endDate: endDate,
        inviteCode: trip.inviteCode || "",
        tripType: trip.tripType || null,
        // Force consistent property names and convert to the right type
        createdById: Number(trip.createdById || (trip as any).created_by || 0),
        isPast: Boolean(trip.isPast || (trip as any).is_past || false),
        createdAt: trip.createdAt || new Date()
      };
      
      // Final check to ensure the transformed trip has all required fields
      console.log(`Transformed trip:`, JSON.stringify(tripWithCorrectCasing, null, 2));
      
      res.status(200).json(tripWithCorrectCasing);
    } catch (error) {
      res.status(500).json({ message: "Failed to get trip", error });
    }
  });
  
  // Mark trip as past endpoint
  app.patch("/api/trips/:id/mark-past", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Only trip creator can mark as past
      const creatorId = trip.createdById || (trip as any).created_by;
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
  
  // Unmark trip as past endpoint (restore to active)
  app.patch("/api/trips/:id/unmark-past", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Only trip creator can unmark as past
      const creatorId = trip.createdById || (trip as any).created_by;
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
  
  // Delete trip endpoint
  // Update trip details (including dates)
  app.patch("/api/trips/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Only trip creator can update the trip
      const creatorId = trip.createdById || (trip as any).created_by;
      if (Number(creatorId) !== Number(req.user.id)) {
        console.log("Permission denied - Trip creator check failed:");
        console.log("- User ID:", req.user.id);
        console.log("- Trip creator field:", creatorId);
        return res.status(403).json({ message: "Only trip creator can update the trip" });
      }
      
      // We'll only allow certain fields to be updated
      const allowedUpdates = ['name', 'description', 'location', 'startDate', 'endDate', 'tripType'];
      const updates: Record<string, any> = {};
      
      allowedUpdates.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(req.body, field) && req.body[field] !== undefined) {
          // Process dates properly - remove time component for date fields
          if (field === 'startDate' || field === 'endDate') {
            if (req.body[field]) {
              const date = new Date(req.body[field]);
              // Normalize to YYYY-MM-DD format without time
              Object.defineProperty(updates, field, {
                value: new Date(
                  date.getFullYear(), 
                  date.getMonth(), 
                  date.getDate()
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
      
      // Debug logging
      console.log(`Before update - trip dates:`, {
        id: trip.id,
        startDate: trip.startDate,
        endDate: trip.endDate
      });
      
      // Update the trip
      const updatedTrip = await storage.updateTrip(tripId, updates);
      
      if (!updatedTrip) {
        return res.status(500).json({ message: "Failed to update trip" });
      }
      
      // Debug: verify the update worked
      console.log(`After update - trip dates:`, {
        id: updatedTrip.id,
        startDate: updatedTrip.startDate,
        endDate: updatedTrip.endDate
      });
      
      // Fetch the trip again to verify it's updated in the database
      const verifiedTrip = await storage.getTrip(tripId);
      console.log(`Verification from DB - trip dates:`, {
        id: verifiedTrip?.id,
        startDate: verifiedTrip?.startDate,
        endDate: verifiedTrip?.endDate
      });
      
      // Create activity for date update if dates were changed
      if (updates.startDate !== undefined || updates.endDate !== undefined) {
        await storage.createActivity({
          tripId: tripId,
          userId: req.user.id,
          activityType: 'trip_dates_updated',
          activityData: { 
            tripName: trip.name,
            startDate: updates.startDate,
            endDate: updates.endDate
          }
        });
      }
      
      // Return the verified trip from database to ensure we have the most up-to-date data
      res.status(200).json({ 
        message: "Trip updated successfully",
        trip: verifiedTrip || updatedTrip // Fallback to updatedTrip if verification failed
      });
    } catch (error) {
      console.error("Error updating trip:", error);
      
      // Provide more detailed error message back to client
      let errorMessage = "Failed to update trip";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });

  app.delete("/api/trips/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Only trip creator can delete the trip
      const creatorId = trip.createdById || (trip as any).created_by;
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
      
      // First, create an activity log (before deletion so it's accessible for the response)
      await storage.createActivity({
        tripId: tripId,
        userId: req.user.id,
        activityType: 'trip_deleted',
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

  app.post("/api/trips/join", async (req, res) => {
    try {
      const { inviteCode, userId } = req.body;
      
      console.log(`Join request - Invite code: ${inviteCode}, User ID: ${userId}`);
      
      if (!inviteCode || !userId) {
        return res.status(400).json({ message: "Invite code and user ID required" });
      }
      
      // Find trip by invite code
      const trip = await storage.getTripByInviteCode(inviteCode);
      
      if (!trip) {
        console.log(`Trip not found for invite code: ${inviteCode}`);
        return res.status(404).json({ message: "Trip not found with this invite code" });
      }
      
      console.log(`Trip found with ID: ${trip.id}, Name: ${trip.name}`);
      
      try {
        // Check if user is already a member
        const existingMember = await storage.getTripMember(trip.id, userId);
        if (existingMember) {
          console.log(`User ${userId} is already a member of trip ${trip.id}`);
          return res.status(200).json({ 
            message: "You're already a member of this trip", 
            tripId: trip.id 
          });
        }
        
        // Add user as a trip member
        const memberData = insertTripMemberSchema.parse({
          tripId: trip.id,
          userId
        });
        
        const member = await storage.addTripMember(memberData);
        console.log(`User ${userId} successfully joined trip ${trip.id}`);
        
        res.status(201).json({ message: "Joined trip successfully", tripId: trip.id });
      } catch (memberError: any) {
        console.error("Error adding member to trip:", memberError);
        res.status(500).json({ message: "Failed to add you to the trip", error: memberError.message });
      }
    } catch (error: any) {
      console.error("Error joining trip:", error);
      res.status(400).json({ message: "Failed to join trip", error: error.message });
    }
  });

  // Trip Members endpoints
  app.get("/api/trips/:tripId/members", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const members = await storage.getTripMembers(tripId);
      
      // Get full user details for each member
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

  // Leave trip endpoint
  app.post("/api/trips/:tripId/leave", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const userId = req.user.id;

      // Check if trip exists
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Check if user is the trip owner
      if (trip.createdById === userId) {
        return res.status(400).json({ 
          message: "Trip owner cannot leave the trip. You can delete the trip instead." 
        });
      }

      // Check if user is actually a member
      const member = await storage.getTripMember(tripId, userId);
      if (!member) {
        return res.status(400).json({ message: "You are not a member of this trip" });
      }

      // Remove user from trip
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

  // Remove member from trip endpoint (owner only)
  app.delete("/api/trips/:tripId/members/:userId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const memberUserId = parseInt(req.params.userId);
      const currentUserId = req.user.id;

      // Check if trip exists
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Only trip owner can remove members
      if (trip.createdById !== currentUserId) {
        return res.status(403).json({ 
          message: "Only the trip owner can remove members" 
        });
      }

      // Cannot remove yourself as owner
      if (memberUserId === currentUserId) {
        return res.status(400).json({ 
          message: "Trip owner cannot remove themselves. Delete the trip instead." 
        });
      }

      // Check if target user is actually a member
      const member = await storage.getTripMember(tripId, memberUserId);
      if (!member) {
        return res.status(400).json({ message: "User is not a member of this trip" });
      }

      // Remove the member
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

  // Restore trip to active status endpoint
  app.post("/api/trips/:tripId/restore", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const userId = req.user.id;

      // Check if trip exists
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Check if user is trip owner or member
      const creatorId = trip.createdById || (trip as any).created_by;
      const isTripOwner = Number(creatorId) === Number(userId);
      const member = await storage.getTripMember(tripId, userId);
      
      if (!isTripOwner && !member) {
        return res.status(403).json({ message: "Only trip members can restore trips" });
      }

      // Check if trip is actually marked as past
      if (!trip.isPast) {
        return res.status(400).json({ message: "Trip is already active" });
      }

      // Restore the trip
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

  // Invite Code Expiration endpoints
  app.post("/api/trips/:id/invite-expiration", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.id);
      const { expirationMinutes } = req.body;

      // Get trip and verify ownership
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const creatorId = trip.createdById || (trip as any).created_by;
      if (Number(creatorId) !== Number(req.user.id)) {
        return res.status(403).json({ message: "Only trip owner can set invite expiration" });
      }

      // Calculate expiration time
      let expiresAt: Date | null = null;
      if (expirationMinutes && expirationMinutes > 0) {
        expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
      }

      const updatedTrip = await storage.updateInviteCodeExpiration(tripId, expiresAt);
      
      if (updatedTrip) {
        res.status(200).json({
          message: "Invite code expiration updated successfully",
          trip: updatedTrip,
          expiresAt: expiresAt
        });
      } else {
        res.status(500).json({ message: "Failed to update invite code expiration" });
      }
    } catch (error) {
      console.error("Error updating invite code expiration:", error);
      res.status(500).json({ message: "Failed to update invite code expiration", error });
    }
  });

  app.post("/api/trips/:id/regenerate-invite", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.id);
      const { expirationMinutes } = req.body;

      // Get trip and verify ownership
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const creatorId = trip.createdById || (trip as any).created_by;
      if (Number(creatorId) !== Number(req.user.id)) {
        return res.status(403).json({ message: "Only trip owner can regenerate invite code" });
      }

      // Calculate expiration time
      let expiresAt: Date | null = null;
      if (expirationMinutes && expirationMinutes > 0) {
        expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
      }

      const updatedTrip = await storage.regenerateInviteCode(tripId, expiresAt);
      
      if (updatedTrip) {
        res.status(200).json({
          message: "Invite code regenerated successfully",
          trip: updatedTrip,
          newInviteCode: updatedTrip.inviteCode,
          expiresAt: expiresAt
        });
      } else {
        res.status(500).json({ message: "Failed to regenerate invite code" });
      }
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      res.status(500).json({ message: "Failed to regenerate invite code", error });
    }
  });

  // Admin management endpoints
  app.post("/api/trips/:id/members/:userId/admin", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const { isAdmin } = req.body;

      // Get trip and verify ownership/admin status
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const creatorId = trip.createdById || (trip as any).created_by;
      const isOwner = Number(creatorId) === Number(req.user.id);
      
      // Check if current user is admin
      const currentUserMember = await storage.getTripMember(tripId, req.user.id);
      const isCurrentUserAdmin = currentUserMember?.isAdmin === true;

      if (!isOwner && !isCurrentUserAdmin) {
        return res.status(403).json({ message: "Only trip owners and admins can manage admin roles" });
      }

      // Cannot change admin status of trip owner
      if (Number(userId) === Number(creatorId)) {
        return res.status(400).json({ message: "Cannot change admin status of trip owner" });
      }

      // Update admin status
      const updatedMember = await storage.setTripMemberAdmin(tripId, userId, isAdmin);
      
      if (updatedMember) {
        res.json({ 
          message: `Member ${isAdmin ? 'promoted to admin' : 'removed from admin'}`,
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

  // Get trip admins
  app.get("/api/trips/:id/admins", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.id);
      const admins = await storage.getTripAdmins(tripId);
      
      // Get user details for each admin
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

  // Item Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getItemCategories();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get categories", error });
    }
  });

  // Activity cleanup endpoint (for manual cleanup)
  app.post("/api/admin/cleanup-activities", async (req: any, res: any) => {
    try {
      const deletedCount = await storage.cleanupOldActivities();
      res.status(200).json({ 
        message: "Activity cleanup completed successfully", 
        deletedCount 
      });
    } catch (error) {
      console.error("Error during manual activity cleanup:", error);
      res.status(500).json({ message: "Failed to cleanup activities", error });
    }
  });



  // Expenses endpoints
  app.get("/api/trips/:tripId/expenses", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      const expenses = await storage.getExpenses(tripId);
      
      // Get participants for each expense
      const expensesWithParticipants = await Promise.all(
        expenses.map(async (expense) => {
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

  app.post("/api/trips/:tripId/expenses", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const { participants, ...expenseData } = req.body;
      const userId = expenseData.paidBy || 0;
      
      const parsedExpense = insertExpenseSchema.parse({
        ...expenseData,
        tripId
      });
      
      const expense = await storage.createExpense(parsedExpense);
      
      // Add participants
      if (Array.isArray(participants)) {
        await Promise.all(
          participants.map(userId => 
            storage.addExpenseParticipant({
              expenseId: expense.id,
              userId
            })
          )
        );
      }
      
      const savedParticipants = await storage.getExpenseParticipants(expense.id);
      
      // Send notification for new expense
      await sendNotification(
        tripId,
        userId,
        'expense_add',
        'New Expense Added',
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
  
  // Update expense endpoint
  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const expenseId = parseInt(req.params.id);
      const expense = await storage.getExpense(expenseId);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Any trip member can edit any expense (removed permission check)
      
      // Allow updates to description, amount, category, and paidBy
      const updatableFields = ['description', 'amount', 'category', 'paidBy'];
      const updates: Partial<Expense> = {};
      
      // Only include fields that are provided and in the allowed list
      for (const field of updatableFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          // Safe property assignment using Object.defineProperty
          Object.defineProperty(updates, field, {
            value: req.body[field],
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      
      // Handle participants if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        // Delete existing participants (one by one through storage interface)
        const existingParticipants = await storage.getExpenseParticipants(expenseId);
        for (const participant of existingParticipants) {
          // Use a generic approach that works with both storage types
          // Instead of directly using db.delete
          await storage.deleteExpenseParticipant(participant.id);
        }
        
        // Add new participants
        await Promise.all(
          req.body.participants.map((userId: number) => 
            storage.addExpenseParticipant({
              expenseId,
              userId
            })
          )
        );
      }
      
      // Update the expense
      const updatedExpense = await storage.updateExpense(expenseId, updates);
      
      if (!updatedExpense) {
        return res.status(500).json({ message: "Failed to update expense" });
      }
      
      // Get expense information for activity logging
      const trip = await storage.getTrip(expense.tripId);
      
      // Create activity for expense update
      if (trip) {
        await storage.createActivity({
          tripId: expense.tripId,
          userId: req.user.id,
          activityType: 'expense_updated',
          activityData: { 
            description: expense.description,
            tripName: trip.name
          }
        });
        
        // Send notification for updated expense
        await sendNotification(
          expense.tripId,
          req.user.id,
          'expense_update',
          'Expense Updated',
          `Expense updated: ${updatedExpense.description} ($${updatedExpense.amount})`,
          updatedExpense.description
        );
      }
      
      // Get participants to include in response
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

  // Delete expense endpoint
  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const expenseId = parseInt(req.params.id);
      const expense = await storage.getExpense(expenseId);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Any trip member can delete any expense (removed permission check)
      
      // Get expense information for activity logging
      const trip = await storage.getTrip(expense.tripId);
      
      // Delete the expense (also deletes its participants)
      const success = await storage.deleteExpense(expenseId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete expense" });
      }
      
      // Create activity for expense deletion
      if (trip) {
        await storage.createActivity({
          tripId: expense.tripId,
          userId: req.user.id,
          activityType: 'expense_deleted',
          activityData: { 
            amount: expense.amount.toString(),
            description: expense.description,
            tripName: trip.name
          }
        });
        
        // Send notification for deleted expense
        await sendNotification(
          expense.tripId,
          req.user.id,
          'expense_delete',
          'Expense Deleted',
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

  // Packing Items endpoints
  app.get("/api/trips/:tripId/packing", async (req, res) => {
    try {
      const startTime = Date.now();
      const tripId = parseInt(req.params.tripId);
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log(`[Performance] Packing items request start for trip ${tripId}, user ${currentUserId}`);
      
      // Get only appropriate packing items for the current user:
      // - All group items (isGroupItem = true)
      // - Personal items where the user is the creator (isPersonal = true AND addedBy = currentUserId)
      const items = await storage.getPackingItems(tripId, currentUserId);
      
      const duration = Date.now() - startTime;
      console.log(`[Performance] Packing items fetched in ${duration}ms - Found ${items.length} items`);
      
      // Add Cache-Control headers to improve performance
      res.set('Cache-Control', 'private, max-age=10'); // Cache for 10 seconds for logged-in users
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to get packing items", error });
    }
  });

  app.post("/api/trips/:tripId/packing", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const itemName = req.body.name;
      
      console.log(`Creating packing item "${itemName}" with user ID: ${currentUserId}`);
      
      // Ensure the current user is set as the item creator
      const itemData = {
        ...req.body,
        tripId,
        addedBy: currentUserId // Override with authenticated user ID
      };
      
      const parsedItem = insertPackingItemSchema.parse(itemData);
      console.log("Parsed packing item data:", parsedItem);
      
      const item = await storage.createPackingItem(parsedItem);
      console.log("Created packing item:", item);
      
      // Send notification for new packing item
      await sendNotification(
        tripId,
        currentUserId,
        'packing_add',
        'New Packing Item Added',
        `${itemName} has been added to the packing list by ${req.user?.displayName || "a user"}`,
        itemName
      );
      
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid item data", error });
    }
  });

  app.patch("/api/packing/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getPackingItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      const updatedItem = await storage.updatePackingItem(itemId, req.body);
      
      // Send notification for updated packing item with more descriptive message
      const userId = req.body.modifiedBy || item.addedBy || 0;
      const updateType = req.body.packed !== undefined ? 'status' : 'details';
      
      let title = 'Packing Item Updated';
      let message;
      
      if (updateType === 'status') {
        const isPacked = req.body.packed === true;
        title = isPacked ? 'Item Packed' : 'Item Needs Packing';
        message = isPacked 
          ? `Packing item '${item.name}' has been marked complete` 
          : `'${item.name}' needs to be packed`;
      } else {
        message = `${item.name} has been updated`;
      }
      
      await sendNotification(
        item.tripId,
        userId,
        'packing_update',
        title,
        message,
        item.name
      );
      
      res.status(200).json(updatedItem);
    } catch (error) {
      res.status(400).json({ message: "Failed to update item", error });
    }
  });

  app.delete("/api/packing/:id", async (req, res) => {
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
      
      // Extract userId from query params if available, otherwise use item's addedBy
      const userId = parseInt(req.query.userId as string) || item.addedBy || 0;
      
      // Send notification for deleted packing item
      await sendNotification(
        item.tripId,
        userId,
        'packing_delete',
        'Packing Item Removed',
        `${item.name} has been removed from the packing list`,
        item.name
      );
      
      res.status(200).json({ message: "Item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item", error });
    }
  });

  // Chat Messages endpoints
  app.get("/api/trips/:tripId/chat", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const messages = await storage.getChatMessages(tripId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat messages", error });
    }
  });

  app.post("/api/trips/:tripId/chat", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const userId = req.body.senderId || 0;
      
      const messageData = {
        ...req.body,
        tripId
      };
      
      const parsedMessage = insertChatMessageSchema.parse(messageData);
      const message = await storage.createChatMessage(parsedMessage);
      
      // Get sender information
      const user = await storage.getUser(userId);
      const senderName = user ? user.displayName || user.username : `User ${userId}`;
      
      // Send notification for new chat message
      // Only send for messages that aren't system messages
      if (!req.body.isSystem) {
        await sendNotification(
          tripId,
          userId,
          'chat_message',
          'New Message',
          `${senderName}: ${req.body.content.substring(0, 30)}${req.body.content.length > 30 ? '...' : ''}`,
          req.body.content
        );
      }
      
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data", error });
    }
  });

  // Activities endpoints
  // Get all recent activities (for dashboard)
  app.get("/api/recent-activities", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      
      // Get user's trips
      const userTrips = await storage.getUserTrips(userId);
      
      if (userTrips.length === 0) {
        return res.status(200).json([]); // Return empty array if user has no trips
      }
      
      // Get activities from all user's trips, limited to recent ones
      const activitiesPromises = userTrips.map(trip => storage.getTripActivities(trip.id));
      const activitiesArrays = await Promise.all(activitiesPromises);
      
      // Flatten, sort by date (newest first) and limit
      const allActivities = activitiesArrays
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10); // Limit to 10 most recent activities
      
      res.status(200).json(allActivities);
    } catch (error) {
      console.error("Error fetching all activities:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Failed to get activities", error: errorMessage });
    }
  });
  
  // Get activities for a specific trip
  app.get("/api/trips/:tripId/activities", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      
      // First check if the trip exists
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const activities = await storage.getTripActivities(tripId);
      res.status(200).json(activities);
    } catch (error) {
      console.error("Error fetching trip activities:", error);
      // Type-safe error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Failed to get activities", error: errorMessage });
    }
  });

  // Spending Margin endpoints
  app.get("/api/trips/:tripId/spending-margin", async (req, res) => {
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

  app.post("/api/trips/:tripId/spending-margin", async (req, res) => {
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
      
      // Send notification about budget being set
      await sendNotification(
        tripId,
        userId,
        'budget_set',
        'Budget Limit Set',
        `Personal spending limit set to $${budgetLimit}`,
        'Budget Management'
      );

      res.status(201).json(margin);
    } catch (error) {
      res.status(400).json({ message: "Failed to set spending margin", error });
    }
  });

  app.patch("/api/trips/:tripId/spending-margin", async (req, res) => {
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
      
      // Send notification about budget being updated
      await sendNotification(
        tripId,
        userId,
        'budget_update',
        'Budget Limit Updated',
        `Personal spending limit updated to $${budgetLimit}`,
        'Budget Management'
      );

      res.status(200).json(margin);
    } catch (error) {
      res.status(400).json({ message: "Failed to update spending margin", error });
    }
  });

  app.delete("/api/trips/:tripId/spending-margin", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const userId = req.user.id;

      const success = await storage.deleteSpendingMargin(tripId, userId);
      
      if (success) {
        // Send notification about budget being removed
        await sendNotification(
          tripId,
          userId,
          'budget_remove',
          'Budget Limit Removed',
          'Personal spending limit has been removed',
          'Budget Management'
        );

        res.status(200).json({ message: "Spending margin removed successfully" });
      } else {
        res.status(404).json({ message: "Spending margin not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove spending margin", error });
    }
  });

  // Set up WebSocket server for real-time communication
  // Use a path that won't conflict with Vite's routes
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/api/ws',
    // Enable ping/pong
    clientTracking: true,
    // Set increased timeout (45 seconds)
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3,
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below 10 is recommended for non-binary data
      threshold: 1024,
      // Don't compress small payloads
      concurrencyLimit: 10,
      // Limits concurrent compression calls
    }
  });
  
  // Keep track of all connected clients
  const clients = new Map<WebSocket, { userId?: number, tripId?: number, isAlive?: boolean }>();
  
  // Set up a heartbeat to keep connections alive
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const metadata = clients.get(ws);
      
      if (metadata === undefined) {
        // Client with no metadata - set initial metadata
        clients.set(ws, { isAlive: true });
        return;
      }
      
      if (metadata.isAlive === false) {
        // Client is not responding after previous ping, terminate the connection
        console.log(`Terminating non-responsive client: userId=${metadata.userId}, tripId=${metadata.tripId}`);
        clients.delete(ws);
        try {
          // Close gracefully first
          ws.close();
        } catch (closeError) {
          console.error('Error closing connection:', closeError);
        }
        
        try {
          // Then terminate if needed
          if (ws.readyState !== WebSocket.CLOSED) {
            ws.terminate();
          }
        } catch (termError) {
          console.error('Error terminating connection:', termError);
        }
        return;
      }
      
      // Mark the client as inactive until it responds to the ping
      metadata.isAlive = false;
      clients.set(ws, metadata);
      
      // Send a ping (this will trigger the client's pong response)
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      } catch (error) {
        console.error('Error sending ping:', error);
        clients.delete(ws);
        try {
          ws.terminate();
        } catch (termError) {
          console.error('Error terminating connection after ping error:', termError);
        }
      }
    });
  }, 30000); // Ping every 30 seconds
  
  // Helper function to broadcast to all members of a trip
  const broadcastToTrip = (tripId: number, data: any) => {
    // Loop through all connected clients and send the message to those in the same trip
    clients.forEach((metadata, client) => {
      if (client.readyState === WebSocket.OPEN && metadata.tripId === tripId) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  // Helper function to send notifications for trip activities
  const sendNotification = async (
    tripId: number, 
    userId: number, 
    type: string, 
    title: string, 
    message: string,
    itemName?: string
  ) => {
    try {
      // Get user info for the notification
      const user = await storage.getUser(userId);
      const userName = user ? user.displayName || user.username : `User ${userId}`;
      
      // Create the notification
      const notification = {
        type,
        title,
        message,
        tripId,
        userId,
        timestamp: new Date().toISOString(),
        itemName,
        userName
      };
      
      // Broadcast the notification to all trip members
      broadcastToTrip(tripId, {
        type: 'notification',
        payload: notification,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Notification sent - Type: ${type}, Trip: ${tripId}, User: ${userId}`);
      
      // Also create an activity record in the database
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
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    // Initialize client as alive
    clients.set(ws, { isAlive: true });
    
    // Handle pong response (client is alive)
    ws.on('pong', () => {
      const metadata = clients.get(ws);
      if (metadata) {
        metadata.isAlive = true;
        clients.set(ws, metadata);
      }
    });
    
    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload, timestamp } = message;
        
        console.log(`Received message of type: ${type}`, payload);
        
        // Handle different message types
        switch (type) {
          case 'auth':
            // Store user ID for this connection
            if (payload.userId) {
              clients.set(ws, { ...clients.get(ws), userId: payload.userId });
            }
            break;
            
          case 'join_trip':
            // Store trip ID for this connection
            if (payload.tripId) {
              clients.set(ws, { ...clients.get(ws), tripId: payload.tripId });
            }
            break;
            
          case 'connected':
            // This is a ping message from the client
            // Update client as alive and send a response
            const metadata = clients.get(ws);
            if (metadata) {
              metadata.isAlive = true;
              clients.set(ws, metadata);
              
              // Send pong response
              try {
                ws.send(JSON.stringify({
                  type: 'connected',
                  payload: { pong: Date.now() },
                  timestamp: new Date().toISOString()
                }));
              } catch (error) {
                console.error('Error sending pong:', error);
              }
            }
            break;
          
          case 'typing_indicator':
            if (payload.tripId && payload.userId) {
              // Broadcast typing indicator to all clients in the same trip
              broadcastToTrip(payload.tripId, {
                type: 'typing_indicator',
                payload: {
                  userId: payload.userId,
                  isTyping: payload.isTyping,
                  tripId: payload.tripId
                },
                timestamp: new Date().toISOString()
              });
            }
            break;
            
          case 'message_read':
            if (payload.messageId && payload.userId && payload.tripId) {
              try {
                // Get the message
                const message = await storage.getChatMessage(payload.messageId);
                if (!message) {
                  throw new Error('Message not found');
                }
                
                // Update readBy array if not already read by this user
                let readBy = message.readBy as number[] || [];
                if (!readBy.includes(payload.userId)) {
                  readBy.push(payload.userId);
                  
                  // Update the message in the database
                  await storage.updateChatMessage(payload.messageId, { readBy });
                  
                  // Broadcast read receipt to all clients in the trip
                  broadcastToTrip(payload.tripId, {
                    type: 'message_read',
                    payload: {
                      messageId: payload.messageId,
                      userId: payload.userId,
                      readBy,
                      tripId: payload.tripId
                    },
                    timestamp: new Date().toISOString()
                  });
                }
              } catch (error) {
                console.error('Error marking message as read:', error);
                ws.send(JSON.stringify({
                  type: 'error',
                  payload: { message: 'Failed to mark message as read' },
                  timestamp: new Date().toISOString()
                }));
              }
            }
            break;
            
          case 'message_reaction':
            if (payload.messageId && payload.userId && payload.reaction && payload.tripId) {
              try {
                // Get the message
                const message = await storage.getChatMessage(payload.messageId);
                if (!message) {
                  throw new Error('Message not found');
                }
                
                // Update reactions
                let reactions = message.reactions as Record<string, number[]> || {};
                
                // If toggling reaction (add/remove)
                if (payload.toggle) {
                  if (!reactions[payload.reaction]) {
                    reactions[payload.reaction] = [];
                  }
                  
                  const userIndex = reactions[payload.reaction].indexOf(payload.userId);
                  if (userIndex === -1) {
                    // Add reaction
                    reactions[payload.reaction].push(payload.userId);
                  } else {
                    // Remove reaction
                    reactions[payload.reaction].splice(userIndex, 1);
                    
                    // Remove empty reaction arrays
                    if (reactions[payload.reaction].length === 0) {
                      delete reactions[payload.reaction];
                    }
                  }
                } 
                // Just adding the reaction
                else {
                  if (!reactions[payload.reaction]) {
                    reactions[payload.reaction] = [];
                  }
                  if (!reactions[payload.reaction].includes(payload.userId)) {
                    reactions[payload.reaction].push(payload.userId);
                  }
                }
                
                // Update the message in the database
                await storage.updateChatMessage(payload.messageId, { reactions });
                
                // Broadcast reaction update to all clients in the trip
                broadcastToTrip(payload.tripId, {
                  type: 'message_reaction',
                  payload: {
                    messageId: payload.messageId,
                    userId: payload.userId,
                    reaction: payload.reaction,
                    reactions,
                    tripId: payload.tripId
                  },
                  timestamp: new Date().toISOString()
                });
              } catch (error) {
                console.error('Error updating message reaction:', error);
                ws.send(JSON.stringify({
                  type: 'error',
                  payload: { message: 'Failed to update message reaction' },
                  timestamp: new Date().toISOString()
                }));
              }
            }
            break;
            
          case 'message_edit':
            if (payload.messageId && payload.userId && payload.message && payload.tripId) {
              try {
                // Get the message
                const message = await storage.getChatMessage(payload.messageId);
                if (!message) {
                  throw new Error('Message not found');
                }
                
                // Ensure the user is the original sender
                if (message.userId !== payload.userId) {
                  throw new Error('You can only edit your own messages');
                }
                
                // Update the message
                const updatedMessage = await storage.updateChatMessage(payload.messageId, {
                  message: payload.message,
                  isEdited: true,
                  editedAt: new Date()
                });
                
                // Broadcast edit to all clients in the trip
                broadcastToTrip(payload.tripId, {
                  type: 'message_edit',
                  payload: updatedMessage,
                  timestamp: new Date().toISOString()
                });
              } catch (error) {
                console.error('Error editing message:', error);
                ws.send(JSON.stringify({
                  type: 'error',
                  payload: { message: 'Failed to edit message' },
                  timestamp: new Date().toISOString()
                }));
              }
            }
            break;
            
          case 'message_delete':
            if (payload.messageId && payload.userId && payload.tripId) {
              try {
                // Get the message
                const message = await storage.getChatMessage(payload.messageId);
                if (!message) {
                  throw new Error('Message not found');
                }
                
                // Ensure the user is the original sender
                if (message.userId !== payload.userId) {
                  throw new Error('You can only delete your own messages');
                }
                
                // Mark the message as deleted (soft delete)
                const updatedMessage = await storage.updateChatMessage(payload.messageId, {
                  isDeleted: true
                });
                
                // Broadcast deletion to all clients in the trip
                broadcastToTrip(payload.tripId, {
                  type: 'message_delete',
                  payload: {
                    messageId: payload.messageId,
                    userId: payload.userId,
                    tripId: payload.tripId
                  },
                  timestamp: new Date().toISOString()
                });
              } catch (error) {
                console.error('Error deleting message:', error);
                ws.send(JSON.stringify({
                  type: 'error',
                  payload: { message: 'Failed to delete message' },
                  timestamp: new Date().toISOString()
                }));
              }
            }
            break;
            
          case 'chat_message':
            if (payload.tripId && payload.userId && payload.message) {
              // Store message in database
              const messageData = {
                tripId: payload.tripId,
                userId: payload.userId,
                message: payload.message,
                readBy: [payload.userId] // The sender has read the message
              };
              
              try {
                const savedMessage = await storage.createChatMessage(messageData);
                
                // Broadcast message to all clients in the same trip
                broadcastToTrip(payload.tripId, {
                  type: 'chat_message',
                  payload: savedMessage,
                  timestamp: new Date().toISOString()
                });
                
                // Create activity for this message
                await storage.createActivity({
                  tripId: payload.tripId,
                  userId: payload.userId,
                  activityType: 'chat_message',
                  activityData: { messageId: savedMessage.id }
                });
                
                // Send notification for new chat message if it's not a system message
                if (!payload.isSystem) {
                  // Get sender information
                  const user = await storage.getUser(payload.userId);
                  const senderName = user ? user.displayName || user.username : `User ${payload.userId}`;
                  
                  // Send notification
                  await sendNotification(
                    payload.tripId,
                    payload.userId,
                    'chat_message',
                    'New Message',
                    `${senderName}: ${payload.message.substring(0, 30)}${payload.message.length > 30 ? '...' : ''}`,
                    payload.message
                  );
                }
              } catch (error) {
                console.error('Failed to save chat message:', error);
                ws.send(JSON.stringify({
                  type: 'error',
                  payload: { message: 'Failed to save chat message' },
                  timestamp: new Date().toISOString()
                }));
              }
            }
            break;
            
          case 'item_updated':
            // Broadcast item update to all clients in the same trip
            if (payload.tripId) {
              broadcastToTrip(payload.tripId, message);
            }
            break;
            
          case 'expense_added':
            // Broadcast expense to all clients in the same trip
            if (payload.tripId) {
              broadcastToTrip(payload.tripId, message);
            }
            break;
            
          default:
            console.log('Unknown message type:', type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    
    // Send a welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      payload: { message: 'Connected to TripMate server' },
      timestamp: new Date().toISOString()
    }));
  });
  
  // Debt Settlement endpoints
  // Get all debt settlements for a trip
  app.get("/api/trips/:tripId/debt-settlements", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
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
  
  // Create a new debt settlement
  app.post("/api/trips/:tripId/debt-settlements", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      // Validate the settlement data
      try {
        const settlementData = {
          ...req.body,
          tripId,
          settledById: req.user.id  // The current user is marking as settled
        };
        
        const parsedSettlement = insertDebtSettlementSchema.parse(settlementData);
        const settlement = await storage.createDebtSettlement(parsedSettlement);
        
        // Broadcast to all connected clients in this trip
        broadcastToTrip(tripId, {
          type: 'debt_settled',
          payload: settlement,
          timestamp: new Date().toISOString()
        });
        
        res.status(201).json(settlement);
      } catch (parseError: any) {
        console.error("Settlement validation error:", parseError);
        return res.status(400).json({ 
          message: "Invalid settlement data", 
          error: parseError
        });
      }
    } catch (error: any) {
      console.error("Settlement creation error:", error);
      res.status(500).json({ 
        message: "Failed to create settlement", 
        error: error.message || String(error) 
      });
    }
  });
  
  // Get debt settlements between two users in a trip
  app.get("/api/trips/:tripId/debt-settlements/between", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const tripId = parseInt(req.params.tripId);
      const user1Id = parseInt(req.query.user1Id as string);
      const user2Id = parseInt(req.query.user2Id as string);
      
      if (!user1Id || !user2Id) {
        return res.status(400).json({ message: "Both user IDs are required" });
      }
      
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
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
  
  // Delete a debt settlement by ID
  app.delete("/api/debt-settlements/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const settlementId = parseInt(req.params.id);
      console.log("Attempting to delete settlement with ID:", settlementId);
      
      // Since we don't have a direct way to get a settlement by ID,
      // we'll try to delete it and see if it was successful
      const deleted = await storage.deleteDebtSettlement(settlementId);
      
      if (deleted) {
        console.log("Settlement deleted successfully:", settlementId);
        // Broadcast to all connected clients
        // Note: we can't broadcast to specific trip since we don't know
        // the trip ID, but this is acceptable since the app will refresh
        // the data anyway
        res.status(200).json({ message: "Settlement deleted successfully" });
      } else {
        console.log(`Settlement not found or could not be deleted: ${settlementId}`);
        res.status(404).json({ message: "Settlement not found or could not be deleted" });
      }
    } catch (error: any) {
      console.error("Error deleting debt settlement:", error);
      res.status(500).json({ 
        message: "Failed to delete settlement", 
        error: error.message || String(error) 
      });
    }
  });

  // ===== ITINERARY ROUTES =====
  
  // Get itinerary days for a trip
  app.get("/api/trips/:tripId/itinerary/days", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
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
  
  // Create a new itinerary day
  app.post("/api/trips/:tripId/itinerary/days", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
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
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(tripId, {
        type: 'itinerary_day_added',
        data: newDay
      });
      
      res.status(201).json(newDay);
    } catch (error) {
      console.error("Error creating itinerary day:", error);
      res.status(500).json({ message: "Failed to create itinerary day", error });
    }
  });
  
  // Update an itinerary day
  app.patch("/api/itinerary/days/:dayId", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const dayId = parseInt(req.params.dayId);
      const day = await storage.getItineraryDay(dayId);
      
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(day.tripId, req.user.id);
      const trip = await storage.getTrip(day.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      const updatedDay = await storage.updateItineraryDay(dayId, req.body);
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(day.tripId, {
        type: 'itinerary_day_updated',
        data: updatedDay
      });
      
      res.status(200).json(updatedDay);
    } catch (error) {
      console.error("Error updating itinerary day:", error);
      res.status(500).json({ message: "Failed to update itinerary day", error });
    }
  });
  
  // Delete an itinerary day
  app.delete("/api/itinerary/days/:dayId", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const dayId = parseInt(req.params.dayId);
      const day = await storage.getItineraryDay(dayId);
      
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(day.tripId, req.user.id);
      const trip = await storage.getTrip(day.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      const deleted = await storage.deleteItineraryDay(dayId);
      
      if (deleted) {
        // Broadcast to all connected clients in this trip
        broadcastToTrip(day.tripId, {
          type: 'itinerary_day_deleted',
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

  // ===== SIMPLE ITINERARY ENDPOINTS =====
  
  // Get all itinerary items for a trip (flattened view)
  app.get("/api/trips/:tripId/itinerary", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      // Get all activities for this trip and flatten them
      const activities = await storage.getItineraryActivities(undefined, tripId);
      
      // Get all days for this trip to create proper day mapping
      const days = await storage.getItineraryDays(tripId);
      const dayMap = days.reduce((map, day, index) => {
        map[day.id] = index + 1; // Map dayId to day number (1-based)
        return map;
      }, {} as Record<number, number>);
      
      // Transform activities to match frontend expectations
      const flattenedItems = activities.map(activity => ({
        id: activity.id,
        tripId: activity.tripId,
        day: dayMap[activity.dayId] || 1, // Use actual day from dayId mapping
        time: activity.startTime || "",
        title: activity.title,
        description: activity.description || "",
        location: activity.location || "",
        createdAt: activity.createdAt.toISOString(),
      }));
      
      res.status(200).json(flattenedItems);
    } catch (error) {
      console.error("Error fetching itinerary:", error);
      res.status(500).json({ message: "Failed to get itinerary", error });
    }
  });
  
  // Add a new itinerary item (simplified)
  app.post("/api/trips/:tripId/itinerary", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      const { day, time, title, description, location } = req.body;
      
      if (!title?.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      // First, ensure we have a day for this trip
      const dayTitle = `Day ${day || 1}`;
      // Try to get existing days and find one by title
      const existingDays = await storage.getItineraryDays(tripId);
      let existingDay = existingDays.find(d => d.title === dayTitle);
      
      if (!existingDay) {
        // Create the day first
        const dayData = {
          tripId,
          date: new Date().toISOString().split('T')[0], // Use today's date
          title: dayTitle,
          createdBy: req.user.id
        };
        existingDay = await storage.createItineraryDay(dayData);
      }
      
      // Now create the activity
      const activityData = {
        dayId: existingDay.id,
        tripId,
        title: title.trim(),
        description: description?.trim() || null,
        startTime: time || null,
        endTime: null,
        location: location?.trim() || null,
        category: 'general',
        estimatedCost: null,
        actualCost: null,
        notes: null,
        createdBy: req.user.id,
        sortOrder: 0,
        isCompleted: false,
        isAiGenerated: false,
      };
      
      const newActivity = await storage.createItineraryActivity(activityData);
      
      // Transform to match frontend expectations
      const responseItem = {
        id: newActivity.id,
        tripId: newActivity.tripId,
        day: day || 1,
        time: newActivity.startTime || "",
        title: newActivity.title,
        description: newActivity.description || "",
        location: newActivity.location || "",
        createdAt: newActivity.createdAt.toISOString(),
      };
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(tripId, {
        type: 'itinerary_item_added',
        data: responseItem
      });
      
      res.status(201).json(responseItem);
    } catch (error: any) {
      console.error("Error creating itinerary item:", error);
      res.status(500).json({ message: "Failed to create itinerary item", error: error.message });
    }
  });
  
  // Update an itinerary item (simplified)
  app.patch("/api/itinerary/:itemId", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const itemId = parseInt(req.params.itemId);
      const activity = await storage.getItineraryActivity(itemId);
      
      if (!activity) {
        return res.status(404).json({ message: "Itinerary item not found" });
      }
      
      // Check if user is a member of this trip
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
        updatedAt: new Date(),
      };
      
      const updatedActivity = await storage.updateItineraryActivity(itemId, updateData);
      
      if (!updatedActivity) {
        return res.status(404).json({ message: "Failed to update itinerary item" });
      }
      
      // Transform to match frontend expectations
      const responseItem = {
        id: updatedActivity.id,
        tripId: updatedActivity.tripId,
        day: day || 1,
        time: updatedActivity.startTime || "",
        title: updatedActivity.title,
        description: updatedActivity.description || "",
        location: updatedActivity.location || "",
        createdAt: updatedActivity.createdAt.toISOString(),
      };
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(activity.tripId, {
        type: 'itinerary_item_updated',
        data: responseItem
      });
      
      res.status(200).json(responseItem);
    } catch (error: any) {
      console.error("Error updating itinerary item:", error);
      res.status(500).json({ message: "Failed to update itinerary item", error: error.message });
    }
  });
  
  // Delete an itinerary item (simplified)
  app.delete("/api/itinerary/:itemId", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const itemId = parseInt(req.params.itemId);
      const activity = await storage.getItineraryActivity(itemId);
      
      if (!activity) {
        return res.status(404).json({ message: "Itinerary item not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(activity.tripId, req.user.id);
      const trip = await storage.getTrip(activity.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      const deleted = await storage.deleteItineraryActivity(itemId);
      
      if (deleted) {
        // Broadcast to all connected clients in this trip
        broadcastToTrip(activity.tripId, {
          type: 'itinerary_item_deleted',
          data: { itemId }
        });
        
        res.status(200).json({ message: "Itinerary item deleted successfully" });
      } else {
        res.status(404).json({ message: "Itinerary item not found" });
      }
    } catch (error: any) {
      console.error("Error deleting itinerary item:", error);
      res.status(500).json({ message: "Failed to delete itinerary item", error: error.message });
    }
  });
  
  // Get activities for a specific day or trip
  app.get("/api/trips/:tripId/itinerary/activities", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const dayId = req.query.dayId ? parseInt(req.query.dayId as string) : undefined;
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      const activities = await storage.getItineraryActivities(dayId, tripId);
      res.status(200).json(activities);
    } catch (error) {
      console.error("Error fetching itinerary activities:", error);
      res.status(500).json({ message: "Failed to get itinerary activities", error });
    }
  });
  
  // Create a new itinerary activity
  app.post("/api/itinerary/days/:dayId/activities", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const dayId = parseInt(req.params.dayId);
      const day = await storage.getItineraryDay(dayId);
      
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }
      
      // Check if user is a member of this trip
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
      
      // Create activity record for tracking
      await storage.createActivity({
        tripId: day.tripId,
        userId: req.user.id,
        activityType: 'itinerary_added',
        activityData: { 
          title: newActivity.title,
          time: newActivity.time,
          day: newActivity.day,
          tripName: trip?.name || "Unknown Trip"
        }
      });
      
      // Send notification for new itinerary activity
      await sendNotification(
        day.tripId,
        req.user.id,
        'itinerary_add',
        'New Activity Added',
        `${newActivity.title} has been added to the itinerary for Day ${newActivity.day} at ${newActivity.time}`,
        newActivity.title
      );
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(day.tripId, {
        type: 'itinerary_activity_added',
        data: newActivity
      });
      
      res.status(201).json(newActivity);
    } catch (error) {
      console.error("Error creating itinerary activity:", error);
      res.status(500).json({ message: "Failed to create itinerary activity", error });
    }
  });

  // === COLLABORATIVE SUGGESTION ENDPOINTS ===

  // Create activity suggestion
  app.post("/api/trips/:tripId/itinerary/suggestions", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      const { day, time, title, description, location } = req.body;
      
      if (!title?.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      // First, ensure we have a day for this trip
      const dayTitle = `Day ${day || 1}`;
      const existingDays = await storage.getItineraryDays(tripId);
      let existingDay = existingDays.find(d => d.title === dayTitle);
      
      if (!existingDay) {
        // Create the day first
        const dayData = {
          tripId,
          date: new Date().toISOString().split('T')[0],
          title: dayTitle,
          createdBy: req.user.id
        };
        existingDay = await storage.createItineraryDay(dayData);
      }
      
      // Create the activity suggestion (not approved)
      const activityData = {
        dayId: existingDay.id,
        tripId,
        title: title.trim(),
        description: description?.trim() || null,
        startTime: time || null,
        endTime: null,
        location: location?.trim() || null,
        category: 'general',
        estimatedCost: null,
        actualCost: null,
        notes: null,
        createdBy: req.user.id,
        sortOrder: 0,
        isCompleted: false,
        isAiGenerated: false,
        isSuggestion: true,
        isApproved: false,
      };
      
      const newSuggestion = await storage.createItineraryActivity(activityData);
      
      // Create activity record for tracking
      await storage.createActivity({
        tripId,
        userId: req.user.id,
        activityType: 'suggestion_created',
        activityData: { 
          title: newSuggestion.title,
          time: newSuggestion.startTime || time,
          day: day || 1,
          tripName: trip?.name || "Unknown Trip"
        }
      });
      
      // Send notification for new suggestion
      await sendNotification(
        tripId,
        req.user.id,
        'suggestion_add',
        'New Activity Suggested',
        `${newSuggestion.title} has been suggested for Day ${day || 1}${time ? ` at ${time}` : ''}`,
        newSuggestion.title
      );
      
      // Transform to match frontend expectations
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
        votes: [],
      };
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(tripId, {
        type: 'activity_suggested',
        data: responseSuggestion
      });
      
      res.status(201).json(responseSuggestion);
    } catch (error: any) {
      console.error("Error creating activity suggestion:", error);
      res.status(500).json({ message: "Failed to create activity suggestion", error: error.message });
    }
  });

  // Get activity suggestions for a trip
  app.get("/api/trips/:tripId/itinerary/suggestions", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      const suggestions = await storage.getSuggestedActivities(tripId);
      
      // Get days for mapping and votes for each suggestion
      const days = await storage.getItineraryDays(tripId);
      const dayMap = days.reduce((map, day, index) => {
        map[day.id] = index + 1;
        return map;
      }, {} as Record<number, number>);
      
      // Get votes for each suggestion
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
            votes: votes,
          };
        })
      );
      
      res.status(200).json(suggestionsWithVotes);
    } catch (error) {
      console.error("Error fetching activity suggestions:", error);
      res.status(500).json({ message: "Failed to get activity suggestions", error });
    }
  });

  // Vote on activity suggestion
  app.post("/api/trips/:tripId/itinerary/suggestions/:suggestionId/vote", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const suggestionId = parseInt(req.params.suggestionId);
      const { vote } = req.body; // "up", "down", "interested"
      
      if (!["up", "down", "interested"].includes(vote)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      // Create or update vote
      const voteData = {
        activityId: suggestionId,
        userId: req.user.id,
        vote,
      };
      
      const newVote = await storage.createItineraryActivityVote(voteData);
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(tripId, {
        type: 'suggestion_voted',
        data: { suggestionId, vote: newVote }
      });
      
      res.status(201).json(newVote);
    } catch (error: any) {
      console.error("Error voting on suggestion:", error);
      res.status(500).json({ message: "Failed to vote on suggestion", error: error.message });
    }
  });

  // Approve activity suggestion (admins/creators only)
  app.post("/api/trips/:tripId/itinerary/suggestions/:suggestionId/approve", async (req: any, res: any) => {
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
      
      // Check if user is trip creator or admin
      const member = await storage.getTripMember(tripId, req.user.id);
      if (trip.createdById !== req.user.id && (!member || !member.isAdmin)) {
        return res.status(403).json({ message: "Only trip creators and admins can approve suggestions" });
      }
      
      const approvedActivity = await storage.approveActivitySuggestion(suggestionId, req.user.id);
      
      if (!approvedActivity) {
        return res.status(404).json({ message: "Activity suggestion not found" });
      }
      
      // Create activity record for tracking
      await storage.createActivity({
        tripId,
        userId: req.user.id,
        activityType: 'suggestion_approved',
        activityData: { 
          title: approvedActivity.title,
          tripName: trip?.name || "Unknown Trip"
        }
      });
      
      // Send notification for approved suggestion
      await sendNotification(
        tripId,
        req.user.id,
        'suggestion_approve',
        'Activity Suggestion Approved',
        `${approvedActivity.title} has been approved and added to the itinerary`,
        approvedActivity.title
      );
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(tripId, {
        type: 'suggestion_approved',
        data: { suggestionId, approvedBy: req.user.id }
      });
      
      res.status(200).json({ success: true, activity: approvedActivity });
    } catch (error: any) {
      console.error("Error approving suggestion:", error);
      res.status(500).json({ message: "Failed to approve suggestion", error: error.message });
    }
  });

  // Reject activity suggestion (admins/creators only)
  app.post("/api/trips/:tripId/itinerary/suggestions/:suggestionId/reject", async (req: any, res: any) => {
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
      
      // Check if user is trip creator or admin
      const member = await storage.getTripMember(tripId, req.user.id);
      if (trip.createdById !== req.user.id && (!member || !member.isAdmin)) {
        return res.status(403).json({ message: "Only trip creators and admins can reject suggestions" });
      }
      
      const rejectedActivity = await storage.rejectActivitySuggestion(suggestionId, req.user.id);
      
      if (!rejectedActivity) {
        return res.status(404).json({ message: "Activity suggestion not found" });
      }
      
      // Create activity record for tracking
      await storage.createActivity({
        tripId,
        userId: req.user.id,
        activityType: 'suggestion_rejected',
        activityData: { 
          title: rejectedActivity.title,
          tripName: trip?.name || "Unknown Trip"
        }
      });
      
      // Send notification for rejected suggestion
      await sendNotification(
        tripId,
        req.user.id,
        'suggestion_reject',
        'Activity Suggestion Declined',
        `${rejectedActivity.title} has been declined`,
        rejectedActivity.title
      );
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(tripId, {
        type: 'suggestion_rejected',
        data: { suggestionId, rejectedBy: req.user.id }
      });
      
      res.status(200).json({ success: true, activity: rejectedActivity });
    } catch (error: any) {
      console.error("Error rejecting suggestion:", error);
      res.status(500).json({ message: "Failed to reject suggestion", error: error.message });
    }
  });

  // Delete activity suggestion (admins/creators only)
  app.delete("/api/trips/:tripId/itinerary/suggestions/:suggestionId", async (req: any, res: any) => {
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
      
      // Check if user is trip creator or admin
      const member = await storage.getTripMember(tripId, req.user.id);
      if (trip.createdById !== req.user.id && (!member || !member.isAdmin)) {
        return res.status(403).json({ message: "Only trip creators and admins can delete suggestions" });
      }
      
      const deleted = await storage.deleteActivitySuggestion(suggestionId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Activity suggestion not found" });
      }
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(tripId, {
        type: 'suggestion_deleted',
        data: { suggestionId, deletedBy: req.user.id }
      });
      
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error deleting suggestion:", error);
      res.status(500).json({ message: "Failed to delete suggestion", error: error.message });
    }
  });

  // Update activity suggestion (admins/creators only)
  app.put("/api/trips/:tripId/itinerary/suggestions/:suggestionId", async (req: any, res: any) => {
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
      
      // Check if user is trip creator or admin
      const member = await storage.getTripMember(tripId, req.user.id);
      if (trip.createdById !== req.user.id && (!member || !member.isAdmin)) {
        return res.status(403).json({ message: "Only trip creators and admins can update suggestions" });
      }
      
      // Map frontend fields to database fields
      const updateData: any = {
        title,
        description,
        location,
      };
      
      if (time) {
        updateData.startTime = time;
      }
      
      const updated = await storage.updateActivitySuggestion(suggestionId, updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Activity suggestion not found" });
      }
      
      // Create activity record for tracking
      await storage.createActivity({
        tripId,
        userId: req.user.id,
        activityType: 'suggestion_updated',
        activityData: { 
          title: updated.title,
          tripName: trip?.name || "Unknown Trip"
        }
      });
      
      // Send notification for updated suggestion
      await sendNotification(
        tripId,
        req.user.id,
        'suggestion_update',
        'Activity Suggestion Updated',
        `${updated.title} suggestion has been updated`,
        updated.title
      );
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(tripId, {
        type: 'suggestion_updated',
        data: { suggestionId, updatedBy: req.user.id }
      });
      
      res.status(200).json({ success: true, suggestion: updated });
    } catch (error: any) {
      console.error("Error updating suggestion:", error);
      res.status(500).json({ message: "Failed to update suggestion", error: error.message });
    }
  });
  
  // Update an itinerary activity
  app.patch("/api/itinerary/activities/:activityId", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const activityId = parseInt(req.params.activityId);
      const activity = await storage.getItineraryActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(activity.tripId, req.user.id);
      const trip = await storage.getTrip(activity.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      console.log('Update request body:', req.body);
      const updatedActivity = await storage.updateItineraryActivity(activityId, req.body);
      
      if (updatedActivity) {
        // Create activity record for tracking
        await storage.createActivity({
          tripId: activity.tripId,
          userId: req.user.id,
          activityType: 'itinerary_updated',
          activityData: { 
            title: updatedActivity.title,
            time: updatedActivity.time,
            day: updatedActivity.day,
            tripName: trip?.name || "Unknown Trip"
          }
        });
        
        // Send notification for updated itinerary activity
        await sendNotification(
          activity.tripId,
          req.user.id,
          'itinerary_update',
          'Activity Updated',
          `${updatedActivity.title} has been updated in the itinerary for Day ${updatedActivity.day}`,
          updatedActivity.title
        );
      }
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(activity.tripId, {
        type: 'itinerary_activity_updated',
        data: updatedActivity
      });
      
      res.status(200).json(updatedActivity);
    } catch (error) {
      console.error("Error updating itinerary activity:", error);
      res.status(500).json({ message: "Failed to update itinerary activity", error });
    }
  });
  
  // Delete an itinerary activity
  app.delete("/api/itinerary/activities/:activityId", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const activityId = parseInt(req.params.activityId);
      const activity = await storage.getItineraryActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(activity.tripId, req.user.id);
      const trip = await storage.getTrip(activity.tripId);
      if (!isMember && trip?.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      console.log(`Attempting to delete itinerary activity ${activityId}`);
      const deleted = await storage.deleteItineraryActivity(activityId);
      console.log(`Delete result: ${deleted}`);
      
      if (deleted) {
        // Create activity record for tracking
        await storage.createActivity({
          tripId: activity.tripId,
          userId: req.user.id,
          activityType: 'itinerary_deleted',
          activityData: { 
            title: activity.title,
            time: activity.time,
            day: activity.day,
            tripName: trip?.name || "Unknown Trip"
          }
        });
        
        // Send notification for deleted itinerary activity
        await sendNotification(
          activity.tripId,
          req.user.id,
          'itinerary_delete',
          'Activity Removed',
          `${activity.title} has been removed from the itinerary for Day ${activity.day}`,
          activity.title
        );
        
        // Broadcast to all connected clients in this trip
        broadcastToTrip(activity.tripId, {
          type: 'itinerary_activity_deleted',
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
  
  // Vote on an itinerary activity
  app.post("/api/itinerary/activities/:activityId/vote", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const activityId = parseInt(req.params.activityId);
      const { vote } = req.body;
      
      if (!vote || !['up', 'down', 'interested'].includes(vote)) {
        return res.status(400).json({ message: "Valid vote is required (up, down, interested)" });
      }
      
      const activity = await storage.getItineraryActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Check if user is a member of this trip
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
      
      // Get all votes for this activity to send updated count
      const allVotes = await storage.getItineraryActivityVotes(activityId);
      
      // Broadcast to all connected clients in this trip
      broadcastToTrip(activity.tripId, {
        type: 'itinerary_activity_vote_updated',
        data: { activityId, votes: allVotes }
      });
      
      res.status(201).json(newVote);
    } catch (error) {
      console.error("Error voting on itinerary activity:", error);
      res.status(500).json({ message: "Failed to vote on activity", error });
    }
  });
  
  // Get votes for an activity
  app.get("/api/itinerary/activities/:activityId/votes", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const activityId = parseInt(req.params.activityId);
      const activity = await storage.getItineraryActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Check if user is a member of this trip
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
  
  // AI-powered itinerary generation
  app.post("/api/trips/:tripId/itinerary/generate", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      // Get existing activities to avoid duplicates
      const existingActivities = await storage.getItineraryActivities(undefined, tripId);
      const existingActivitySummaries = existingActivities.map(a => ({
        title: a.title,
        category: a.category || 'general',
        date: 'unknown' // We'd need to get the day info for this
      }));
      
      // Prepare the AI request
      const aiRequest = {
        destination: trip.location || 'Unknown destination',
        tripType: trip.tripType || 'general',
        startDate: typeof trip.startDate === 'string' ? trip.startDate : new Date().toISOString().split('T')[0],
        endDate: typeof trip.endDate === 'string' ? trip.endDate : new Date().toISOString().split('T')[0],
        groupSize: req.body.groupSize,
        budget: req.body.budget,
        interests: req.body.interests,
        existingActivities: existingActivitySummaries
      };
      
      // Generate AI suggestions
      const suggestions = await aiItineraryService.generateItinerarySuggestions(aiRequest);
      
      res.status(200).json(suggestions);
    } catch (error) {
      console.error("Error generating AI itinerary:", error);
      res.status(500).json({ message: "Failed to generate itinerary suggestions", error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // AI-powered activity suggestions
  app.post("/api/trips/:tripId/itinerary/suggest-activities", async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check if user is a member of this trip
      const isMember = await storage.getTripMember(tripId, req.user.id);
      if (!isMember && trip.createdById !== req.user.id) {
        return res.status(403).json({ message: "You are not a member of this trip" });
      }
      
      // Get existing activities to avoid suggesting similar ones
      const existingActivities = await storage.getItineraryActivities(undefined, tripId);
      const existingTitles = existingActivities.map(a => a.title);
      
      // Generate AI activity suggestions
      const suggestions = await aiItineraryService.generateActivitySuggestions(
        trip.location || 'Unknown destination',
        trip.tripType || 'general',
        existingTitles
      );
      
      res.status(200).json(suggestions);
    } catch (error) {
      console.error("Error generating activity suggestions:", error);
      res.status(500).json({ message: "Failed to generate activity suggestions", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Broadcast function is already defined above as a constant

  // Clean up the WebSocket server on server shutdown
  httpServer.on('close', () => {
    console.log('Cleaning up WebSocket server');
    clearInterval(pingInterval);
    wss.clients.forEach((ws) => {
      ws.terminate();
    });
  });

  return httpServer;
}
