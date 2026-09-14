CREATE TABLE `launches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`portal_hash` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_launches_owner_created` ON `launches` (`owner`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_launches_portal_hash` ON `launches` (`portal_hash`);