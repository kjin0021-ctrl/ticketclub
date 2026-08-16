import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const artists = sqliteTable("artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  eventTypeSubscriptions: text("event_type_subscriptions", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  notifyPossibleEvents: integer("notify_possible_events", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, (table) => [uniqueIndex("artists_name_unique").on(table.name)]);

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["x", "rss", "web", "manual", "mock"] }).notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  handle: text("handle"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  checkAtLocalHour: integer("check_at_local_hour").notNull().default(12),
  lastCheckedAt: text("last_checked_at"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  ...timestamps,
}, (table) => [
  index("sources_artist_idx").on(table.artistId),
  uniqueIndex("sources_artist_url_unique").on(table.artistId, table.url),
]);

export const sourceItems = sqliteTable("source_items", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  publishedAt: text("published_at"),
  rawText: text("raw_text").notNull(),
  mediaUrls: text("media_urls", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  originalUrl: text("original_url").notNull(),
  classification: text("classification", { enum: ["event", "possible_event", "irrelevant"] }).notNull(),
  extractionJson: text("extraction_json", { mode: "json" }).$type<Record<string, unknown>>(),
  processedAt: text("processed_at"),
  ...timestamps,
}, (table) => [
  uniqueIndex("source_items_external_unique").on(table.sourceId, table.externalId),
  index("source_items_classification_idx").on(table.classification),
]);

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  eventType: text("event_type").notNull(),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at"),
  rehearsalAt: text("rehearsal_at"),
  checkInAt: text("check_in_at"),
  venueName: text("venue_name").notNull(),
  venueAddress: text("venue_address"),
  city: text("city").notNull(),
  countryCode: text("country_code").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  confidence: text("confidence", { enum: ["official", "possible"] }).notNull().default("possible"),
  lifecycleStatus: text("lifecycle_status", { enum: ["scheduled", "changed", "cancelled"] }).notNull().default("scheduled"),
  attendanceStatus: text("attendance_status", { enum: ["going", "considering", "not_going", "undecided"] }).notNull().default("undecided"),
  notGoingRetentionUntil: text("not_going_retention_until"),
  dedupeFingerprint: text("dedupe_fingerprint").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("events_dedupe_unique").on(table.artistId, table.dedupeFingerprint),
  index("events_start_idx").on(table.startsAt),
  index("events_country_start_idx").on(table.countryCode, table.startsAt),
]);

export const eventSourceItems = sqliteTable("event_source_items", {
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  sourceItemId: text("source_item_id").notNull().references(() => sourceItems.id, { onDelete: "cascade" }),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
}, (table) => [
  uniqueIndex("event_source_items_unique").on(table.eventId, table.sourceItemId),
]);

export const availabilityWindows = sqliteTable("availability_windows", {
  id: text("id").primaryKey(),
  availableFrom: text("available_from").notNull(),
  availableUntil: text("available_until").notNull(),
  originLabel: text("origin_label").notNull(),
  inputMethod: text("input_method", { enum: ["text", "screenshot", "manual"] }).notNull(),
  rawInput: text("raw_input"),
  screenshotKey: text("screenshot_key"),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, (table) => [index("availability_range_idx").on(table.availableFrom, table.availableUntil)]);

export const feasibilityRuns = sqliteTable("feasibility_runs", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  availabilityWindowId: text("availability_window_id").notNull().references(() => availabilityWindows.id, { onDelete: "cascade" }),
  riskMode: text("risk_mode", { enum: ["relaxed", "standard", "extreme"] }).notNull(),
  isFeasible: integer("is_feasible", { mode: "boolean" }).notNull(),
  reason: text("reason").notNull(),
  assumptionsJson: text("assumptions_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  resultJson: text("result_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  candidateFlightJson: text("candidate_flight_json", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("feasibility_event_created_idx").on(table.eventId, table.createdAt)]);

export const spots = sqliteTable("spots", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  countryCode: text("country_code").notNull(),
  preciseAddress: text("precise_address").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  sourceUrl: text("source_url"),
  sourceType: text("source_type", { enum: ["airbnb", "map", "manual", "other"] }).notNull().default("manual"),
  visitStatus: text("visit_status", { enum: ["visited", "want_to_revisit", "saved"] }).notNull().default("saved"),
  notes: text("notes"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  photoKeys: text("photo_keys", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  suitableAfterEvent: integer("suitable_after_event", { mode: "boolean" }).notNull().default(false),
  applicableTimeNote: text("applicable_time_note"),
  ...timestamps,
}, (table) => [index("spots_city_idx").on(table.countryCode, table.city)]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
  kind: text("kind", { enum: ["new_event", "event_changed", "event_cancelled", "sync_failed"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  emailStatus: text("email_status", { enum: ["not_requested", "pending", "sent", "failed"] }).notNull().default("not_requested"),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("notifications_unread_idx").on(table.readAt, table.createdAt)]);

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("single-user"),
  timezone: text("timezone").notNull().default("Australia/Melbourne"),
  homeLocationLabel: text("home_location_label").notNull().default("Melbourne CBD"),
  preferredAirportCode: text("preferred_airport_code").notNull().default("MEL"),
  homeToAirportMinutes: integer("home_to_airport_minutes").notNull().default(35),
  airportAdvanceMinutes: integer("airport_advance_minutes").notNull().default(150),
  immigrationMinutes: integer("immigration_minutes").notNull().default(120),
  airportToVenueMinutes: integer("airport_to_venue_minutes").notNull().default(90),
  relaxedLeadMinutes: integer("relaxed_lead_minutes").notNull().default(360),
  standardLeadMinutes: integer("standard_lead_minutes").notNull().default(120),
  extremeLeadMinutes: integer("extreme_lead_minutes").notNull().default(30),
  emailAddress: text("email_address"),
  emailNotificationsEnabled: integer("email_notifications_enabled", { mode: "boolean" }).notNull().default(false),
  dailyCheckLocalHour: integer("daily_check_local_hour").notNull().default(12),
  ...timestamps,
});

export const artistsRelations = relations(artists, ({ many }) => ({ sources: many(sources), events: many(events) }));
export const sourcesRelations = relations(sources, ({ one, many }) => ({
  artist: one(artists, { fields: [sources.artistId], references: [artists.id] }),
  items: many(sourceItems),
}));
export const eventsRelations = relations(events, ({ one, many }) => ({
  artist: one(artists, { fields: [events.artistId], references: [artists.id] }),
  sourceItems: many(eventSourceItems),
  feasibilityRuns: many(feasibilityRuns),
}));
export const sourceItemsRelations = relations(sourceItems, ({ one, many }) => ({
  source: one(sources, { fields: [sourceItems.sourceId], references: [sources.id] }),
  events: many(eventSourceItems),
}));
export const eventSourceItemsRelations = relations(eventSourceItems, ({ one }) => ({
  event: one(events, { fields: [eventSourceItems.eventId], references: [events.id] }),
  sourceItem: one(sourceItems, { fields: [eventSourceItems.sourceItemId], references: [sourceItems.id] }),
}));
export const feasibilityRunsRelations = relations(feasibilityRuns, ({ one }) => ({
  event: one(events, { fields: [feasibilityRuns.eventId], references: [events.id] }),
  availabilityWindow: one(availabilityWindows, { fields: [feasibilityRuns.availabilityWindowId], references: [availabilityWindows.id] }),
}));

