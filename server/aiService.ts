import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ItinerarySuggestionRequest {
  destination: string;
  tripType: string;
  startDate: string;
  endDate: string;
  groupSize?: number;
  budget?: string;
  interests?: string[];
  existingActivities?: Array<{
    title: string;
    category: string;
    date: string;
  }>;
}

export interface ActivitySuggestion {
  title: string;
  description: string;
  category: string;
  estimatedDuration: string;
  estimatedCost: number;
  location: string;
  bestTimeOfDay: string;
  difficulty: string;
  groupSize: string;
  tips: string;
}

export interface DayPlan {
  date: string;
  title: string;
  activities: Array<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: string;
    category: string;
    estimatedCost: number;
  }>;
}

export class AIItineraryService {
  async generateItinerarySuggestions(request: ItinerarySuggestionRequest): Promise<DayPlan[]> {
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
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.itinerary || [];
    } catch (error) {
      console.error("Error generating itinerary suggestions:", error);
      throw new Error("Failed to generate itinerary suggestions. Please try again later.");
    }
  }

  async generateActivitySuggestions(
    destination: string, 
    tripType: string, 
    existingActivities: string[] = []
  ): Promise<ActivitySuggestion[]> {
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
        temperature: 0.8,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.activities || [];
    } catch (error) {
      console.error("Error generating activity suggestions:", error);
      throw new Error("Failed to generate activity suggestions. Please try again later.");
    }
  }

  private buildItineraryPrompt(request: ItinerarySuggestionRequest): string {
    const days = this.calculateDays(request.startDate, request.endDate);
    const existingInfo = request.existingActivities?.length ? 
      `Consider these existing activities: ${request.existingActivities.map(a => `${a.title} (${a.category}) on ${a.date}`).join(", ")}. ` : '';
    
    return `Create a ${days}-day itinerary for a ${request.tripType} trip to ${request.destination}.
    
    Trip Details:
    - Destination: ${request.destination}
    - Trip Type: ${request.tripType}
    - Start Date: ${request.startDate}
    - End Date: ${request.endDate}
    - Group Size: ${request.groupSize || 'Not specified'}
    - Budget: ${request.budget || 'Moderate'}
    - Interests: ${request.interests?.join(", ") || 'General sightseeing'}
    
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

  private calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}

export const aiItineraryService = new AIItineraryService();