CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`event_type_subscriptions` text DEFAULT '[]' NOT NULL,
	`notify_possible_events` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artists_name_unique` ON `artists` (`name`);--> statement-breakpoint
CREATE TABLE `availability_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`available_from` text NOT NULL,
	`available_until` text NOT NULL,
	`origin_label` text NOT NULL,
	`input_method` text NOT NULL,
	`raw_input` text,
	`screenshot_key` text,
	`is_confirmed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `availability_range_idx` ON `availability_windows` (`available_from`,`available_until`);--> statement-breakpoint
CREATE TABLE `event_source_items` (
	`event_id` text NOT NULL,
	`source_item_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_item_id`) REFERENCES `source_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_source_items_unique` ON `event_source_items` (`event_id`,`source_item_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`artist_id` text NOT NULL,
	`title` text NOT NULL,
	`event_type` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`rehearsal_at` text,
	`check_in_at` text,
	`venue_name` text NOT NULL,
	`venue_address` text,
	`city` text NOT NULL,
	`country_code` text NOT NULL,
	`latitude` text,
	`longitude` text,
	`confidence` text DEFAULT 'possible' NOT NULL,
	`lifecycle_status` text DEFAULT 'scheduled' NOT NULL,
	`attendance_status` text DEFAULT 'undecided' NOT NULL,
	`not_going_retention_until` text,
	`dedupe_fingerprint` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_dedupe_unique` ON `events` (`artist_id`,`dedupe_fingerprint`);--> statement-breakpoint
CREATE INDEX `events_start_idx` ON `events` (`starts_at`);--> statement-breakpoint
CREATE INDEX `events_country_start_idx` ON `events` (`country_code`,`starts_at`);--> statement-breakpoint
CREATE TABLE `feasibility_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`availability_window_id` text NOT NULL,
	`risk_mode` text NOT NULL,
	`is_feasible` integer NOT NULL,
	`reason` text NOT NULL,
	`assumptions_json` text NOT NULL,
	`result_json` text NOT NULL,
	`candidate_flight_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`availability_window_id`) REFERENCES `availability_windows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feasibility_event_created_idx` ON `feasibility_runs` (`event_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`email_status` text DEFAULT 'not_requested' NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notifications_unread_idx` ON `notifications` (`read_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY DEFAULT 'single-user' NOT NULL,
	`timezone` text DEFAULT 'Australia/Melbourne' NOT NULL,
	`home_location_label` text DEFAULT 'Melbourne CBD' NOT NULL,
	`preferred_airport_code` text DEFAULT 'MEL' NOT NULL,
	`home_to_airport_minutes` integer DEFAULT 35 NOT NULL,
	`airport_advance_minutes` integer DEFAULT 150 NOT NULL,
	`immigration_minutes` integer DEFAULT 120 NOT NULL,
	`airport_to_venue_minutes` integer DEFAULT 90 NOT NULL,
	`relaxed_lead_minutes` integer DEFAULT 360 NOT NULL,
	`standard_lead_minutes` integer DEFAULT 120 NOT NULL,
	`extreme_lead_minutes` integer DEFAULT 30 NOT NULL,
	`email_address` text,
	`email_notifications_enabled` integer DEFAULT false NOT NULL,
	`daily_check_local_hour` integer DEFAULT 12 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`external_id` text NOT NULL,
	`published_at` text,
	`raw_text` text NOT NULL,
	`media_urls` text DEFAULT '[]' NOT NULL,
	`original_url` text NOT NULL,
	`classification` text NOT NULL,
	`extraction_json` text,
	`processed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_items_external_unique` ON `source_items` (`source_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `source_items_classification_idx` ON `source_items` (`classification`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`artist_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`handle` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`check_at_local_hour` integer DEFAULT 12 NOT NULL,
	`last_checked_at` text,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sources_artist_idx` ON `sources` (`artist_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sources_artist_url_unique` ON `sources` (`artist_id`,`url`);--> statement-breakpoint
CREATE TABLE `spots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`country_code` text NOT NULL,
	`precise_address` text NOT NULL,
	`latitude` text,
	`longitude` text,
	`source_url` text,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`visit_status` text DEFAULT 'saved' NOT NULL,
	`notes` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`photo_keys` text DEFAULT '[]' NOT NULL,
	`suitable_after_event` integer DEFAULT false NOT NULL,
	`applicable_time_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `spots_city_idx` ON `spots` (`country_code`,`city`);