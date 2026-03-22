import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/providers/openrouter';
import type { DaySchedule } from '@/lib/utils/parse-itinerary';

const activitySchema = z.object({
  id: z.string().describe('Unique ID like "day1-act1"'),
  name: z.string().describe('Short activity name, max 50 chars'),
  category: z.enum(['morning', 'afternoon', 'evening', 'night', 'activity']),
  description: z.string().describe('1-2 sentence description of the activity'),
  duration: z.number().describe('Duration in minutes'),
  startTime: z.string().optional().describe('Start time in HH:MM format, e.g. "09:00"'),
  location: z.object({
    name: z.string().describe('Venue or neighbourhood name'),
    lat: z.number().describe('Latitude (approximate is fine)'),
    lng: z.number().describe('Longitude (approximate is fine)'),
  }),
  price: z.number().describe('Estimated cost per person in USD, 0 if free'),
  rating: z.number().optional().describe('Rating out of 5 if notable'),
  bookingRequired: z.boolean().optional().describe('Whether advance booking is recommended'),
});

const dayScheduleSchema = z.object({
  day: z.number().describe('Day number, starting at 1'),
  date: z.string().describe('Label like "Day 1" or an actual date string'),
  theme: z.string().optional().describe('Theme for the day, e.g. "Temples & Culture"'),
  activities: z.array(activitySchema).min(2).max(6),
});

const plannerOutputSchema = z.object({
  schedule: z.array(dayScheduleSchema).min(1).max(14),
});

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

export const plannerAgent = new Agent({
  id: 'planner-agent',
  name: 'Trip Planner Agent',
  description: 'Handles day-by-day itinerary generation by calling the tripPlanner tool and returning the itinerary board data.',
  instructions: `You are the itinerary specialist inside a multi-agent travel planner.

Only act when a destination and trip length are known.
Transportation and lodging are mandatory prerequisites.
Only call the \`tripPlanner\` tool after the coordinator has already gathered successful transport and lodging results for the same trip.
If those prerequisites are missing, stale, or unclear, do NOT generate an itinerary and do NOT guess. Respond with one short sentence telling the coordinator to run transport and lodging first.
When the prerequisites are present, call the \`tripPlanner\` tool.
Do not write the itinerary as plain text because the UI already renders the board.
After the tool finishes, respond with one short sentence at most.`,
  model: models.agent,
  tools: () => ({
    tripPlanner: tripPlannerTool,
  }),
});

export async function runPlanner(params: {
  destination: string;
  days: number;
  interests?: string[];
  budget?: number;
  pace?: 'relaxed' | 'moderate' | 'packed';
  departureDate?: string;
}): Promise<DaySchedule[]> {
  const pace = params.pace ?? 'moderate';
  const activitiesPerDay = pace === 'relaxed' ? '2-3' : pace === 'moderate' ? '3-4' : '4-5';
  const budgetCtx = params.budget ? ` Budget: ~$${params.budget}/person/day.` : '';
  const interestsCtx = params.interests?.length ? ` Key interests: ${params.interests.join(', ')}.` : '';
  const dateCtx = params.departureDate ? ` Starting ${params.departureDate}.` : '';

  const result = await generateText({
    model: models.research,
    output: Output.object({ schema: plannerOutputSchema }),
    prompt: `Create a detailed ${params.days}-day itinerary for ${params.destination}.${budgetCtx}${interestsCtx}${dateCtx}
Pace: ${pace} (${activitiesPerDay} meaningful activities per day).

For each day:
- Give a clear theme (e.g. "Old Town & History")
- Include ${activitiesPerDay} activities spread across morning/afternoon/evening
- Use real, specific place names with accurate coordinates
- Include a mix of free and paid activities
- Note booking requirements for popular spots
- Vary pace — don't schedule back-to-back long activities

Make it feel like a real, thoughtful travel plan a local expert would design.`,
  });

  return result.output.schedule as DaySchedule[];
}

export const tripPlannerTool = createTool({
  id: 'tripPlanner',
  description: 'Generate a full day-by-day trip itinerary as a structured schedule. Call when the user wants a full plan AND destination + number of days are known. This creates the kanban board.',
  inputSchema: z.object({
    destination: z.string().describe('The destination city or country'),
    days: z.number().describe('Number of days for the trip'),
    interests: z.array(z.string()).optional().describe('User interests, e.g. ["food", "culture", "nature"]'),
    budget: z.number().optional().describe('Daily budget per person in USD'),
    pace: z.enum(['relaxed', 'moderate', 'packed']).optional().describe('Trip pace preference'),
    departureDate: z.string().optional().describe('Departure date in YYYY-MM-DD format'),
  }),
  execute: async (input) => {
    return runPlanner({
      destination: input.destination,
      days: input.days,
      interests: input.interests,
      budget: input.budget,
      pace: input.pace,
      departureDate: input.departureDate,
    });
  },
});
