ALTER TABLE `closures` ADD `internalStatus` enum('closed','follow_up','not_closed') DEFAULT 'closed' NOT NULL;--> statement-breakpoint
ALTER TABLE `closures` ADD `internalNotes` text;--> statement-breakpoint
ALTER TABLE `closures` ADD `nextStep` text;--> statement-breakpoint
ALTER TABLE `closures` ADD `internalClosingDate` varchar(10);