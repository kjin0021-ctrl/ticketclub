import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { ArtistEvent, FeasibilitySummary } from "../lib/types";

interface TicketCardProps {
  event: ArtistEvent;
  feasibility: FeasibilitySummary;
}

function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-GB", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  })
    .format(date)
    .replace(",", " ·")
    .toUpperCase();
}

export function TicketCard({ event, feasibility }: TicketCardProps) {
  return (
    <article className="ticket-card" aria-labelledby="featured-event-title">
      <header className="ticket-card__header">
        <strong>LIVE TICKET</strong>
        <div className="ticket-card__chips" aria-label="Countdown and route">
          <span className="ticket-chip ticket-chip--butter">D−13</span>
          <span className="ticket-chip">MEL→SEL</span>
        </div>
      </header>

      <div className="ticket-card__main">
        <div className="ticket-card__details">
          <p className="ticket-card__artist">
            {event.artist} · {event.type}
          </p>
          <h2 id="featured-event-title">{event.title}</h2>
          <dl className="ticket-meta">
            <div>
              <dt>DATE</dt>
              <dd>{formatDate(event.startsAt)}</dd>
            </div>
            <div>
              <dt>VENUE</dt>
              <dd>{event.venue}</dd>
            </div>
            <div>
              <dt>CITY</dt>
              <dd>
                {event.city}, {event.country}
              </dd>
            </div>
            <div>
              <dt>CHECK-IN</dt>
              <dd>16:30 前到达</dd>
            </div>
          </dl>
        </div>

        <aside className="ticket-card__stub" aria-label="Ticket reference">
          <span>STC · 0829 · SEL</span>
          <div className="ticket-qr" aria-hidden="true" />
        </aside>
      </div>

      <footer className="ticket-card__footer">
        <p className="ticket-verdict">
          <CheckCircle size={24} weight="fill" aria-hidden="true" />
          {feasibility.feasible ? "标准模式下赶得上" : "当前条件下赶不上"}
        </p>
        <p className="ticket-departure">
          最晚出发 <strong>{feasibility.latestDeparture}</strong>
        </p>
      </footer>
    </article>
  );
}

