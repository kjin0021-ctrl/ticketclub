import { calculateFeasibility, type FeasibilityInput, type FeasibilityResult } from "./feasibility-engine.ts";
import type { FlightCandidate } from "./flight-adapters.ts";

export type FlightStrategyKind = "stable" | "easy" | "economic" | "latest";
export interface FlightStrategy {
  kind: FlightStrategyKind;
  title: string;
  candidate?: FlightCandidate;
  result?: FeasibilityResult;
  unavailableReason?: string;
  rationale: string;
}

const labels: Record<FlightStrategyKind, string> = { stable: "最稳妥", easy: "最轻松", economic: "最经济", latest: "最晚出发" };

function priceValue(candidate: FlightCandidate) {
  const value = Number(candidate.price?.amount.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
}

function localHour(iso: string, timeZone: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).format(new Date(iso)));
}

export function compareFlightStrategies(candidates: FlightCandidate[], input: Omit<FeasibilityInput, "outboundFlight">): FlightStrategy[] {
  const unique = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
  const assessed = unique.map((candidate) => ({ candidate, result: calculateFeasibility({ ...input, outboundFlight: candidate }) }));
  const feasible = assessed.filter((item) => item.result.feasible);
  const stable = [...feasible].sort((a, b) => b.result.eventBufferMinutes - a.result.eventBufferMinutes)[0];
  const easy = [...feasible].sort((a, b) => {
    const aRedEye = localHour(a.candidate.departureAt, "Australia/Melbourne") >= 21 ? 1 : 0;
    const bRedEye = localHour(b.candidate.departureAt, "Australia/Melbourne") >= 21 ? 1 : 0;
    return a.candidate.stops - b.candidate.stops || aRedEye - bRedEye || b.result.eventBufferMinutes - a.result.eventBufferMinutes;
  })[0];
  const priced = feasible.filter((item) => Number.isFinite(priceValue(item.candidate))).sort((a, b) => priceValue(a.candidate) - priceValue(b.candidate))[0];
  const latest = [...feasible].sort((a, b) => new Date(b.candidate.departureAt).getTime() - new Date(a.candidate.departureAt).getTime())[0];
  const make = (kind: FlightStrategyKind, item: typeof stable | undefined, rationale: string, unavailableReason: string): FlightStrategy => item ? { kind, title: labels[kind], candidate: item.candidate, result: item.result, rationale } : { kind, title: labels[kind], rationale, unavailableReason };
  return [
    make("stable", stable, "优先选择到场缓冲最多的可行航班", "没有候选能满足当前时间条件"),
    make("easy", easy, "优先直飞、少转机，并尽量避开深夜起飞", "没有轻松且能赶上的候选"),
    make("economic", priced, "只比较来源中明确提供的价格", "当前候选没有可比较的真实价格"),
    make("latest", latest, "在仍能赶上的候选中尽量晚离开", "没有能赶上的较晚航班"),
  ];
}
