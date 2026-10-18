CREATE TABLE `ai_budget` (
	`key` text PRIMARY KEY NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comparison_rooms` (
	`token` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`guest_id` text,
	`snapshot` text NOT NULL,
	`creator_result` text NOT NULL,
	`guest_result` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `completions` (
	`session_id` text NOT NULL,
	`quiz_id` text NOT NULL,
	`version` text NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `quiz_id`, `version`)
);
--> statement-breakpoint
CREATE TABLE `conversation_state` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`content` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`session_id` text NOT NULL,
	`quiz_id` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `quiz_id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_key` text NOT NULL,
	`spec` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quizzes_topic_key_unique` ON `quizzes` (`topic_key`);--> statement-breakpoint
CREATE TABLE `research_v2` (
	`conversation_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempt_starts` (
	`session_id` text NOT NULL,
	`quiz_id` text NOT NULL,
	`version` text NOT NULL,
	`started_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `quiz_id`, `version`)
);
