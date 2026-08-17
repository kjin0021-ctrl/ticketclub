export type RiskMode = "relaxed" | "standard" | "extreme";

export interface TimeAssumptions {
  homeToAirportMinutes: number;
  airportAdvanceMinutes: number;
  immigrationMinutes: number;
  arrivalAirportToVenueMinutes: number;
  eventDurationMinutes: number;
  postEventExitMinutes: number;
  venueToAirportMinutes: number;
  venueArrivalLeadMinutes: Record<RiskMode, number>;
}

export interface CandidateFlight {
  flightNumber: string;
  departureAt: string;
  arrivalAt: string;
  stops: number;
  originAirport: string;
  destinationAirport: string;
}

export interface FeasibilityInput {
  availableFrom: string;
  mustReturnBy: string;
  eventStartsAt: string;
  eventCheckInAt?: string;
  riskMode: RiskMode;
  outboundFlight: CandidateFlight;
  returnFlight?: CandidateFlight;
  assumedReturnHomeAt?: string;
  assumptions?: Partial<TimeAssumptions>;
}

export interface TimelineItem {
  id: string;
  at: string;
  title: string;
  detail: string;
}

export interface FeasibilityResult {
  feasible: boolean;
  outboundFeasible: boolean;
  returnFeasible: boolean;
  canCatchReturnFlight: boolean;
  returnHomeAt: string;
  eventEndsAt: string;
  earliestReturnFlightAt: string;
  needsExtraNight: boolean;
  venueArrivalAt: string;
  requiredVenueArrivalBy: string;
  latestHomeDepartureAt: string;
  eventBufferMinutes: number;
  reason: string;
  timeline: TimelineItem[];
  assumptions: TimeAssumptions;
}

export const defaultTimeAssumptions: TimeAssumptions = {
  homeToAirportMinutes: 35,
  airportAdvanceMinutes: 150,
  immigrationMinutes: 120,
  arrivalAirportToVenueMinutes: 90,
  eventDurationMinutes: 180,
  postEventExitMinutes: 45,
  venueToAirportMinutes: 90,
  venueArrivalLeadMinutes: {
    relaxed: 360,
    standard: 120,
    extreme: 30,
  },
};

const minute = 60_000;

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * minute).toISOString();
}

function subtractMinutes(iso: string, minutes: number) {
  return addMinutes(iso, -minutes);
}

export function calculateFeasibility(input: FeasibilityInput): FeasibilityResult {
  const assumptions: TimeAssumptions = {
    ...defaultTimeAssumptions,
    ...input.assumptions,
    venueArrivalLeadMinutes: {
      ...defaultTimeAssumptions.venueArrivalLeadMinutes,
      ...input.assumptions?.venueArrivalLeadMinutes,
    },
  };
  const baselineAt = input.eventCheckInAt ?? input.eventStartsAt;
  const requiredVenueArrivalBy = subtractMinutes(
    baselineAt,
    assumptions.venueArrivalLeadMinutes[input.riskMode],
  );
  const venueArrivalAt = addMinutes(
    input.outboundFlight.arrivalAt,
    assumptions.immigrationMinutes + assumptions.arrivalAirportToVenueMinutes,
  );
  const latestHomeDepartureAt = subtractMinutes(
    input.outboundFlight.departureAt,
    assumptions.airportAdvanceMinutes + assumptions.homeToAirportMinutes,
  );
  const eventEndsAt = addMinutes(input.eventStartsAt, assumptions.eventDurationMinutes);
  const earliestReturnFlightAt = addMinutes(
    eventEndsAt,
    assumptions.postEventExitMinutes + assumptions.venueToAirportMinutes + assumptions.airportAdvanceMinutes,
  );

  const canLeaveHome = new Date(input.availableFrom) <= new Date(latestHomeDepartureAt);
  const canReachEvent = new Date(venueArrivalAt) <= new Date(requiredVenueArrivalBy);
  const returnHomeAt = input.returnFlight
    ? addMinutes(input.returnFlight.arrivalAt, assumptions.homeToAirportMinutes)
    : input.assumedReturnHomeAt ?? input.mustReturnBy;
  const canCatchReturnFlight = input.returnFlight
    ? new Date(input.returnFlight.departureAt) >= new Date(earliestReturnFlightAt)
    : true;
  const returnByDeadline = new Date(returnHomeAt) <= new Date(input.mustReturnBy);
  const returnFeasible = canCatchReturnFlight && returnByDeadline;
  const outboundFeasible = canLeaveHome && canReachEvent;
  const feasible = outboundFeasible && returnFeasible;
  const eventBufferMinutes = Math.floor(
    (new Date(requiredVenueArrivalBy).getTime() - new Date(venueArrivalAt).getTime()) / minute,
  );

  let reason = "时间条件允许完成这次行程";
  if (!canLeaveHome) reason = "你的空闲时间晚于最晚离家时间";
  else if (!canReachEvent) reason = "该航班抵达场馆时已经超过风险模式要求";
  else if (!canCatchReturnFlight) reason = "演出散场后无法及时赶到返程机场";
  else if (!returnByDeadline) reason = "返程航班到家时间晚于你必须返家的时间";

  const eventSeoulDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(eventEndsAt));
  const returnSeoulDate = input.returnFlight
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(input.returnFlight.departureAt))
    : eventSeoulDate;
  const needsExtraNight = returnSeoulDate > eventSeoulDate;

  return {
    feasible,
    outboundFeasible,
    returnFeasible,
    canCatchReturnFlight,
    returnHomeAt,
    eventEndsAt,
    earliestReturnFlightAt,
    needsExtraNight,
    venueArrivalAt,
    requiredVenueArrivalBy,
    latestHomeDepartureAt,
    eventBufferMinutes,
    reason,
    assumptions,
    timeline: [
      {
        id: "leave-home",
        at: latestHomeDepartureAt,
        title: "最晚从家出发",
        detail: `到机场约 ${assumptions.homeToAirportMinutes} 分钟`,
      },
      {
        id: "flight",
        at: input.outboundFlight.departureAt,
        title: `${input.outboundFlight.flightNumber} 起飞`,
        detail: `${input.outboundFlight.stops ? `${input.outboundFlight.stops} 次转机` : "直飞"} · 机场提前 ${assumptions.airportAdvanceMinutes} 分钟`,
      },
      {
        id: "arrival",
        at: input.outboundFlight.arrivalAt,
        title: `抵达${input.outboundFlight.destinationAirport}`,
        detail: `入境与取行李预留 ${assumptions.immigrationMinutes} 分钟`,
      },
      {
        id: "venue",
        at: venueArrivalAt,
        title: "抵达场馆周边",
        detail: eventBufferMinutes >= 0 ? `比要求时间早 ${eventBufferMinutes} 分钟` : `比要求时间晚 ${Math.abs(eventBufferMinutes)} 分钟`,
      },
      ...(input.returnFlight ? [
        {
          id: "event-end",
          at: eventEndsAt,
          title: "预计散场",
          detail: `演出 ${assumptions.eventDurationMinutes} 分钟 + 离场 ${assumptions.postEventExitMinutes} 分钟`,
        },
        {
          id: "return-flight",
          at: input.returnFlight.departureAt,
          title: `${input.returnFlight.flightNumber} 返程起飞`,
          detail: canCatchReturnFlight ? "满足散场、去机场与提前值机的时间约束" : "散场后无法按当前预留赶上",
        },
        {
          id: "return-home",
          at: returnHomeAt,
          title: "预计回到家",
          detail: returnByDeadline ? "在你的返家期限内" : "晚于你的返家期限",
        },
      ] : []),
    ],
  };
}
