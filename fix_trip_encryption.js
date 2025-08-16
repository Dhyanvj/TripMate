import { encryptTrip } from './server/encryption.js';
import { db } from './server/index.js';
import { trips } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixTripEncryption() {
  try {
    // Get trip 29
    const trip = await db.select().from(trips).where(eq(trips.id, 29)).limit(1);
    if (!trip[0]) {
      console.log('Trip 29 not found');
      return;
    }
    
    const tripData = trip[0];
    console.log('Current trip data:', tripData);
    
    // Encrypt the current plain text data
    const encryptedData = await encryptTrip({
      name: tripData.name,
      location: tripData.location,
      description: tripData.description
    });
    
    console.log('Encrypted data ready');
    
    // Update with encrypted data
    await db.update(trips)
      .set({
        name: encryptedData.name,
        location: encryptedData.location,
        description: encryptedData.description
      })
      .where(eq(trips.id, 29));
      
    console.log('Trip 29 data re-encrypted successfully');
    
  } catch (error) {
    console.error('Error fixing encryption:', error);
  }
}

fixTripEncryption();