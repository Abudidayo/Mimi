import type { AgentData } from "@/components/AgentPanel";
import type { Country } from "@/components/inline-ui/CountryPicker";
import type { EventsData } from "@/components/agent-ui/EventsCard";
import type { FlightOption, FlightsData, SelectedFlightOption } from "@/components/agent-ui/FlightsCard";
import type { LodgingData, LodgingOption, SelectedLodgingOption } from "@/components/agent-ui/LodgingCard";
import type { DaySchedule } from "@/lib/utils/parse-itinerary";

export interface TripMapPoint {
  label: string;
  code?: string;
  latitude: number;
  longitude: number;
  kind: "origin" | "airport" | "stay";
}

export interface TripTimelineItem {
  id: string;
  kind: "arrive" | "transfer" | "stay" | "explore" | "depart";
  title: string;
  subtitle: string;
  description: string;
  dayLabel?: string;
}

export interface SocialSpotlight {
  platform: "instagram" | "tiktok";
  title: string;
  creator?: string;
  url: string;
  thumbnailUrl?: string;
}

export interface TripArtifact {
  title: string;
  destination: string;
  originLabel?: string;
  travelers: number;
  budgetPerPerson?: number;
  stayType?: string;
  dateRangeLabel: string;
  dates?: { from: string; to: string };
  days: number;
  totalEstimate?: number;
  segments: string[];
  mapPoints: TripMapPoint[];
  routeCoordinates: Array<[number, number]>;
  timeline: TripTimelineItem[];
  flights?: FlightsData;
  selectedFlight?: SelectedFlightOption | FlightOption;
  lodging?: LodgingData;
  selectedLodging?: SelectedLodgingOption | LodgingOption;
  events?: EventsData;
  itinerary?: DaySchedule[];
}

interface MapPointSource {
  label: string;
  code?: string;
  latitude?: number;
  longitude?: number;
  kind: TripMapPoint["kind"];
}

const COORDINATE_LOOKUP: Record<string, { latitude: number; longitude: number }> = {
  GB: { latitude: 51.5072, longitude: -0.1276 },
  "UNITED KINGDOM": { latitude: 51.5072, longitude: -0.1276 },
  ENGLAND: { latitude: 51.5072, longitude: -0.1276 },
  LONDON: { latitude: 51.5072, longitude: -0.1276 },
  LHR: { latitude: 51.47, longitude: -0.4543 },
  LGW: { latitude: 51.1537, longitude: -0.1821 },
  US: { latitude: 40.7128, longitude: -74.006 },
  "UNITED STATES": { latitude: 40.7128, longitude: -74.006 },
  JFK: { latitude: 40.6413, longitude: -73.7781 },
  JAPAN: { latitude: 35.6762, longitude: 139.6503 },
  JP: { latitude: 35.6762, longitude: 139.6503 },
  TOKYO: { latitude: 35.6762, longitude: 139.6503 },
  NRT: { latitude: 35.772, longitude: 140.3929 },
  HND: { latitude: 35.5494, longitude: 139.7798 },
  KYOTO: { latitude: 35.0116, longitude: 135.7681 },
  OSAKA: { latitude: 34.6937, longitude: 135.5023 },
  MITOYO: { latitude: 34.1827, longitude: 133.7151 },
  ALBANIA: { latitude: 41.3275, longitude: 19.8187 },
  AL: { latitude: 41.3275, longitude: 19.8187 },
  TIRANA: { latitude: 41.3275, longitude: 19.8187 },
  TIA: { latitude: 41.4147, longitude: 19.7206 },
  DURRES: { latitude: 41.3231, longitude: 19.4414 },
  "DURRËS": { latitude: 41.3231, longitude: 19.4414 },
  ICELAND: { latitude: 64.1466, longitude: -21.9426 },
  IS: { latitude: 64.1466, longitude: -21.9426 },
  REYKJAVIK: { latitude: 64.1466, longitude: -21.9426 },
  KEF: { latitude: 63.985, longitude: -22.6056 },
  PARIS: { latitude: 48.8566, longitude: 2.3522 },
  CDG: { latitude: 49.0097, longitude: 2.5479 },
  ROME: { latitude: 41.9028, longitude: 12.4964 },
  FCO: { latitude: 41.8003, longitude: 12.2389 },
  BARCELONA: { latitude: 41.3874, longitude: 2.1686 },
  BCN: { latitude: 41.2974, longitude: 2.0833 },
};

function toIsoDateLabel(value: unknown): string | undefined {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseCountry(value: unknown): Country | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.code !== "string" || typeof candidate.name !== "string") return undefined;
  return { code: candidate.code, name: candidate.name };
}

function parseSelectedFlight(value: unknown): SelectedFlightOption | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<SelectedFlightOption>;
  if (typeof candidate.airline !== "string" || typeof candidate.departTime !== "string" || typeof candidate.arrivalTime !== "string") {
    return undefined;
  }
  return candidate as SelectedFlightOption;
}

function parseSelectedLodging(value: unknown): SelectedLodgingOption | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<SelectedLodgingOption>;
  if (typeof candidate.name !== "string" || typeof candidate.provider !== "string") return undefined;
  return candidate as SelectedLodgingOption;
}

function inferTripDays(dates?: { from?: string; to?: string }, itinerary?: DaySchedule[]): number {
  if (itinerary?.length) return itinerary.length;
  if (dates?.from && dates?.to) {
    const from = new Date(dates.from);
    const to = new Date(dates.to);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0) return diff + 1;
    }
  }
  return 7;
}

function formatDateRange(dates?: { from?: string; to?: string }): string {
  if (dates?.from && dates?.to) {
    return `${dates.from} → ${dates.to}`;
  }
  if (dates?.from) return dates.from;
  return "Dates to be confirmed";
}

function toMapPoint(source: MapPointSource | undefined): TripMapPoint | null {
  if (!source) return null;
  let latitude = source.latitude;
  let longitude = source.longitude;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    const candidates = [source.code, source.label]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .flatMap((value) => {
        const normalized = value.trim().toUpperCase();
        const simplified = normalized.split(/[,(]/)[0]?.trim();
        return simplified && simplified !== normalized ? [normalized, simplified] : [normalized];
      });

    for (const candidate of candidates) {
      const match = COORDINATE_LOOKUP[candidate];
      if (match) {
        latitude = match.latitude;
        longitude = match.longitude;
        break;
      }
    }
  }

  if (typeof latitude !== "number" || typeof longitude !== "number") return null;

  return {
    label: source.label,
    code: source.code,
    latitude,
    longitude,
    kind: source.kind,
  };
}

function pickSelectedFlight(flights: FlightsData | undefined, selected: SelectedFlightOption | undefined) {
  if (!flights) return selected;
  const flightList = flights.flights;
  const flightsArray = Array.isArray(flightList) ? flightList : [];
  if (!selected) return flightsArray[0];
  return (
    flightsArray.find(
      (option) =>
        option.airline === selected.airline &&
        option.departTime === selected.departTime &&
        option.arrivalTime === selected.arrivalTime &&
        option.price === selected.price
    ) ?? selected
  );
}

function pickSelectedLodging(lodging: LodgingData | undefined, selected: SelectedLodgingOption | undefined) {
  if (!lodging) return selected;
  const optionList = lodging.options;
  const options = Array.isArray(optionList) ? optionList : [];
  if (!selected) return options[0];
  return (
    options.find(
      (option) =>
        option.name === selected.name &&
        option.provider === selected.provider &&
        option.totalPrice === selected.totalPrice
    ) ?? selected
  );
}

function buildTimeline({
  destination,
  dates,
  flights,
  selectedLodging,
  events,
  itinerary,
}: {
  destination: string;
  dates?: { from?: string; to?: string };
  flights?: FlightsData;
  selectedLodging?: SelectedLodgingOption | LodgingOption;
  events?: EventsData;
  itinerary?: DaySchedule[];
}): TripTimelineItem[] {
  const items: TripTimelineItem[] = [];

  if (flights?.arrivalAirport) {
    items.push({
      id: "arrive",
      kind: "arrive",
      title: `Arrive in ${flights.arrivalAirport.city || destination}`,
      subtitle: dates?.from ?? "Arrival",
      description:
        selectedLodging?.neighborhood
          ? `Land at ${flights.arrivalAirport.airport} and continue toward ${selectedLodging.neighborhood}.`
          : flights.summary,
      dayLabel: "Arrival",
    });
  }

  if (flights?.localOptions?.[0]) {
    items.push({
      id: "transfer",
      kind: "transfer",
      title: flights.localOptions[0].mode.toLowerCase(),
      subtitle: dates?.from ?? "Arrival transfer",
      description: flights.localOptions[0].details,
    });
  }

  if (selectedLodging) {
    items.push({
      id: "stay",
      kind: "stay",
      title: selectedLodging.name,
      subtitle: selectedLodging.neighborhood,
      description: `${selectedLodging.provider} · $${selectedLodging.totalPrice.toLocaleString()} total stay`,
      dayLabel: itinerary?.length ? `Days 1-${Math.min(itinerary.length, 3)}` : undefined,
    });
  }

  if (events?.events?.[0]) {
    items.push({
      id: "explore",
      kind: "explore",
      title: events.events[0].name,
      subtitle: events.events[0].date,
      description: events.events[0].description,
    });
  }

  items.push({
    id: "depart",
    kind: "depart",
    title: `Depart ${destination}`,
    subtitle: dates?.to ?? "Departure",
    description: flights?.route ?? "Return leg to origin",
    dayLabel: itinerary?.length ? `Day ${itinerary.length}` : undefined,
  });

  return items;
}

export function buildTripArtifact(params: {
  agentData: AgentData;
  controlValues: Record<string, unknown>;
}): TripArtifact | null {
  const { agentData, controlValues } = params;

  const destinationCountry = parseCountry(controlValues.destination);
  const originCountry = parseCountry(controlValues.origin);
  const dates = {
    from: toIsoDateLabel(controlValues.departure),
    to: toIsoDateLabel(controlValues.return),
  };
  const travelers = parseNumber(controlValues.travelers) ?? 2;
  const budgetPerPerson = parseNumber(controlValues.budget);
  const stayType = typeof controlValues.stay_type === "string" ? controlValues.stay_type : undefined;

  const flights = agentData.flights;
  const lodging = agentData.lodging;
  const selectedFlight = pickSelectedFlight(flights, parseSelectedFlight(controlValues.selected_flight));
  const selectedLodging = pickSelectedLodging(lodging, parseSelectedLodging(controlValues.selected_lodging));

  const destination =
    lodging?.destination ??
    flights?.arrivalAirport?.city ??
    destinationCountry?.name ??
    agentData.events?.destination ??
    agentData.weather?.destination;

  if (!destination && !agentData.itinerary?.length) {
    return null;
  }

  const days = inferTripDays(dates, agentData.itinerary);

  const mapPoints = [
    toMapPoint(
      flights?.originAirport
        ? {
            label: flights.originAirport.city || flights.originAirport.code || originCountry?.name || "Origin",
            code: flights.originAirport.code,
            latitude: flights.originAirport.latitude,
            longitude: flights.originAirport.longitude,
            kind: "origin",
          }
        : undefined
    ),
    toMapPoint(
      flights?.arrivalAirport
        ? {
            label: flights.arrivalAirport.city || flights.arrivalAirport.code || destination || "Arrival",
            code: flights.arrivalAirport.code,
            latitude: flights.arrivalAirport.latitude,
            longitude: flights.arrivalAirport.longitude,
            kind: "airport",
          }
        : undefined
    ),
    toMapPoint(
      selectedLodging?.location
        ? {
            label: selectedLodging.name,
            latitude: selectedLodging.location.latitude,
            longitude: selectedLodging.location.longitude,
            kind: "stay",
          }
        : lodging?.recommendedLocation
          ? {
              label: lodging.recommendedArea,
              latitude: lodging.recommendedLocation.latitude,
              longitude: lodging.recommendedLocation.longitude,
              kind: "stay",
            }
          : flights?.destinationLocation
            ? {
                label: flights.destinationLocation.label,
                latitude: flights.destinationLocation.latitude,
                longitude: flights.destinationLocation.longitude,
                kind: "stay",
              }
            : undefined
    ),
  ].filter(Boolean) as TripMapPoint[];

  const dedupedMapPoints = mapPoints.filter(
    (point, index, collection) =>
      collection.findIndex(
        (candidate) =>
          candidate.kind === point.kind &&
          Math.abs(candidate.latitude - point.latitude) < 0.0001 &&
          Math.abs(candidate.longitude - point.longitude) < 0.0001
      ) === index
  );

  const totalEstimate =
    (selectedFlight?.price ?? 0) * travelers +
    (selectedLodging?.totalPrice ?? 0);

  const segments = [
    originCountry?.name ?? flights?.originAirport?.city ?? flights?.originAirport?.code ?? "Origin",
    flights?.arrivalAirport?.city ?? destination ?? "Destination",
    selectedLodging?.neighborhood ?? lodging?.recommendedArea ?? "Stay",
    originCountry?.name ?? flights?.originAirport?.city ?? flights?.originAirport?.code ?? "Origin",
  ].filter((value, index, values) => {
    if (!value) return false;
    if (index === 0 || index === values.length - 1) return true;
    return values[index - 1] !== value;
  });

  return {
    title: `${days}-Day ${destination || "Trip"} Adventure`,
    destination: destination || "Trip",
    originLabel: originCountry?.name ?? flights?.originAirport?.city,
    travelers,
    budgetPerPerson,
    stayType,
    dateRangeLabel: formatDateRange(dates),
    dates: dates.from || dates.to ? { from: dates.from ?? "", to: dates.to ?? "" } : undefined,
    days,
    totalEstimate: totalEstimate > 0 ? totalEstimate : undefined,
    segments,
    mapPoints: dedupedMapPoints,
    routeCoordinates: dedupedMapPoints.map((point) => [point.longitude, point.latitude]),
    timeline: buildTimeline({
      destination: destination || "Trip",
      dates,
      flights,
      selectedLodging,
      events: agentData.events,
      itinerary: agentData.itinerary,
    }),
    flights,
    selectedFlight,
    lodging,
    selectedLodging,
    events: agentData.events,
    itinerary: agentData.itinerary,
  };
}
