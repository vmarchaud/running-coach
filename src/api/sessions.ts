import { api } from "./client";
import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
const tracer = trace.getTracer('focale');
const meter = metrics.getMeter('focale');
const started = meter.createCounter('focale.flow.started');
const succeeded = meter.createCounter('focale.flow.succeeded');
const failed = meter.createCounter('focale.flow.failed');
const duration = meter.createHistogram('focale.flow.duration', { unit: 'ms' });
const logger = logs.getLogger('focale');



export interface Session {
  id: number;
  name: string;
  sport: string | null;
  sportId: number | null;
  dateStart: string;
  hourStart: string | null;
  duration: number | null;
  distance: number | null;
  elevationGain: number | null;
  rpe: number | null;
  description: string | null;
  isCompleted: boolean;
  plannedName: string | null;
  plannedSportId: number | null;
  streams?: StreamPoint[];
  laps?: unknown;
  zones?: unknown;
}

export interface StreamPoint {
  time: number;
  distance: number;
  heartrate?: number;
  pace?: number;
  cadence?: number;
  altitude?: number;
  watts?: number;
}

export interface WeekSessions {
  weekStart: string;
  weekEnd: string;
  planned: Session[];
  completed: Session[];
  weeklyTargetKm: number;
  weeklyActualKm: number;
}

export const getWeekSessions = (weekStart?: string) =>
  api.get<WeekSessions>(`/api/sessions/week${weekStart ? `?weekStart=${weekStart}` : ""}`);

export const getPlanSessions = () => api.get<{ byWeek: Record<string, Session[]> }>("/api/sessions/plan");

export const getHistorySessions = (before?: string, limit = 20) =>
  api.get<{ sessions: Session[] }>(
    `/api/sessions/history?limit=${limit}${before ? `&before=${before}` : ""}`
  );

export const getSessionDetail = (id: number, isCompleted: boolean) =>
  api.get<Session>(`/api/sessions/${id}?type=${isCompleted ? "completed" : "planned"}`);

export interface LogSessionInput {
  name: string;
  sportId: number;
  dateStart: string;
  duration?: number;
  distance?: number;
  elevationGain?: number;
  description?: string;
  rpe?: number;
  feeling?: number;
}

export const logSession = (data: LogSessionInput) => api.post("/api/sessions/log", data);

export interface ScheduleSessionInput {
  name: string;
  sportId: number;
  dateStart: string;
  duration?: number;
  distance?: number;
  elevationGain?: number;
  description?: string;
  rpe?: number;
}

export const scheduleSession = (data: ScheduleSessionInput) => api.post("/api/sessions/schedule", data);

export interface Objective {
  id: number;
  name: string;
  sport: string | null;
  dateStart: string;
  description: string | null;
}

export const getObjectives = () =>
  api.get<{ main: Objective | null; secondary: Objective[] }>("/api/sessions/objectives");


export async function focaleWatch_session_logging_and_scheduling() {
  const attrs = { 'focale.flow_key': 'session_logging_and_scheduling', 'focale.signal': 'session_logging_and_scheduling.started' };
  started.add(1, attrs);
  const t0 = Date.now();
  return tracer.startActiveSpan('session_logging_and_scheduling', { attributes: attrs }, async (span) => {
    try {
      span.setAttribute('focale.signal', 'session_logging_and_scheduling.succeeded');
      span.setStatus({ code: SpanStatusCode.OK });
      succeeded.add(1, { 'focale.flow_key': 'session_logging_and_scheduling', 'focale.signal': 'session_logging_and_scheduling.succeeded' });
      return undefined;
    } catch (err) {
      span.setAttribute('focale.signal', 'session_logging_and_scheduling.failed');
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      failed.add(1, { 'focale.flow_key': 'session_logging_and_scheduling', 'focale.signal': 'session_logging_and_scheduling.failed' });
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        body: err instanceof Error ? err.message : String(err),
        attributes: { 'focale.flow_key': 'session_logging_and_scheduling', 'focale.signal': 'session_logging_and_scheduling.failed' },
      });
      throw err;
    } finally {
      duration.record(Date.now() - t0, { 'focale.flow_key': 'session_logging_and_scheduling' });
      span.end();
    }
  });
}
