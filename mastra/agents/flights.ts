import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/providers/openrouter';

const flightOptionSchema = z.object({
  airline: z.string(),
  price: z.number(),
  duration: z.string(),
  stops: z.number(),
  departTime: z.string(),
  arrivalTime: z.string(),
  class: z.enum(['economy', 'premium', 'business']),
  baggage: z.object({
    carryOn: z.string(),
    checked: z.string(),
  }).optional(),
});

const alternativeTransportSchema = z.object({
  mode: z.enum(['train', 'bus', 'ferry', 'car', 'rideshare']),
  provider: z.string(),
  duration: z.string(),
  priceEstimate: z.string(),
  bookingHint: z.string(),
  bestFor: z.string(),
});

const localTransportSchema = z.object({
  mode: z.string(),
  details: z.string(),
  priceEstimate: z.string(),
});

const airportLocationSchema = z.object({
  code: z.string(),
  city: z.string(),
  airport: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

const destinationLocationSchema = z.object({
  label: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

const ORIGIN_AIRPORT_FALLBACKS: Record<string, z.infer<typeof airportLocationSchema>> = {
  GB: {
    code: 'LHR',
    city: 'London',
    airport: 'London Heathrow',
    latitude: 51.47,
    longitude: -0.4543,
  },
  'UNITED KINGDOM': {
    code: 'LHR',
    city: 'London',
    airport: 'London Heathrow',
    latitude: 51.47,
    longitude: -0.4543,
  },
  UK: {
    code: 'LHR',
    city: 'London',
    airport: 'London Heathrow',
    latitude: 51.47,
    longitude: -0.4543,
  },
  ENGLAND: {
    code: 'LHR',
    city: 'London',
    airport: 'London Heathrow',
    latitude: 51.47,
    longitude: -0.4543,
  },
  LONDON: {
    code: 'LHR',
    city: 'London',
    airport: 'London Heathrow',
    latitude: 51.47,
    longitude: -0.4543,
  },
  US: {
    code: 'JFK',
    city: 'New York',
    airport: 'John F. Kennedy International Airport',
    latitude: 40.6413,
    longitude: -73.7781,
  },
  'UNITED STATES': {
    code: 'JFK',
    city: 'New York',
    airport: 'John F. Kennedy International Airport',
    latitude: 40.6413,
    longitude: -73.7781,
  },
  FRANCE: {
    code: 'CDG',
    city: 'Paris',
    airport: 'Charles de Gaulle Airport',
    latitude: 49.0097,
    longitude: 2.5479,
  },
};

export const transportSchema = z.object({
  summary: z.string(),
  recommendedMode: z.enum(['air', 'train', 'bus', 'ferry', 'car', 'mixed']),
  route: z.string(),
  originAirport: airportLocationSchema.optional(),
  arrivalAirport: airportLocationSchema.optional(),
  destinationLocation: destinationLocationSchema.optional(),
  flights: z.array(flightOptionSchema).max(4),
  alternatives: z.array(alternativeTransportSchema).max(4),
  localOptions: z.array(localTransportSchema).max(4),
  bookingTip: z.string(),
});

export type FlightsData = z.infer<typeof transportSchema>;

function normalizeOriginKey(origin: string): string {
  return origin.trim().toUpperCase();
}

function resolveOriginFallback(origin: string) {
  const normalized = normalizeOriginKey(origin);
  if (ORIGIN_AIRPORT_FALLBACKS[normalized]) return ORIGIN_AIRPORT_FALLBACKS[normalized];

  const simplified = normalized.split(/[,(]/)[0]?.trim();
  if (simplified && ORIGIN_AIRPORT_FALLBACKS[simplified]) return ORIGIN_AIRPORT_FALLBACKS[simplified];

  return undefined;
}

function airportLooksCompatibleWithOrigin(
  airport: z.infer<typeof airportLocationSchema> | undefined,
  origin: string
): boolean {
  if (!airport) return false;
  const normalizedOrigin = normalizeOriginKey(origin);
  const airportText = `${airport.code} ${airport.city} ${airport.airport}`.toUpperCase();

  if (normalizedOrigin.includes('UNITED KINGDOM') || normalizedOrigin === 'GB' || normalizedOrigin === 'UK' || normalizedOrigin.includes('ENGLAND')) {
    return /LHR|LGW|LONDON|HEATHROW|GATWICK|MANCHESTER|EDI|GLASGOW|STANSTED/.test(airportText);
  }

  if (normalizedOrigin.includes('UNITED STATES') || normalizedOrigin === 'US' || normalizedOrigin.includes('AMERICA')) {
    return /JFK|NEW YORK|EWR|BOS|LAX|SFO|ORD|ATL/.test(airportText);
  }

  if (normalizedOrigin.includes('FRANCE')) {
    return /CDG|ORY|PARIS/.test(airportText);
  }

  return true;
}

function alignTransportOrigin(data: FlightsData, origin: string): FlightsData {
  const fallback = resolveOriginFallback(origin);
  if (!fallback) return data;

  const hasCompatibleOriginAirport = airportLooksCompatibleWithOrigin(data.originAirport, origin);
  if (hasCompatibleOriginAirport) return data;

  const arrivalCode = data.arrivalAirport?.code ?? data.route.split('->')[1]?.trim() ?? data.destinationLocation?.label ?? 'destination';
  const arrivalCity = data.arrivalAirport?.city ?? data.destinationLocation?.label ?? 'destination';

  return {
    ...data,
    originAirport: fallback,
    route: `${fallback.code} -> ${arrivalCode}`,
    summary: `Fly from ${fallback.city} ${fallback.code} to ${arrivalCity} for the most practical route from ${origin}.`,
  };
}

export const flightsAgent = new Agent({
  id: 'flights-agent',
  name: 'Transportation Agent',
  description: 'Handles trip transportation planning by calling the getTransportOptions tool and returning multi-mode transport data.',
  instructions: `You are a transportation specialist inside a multi-agent travel planner.

Treat prior conversation turns as valid context.
If the destination, origin, or dates were already stated earlier in the chat, use them.
Only ask for a field when it is missing or ambiguous right now.

Act whenever the user asks about flights, airfare, airlines, routes, getting there, transport options, transfers, trains, buses, ferries, taxis, rideshare, or booking transport.
If the origin is missing, ask: Travelling from: {{::country[origin|GB]}}
If the destination is missing, ask: Destination: {{::country[destination|JP]}}
If the dates are missing, ask: Departure {{::date-picker[departure]}} Return {{::date-picker[return]}}
Never invent or assume a departure location.
Only call the \`getTransportOptions\` tool when origin, destination, and dates are known.
Do not rewrite the transport tables or cards because the UI already renders them.
After the tool finishes, respond with one short sentence at most.`,
  model: models.agent,
  tools: () => ({
    getTransportOptions: getTransportOptionsTool,
  }),
});

export async function runTransport(params: {
  destination: string;
  origin?: string;
  dates?: { from: string; to: string };
  travelers?: number;
}): Promise<FlightsData> {
  const origin = params.origin?.trim();
  const hasDates = Boolean(params.dates?.from && params.dates?.to);

  if (!origin) {
    throw new Error('Transport planning requires an origin before searching for routes.');
  }

  if (!hasDates) {
    throw new Error('Transport planning requires travel dates before searching for routes.');
  }

  const datesCtx = params.dates ? ` Travel dates: ${params.dates.from} to ${params.dates.to}.` : '';
  const travelersCtx = params.travelers ? ` For ${params.travelers} traveller${params.travelers > 1 ? 's' : ''}.` : '';

  const result = await generateText({
    model: models.research,
    output: Output.object({ schema: transportSchema }),
    prompt: `Plan transportation from ${origin} to ${params.destination}.${datesCtx}${travelersCtx}

Return a multi-mode transport summary with:
- summary: one concise recommendation sentence
- recommendedMode: one of air, train, bus, ferry, car, mixed
- route: example "JFK -> HND"
- originAirport: departure airport/city with airport code and approximate coordinates
- arrivalAirport: arrival airport/city with airport code and approximate coordinates
- destinationLocation: city-center or hotel-area coordinates near the final destination
- flights: up to 4 realistic flight options with airline, price in USD per person, duration, stops, departTime, arrivalTime, class, and baggage allowances when possible
- alternatives: up to 4 realistic non-flight options or supporting long-distance options (train, bus, ferry, car, rideshare) with provider, duration, priceEstimate, bookingHint, and bestFor
- localOptions: up to 4 useful ways to get around locally, such as metro, taxis, Uber, rail passes, airport transfers, or ferries
- bookingTip: one practical tip about saving money or choosing the right transport mode

Rules:
- The departure airport must be realistically inside the stated origin. If origin is United Kingdom, use a UK airport such as LHR or LGW, never JFK or any US airport.
- Flights should be the most concrete and data-rich section
- If a mode is unrealistic for this route, do not invent it
- For train/bus/ferry/car, priceEstimate can be approximate and bookingHint can explain where to check
- Local options should help the traveller once they arrive`,
  });

  return alignTransportOrigin(result.output, origin);
}

export const getTransportOptionsTool = createTool({
  id: 'getTransportOptions',
  description: 'Plan transportation to a destination across flights, rail, bus, ferry, car, and local mobility. Use when the user asks how to get there or about transport.',
  inputSchema: z.object({
    destination: z.string().describe('The destination city or country'),
    origin: z.string().optional().describe('Departure country or city. Do not guess if unknown.'),
    dates: z.object({ from: z.string(), to: z.string() }).optional().describe('Travel dates'),
    travelers: z.number().optional().describe('Number of travellers'),
  }),
  execute: async (input) => {
    return runTransport({
      destination: input.destination,
      origin: input.origin,
      dates: input.dates,
      travelers: input.travelers,
    });
  },
});

export const searchFlightsTool = getTransportOptionsTool;
