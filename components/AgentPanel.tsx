"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  CurrencyDollar,
  CloudSun,
  Stamp,
  Confetti,
  Bag,
  Airplane,
  HouseLine,
  Receipt,
  CalendarBlank,
  MapPin,
  CircleNotch,
  CheckCircle,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { SafetyCard, type SafetyData } from "@/components/agent-ui/SafetyCard";
import { CurrencyCard, type CurrencyData } from "@/components/agent-ui/CurrencyCard";
import { WeatherCard, type WeatherData } from "@/components/agent-ui/WeatherCard";
import { VisaCard, type VisaData } from "@/components/agent-ui/VisaCard";
import { EventsCard, type EventsData } from "@/components/agent-ui/EventsCard";
import { ShoppingCard, type ShoppingData } from "@/components/agent-ui/ShoppingCard";
import { FlightsCard, type FlightsData } from "@/components/agent-ui/FlightsCard";
import { LodgingCard, type LodgingData } from "@/components/agent-ui/LodgingCard";
import { BookingCard, type BookingData } from "@/components/agent-ui/BookingCard";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { DestinationCards } from "@/components/chat/DestinationCards";
import type { DaySchedule } from "@/lib/utils/parse-itinerary";
import type { SuggestionsData } from "@/mastra/agents/suggestions";
import { CONTROL_COLORS, pillBoxShadow, type ColorConfig } from "@/lib/inline-ui/colors";

export type AgentType = 'safety' | 'currency' | 'weather' | 'visa' | 'events' | 'shopping' | 'flights' | 'lodging' | 'booking' | 'itinerary' | 'suggestions';

export interface AgentData {
  safety?: SafetyData;
  currency?: CurrencyData;
  weather?: WeatherData;
  visa?: VisaData;
  events?: EventsData;
  shopping?: ShoppingData;
  flights?: FlightsData;
  lodging?: LodgingData;
  booking?: BookingData;
  itinerary?: DaySchedule[];
  suggestions?: SuggestionsData;
}

interface AgentConfig {
  id: AgentType;
  label: string;
  icon: React.ReactNode;
  color: ColorConfig;
}

const AGENTS: AgentConfig[] = [
  { id: 'weather',   label: 'Weather',   icon: <CloudSun       weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[1] },
  { id: 'safety',    label: 'Safety',    icon: <Shield         weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[0] },
  { id: 'currency',  label: 'Currency',  icon: <CurrencyDollar weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[2] },
  { id: 'visa',      label: 'Visa',      icon: <Stamp          weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[3] },
  { id: 'events',    label: 'Events',    icon: <Confetti       weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[4] },
  { id: 'shopping',  label: 'Packing',   icon: <Bag            weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[5] },
  { id: 'flights',   label: 'Transport', icon: <Airplane       weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[1] },
  { id: 'lodging',   label: 'Stay',      icon: <HouseLine      weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[3] },
  { id: 'booking',   label: 'Booking',   icon: <Receipt        weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[2] },
  { id: 'itinerary',   label: 'Itinerary',    icon: <CalendarBlank  weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[6] },
  { id: 'suggestions', label: 'Suggestions',  icon: <MapPin         weight="fill" className="w-3.5 h-3.5" />, color: CONTROL_COLORS[4] },
];

interface AgentPanelProps {
  data: AgentData;
  loading: Set<AgentType>;
  onAction?: (prompt: string) => void;
}

export function AgentPanel({ data, loading, onAction }: AgentPanelProps) {
  const [expanded, setExpanded] = useState<AgentType | null>(null);

  const visibleAgents = AGENTS.filter(a => loading.has(a.id) || data[a.id] !== undefined);
  if (visibleAgents.length === 0) return null;

  const toggle = (id: AgentType) => setExpanded(prev => prev === id ? null : id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-2"
    >
      {/* Agent pill row */}
      <div className="flex flex-wrap gap-1.5">
        {visibleAgents.map((agent) => {
          const isLoading = loading.has(agent.id);
          const isDone    = data[agent.id] !== undefined;
          const isActive  = expanded === agent.id;

          const donePillStyle = {
            background: agent.color.gradient,
            boxShadow: isActive
              ? pillBoxShadow(agent.color)
              : `inset 0 1px 4px ${agent.color.highlight}, inset 0 -3px 6px rgba(0,0,0,0.15), 0 3px 10px rgba(${agent.color.shadowRgb},0.3)`,
            opacity: isActive ? 1 : 0.85,
          };

          const loadingPillStyle = {
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
          };

          return (
            <motion.button
              key={agent.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => isDone && toggle(agent.id)}
              disabled={!isDone}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-white',
                !isDone && 'cursor-default'
              )}
              style={isDone ? donePillStyle : loadingPillStyle}
              whileHover={isDone ? { scale: 1.08, transition: { type: 'spring', stiffness: 800, damping: 20 } } : {}}
              whileTap={isDone ? { scale: 0.93, transition: { type: 'spring', stiffness: 1000, damping: 30 } } : {}}
              transition={{ type: 'spring', stiffness: 800, damping: 20 }}
            >
              <span>{agent.icon}</span>
              <span>{agent.label}</span>
              {isLoading && (
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <CircleNotch className="w-3 h-3 text-white/60" />
                </motion.span>
              )}
              {isDone && !isLoading && <CheckCircle weight="fill" className="w-3 h-3 text-white/80" />}
              {isDone && (isActive
                ? <CaretUp   className="w-2.5 h-2.5 text-white/60" />
                : <CaretDown className="w-2.5 h-2.5 text-white/60" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Expanded card — compact cards for info agents */}
      <AnimatePresence>
        {expanded && expanded !== 'itinerary' && data[expanded] && (
          <motion.div
            key={expanded}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              {expanded === 'safety'   && data.safety   && <SafetyCard   data={data.safety}   />}
              {expanded === 'currency' && data.currency && <CurrencyCard data={data.currency} />}
              {expanded === 'weather'  && data.weather  && <WeatherCard  data={data.weather}  />}
              {expanded === 'visa'     && data.visa     && <VisaCard     data={data.visa}     />}
              {expanded === 'events'   && data.events   && <EventsCard   data={data.events}   />}
              {expanded === 'shopping' && data.shopping && <ShoppingCard data={data.shopping} />}
              {expanded === 'flights'  && data.flights  && <FlightsCard  data={data.flights}  />}
              {expanded === 'lodging'  && data.lodging  && <LodgingCard  data={data.lodging}  />}
              {expanded === 'booking'  && data.booking  && <BookingCard  data={data.booking}  />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Itinerary — always shown full-width when available */}
      <AnimatePresence>
        {data.itinerary && data.itinerary.length > 0 && (
          <motion.div
            key="itinerary-board"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ delay: 0.1 }}
            className="mt-4 -mx-2"
          >
            <KanbanBoard schedule={data.itinerary} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destination suggestion cards */}
      <AnimatePresence>
        {data.suggestions && (
          <DestinationCards data={data.suggestions} onAction={onAction} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
