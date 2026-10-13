CREATE TABLE `patient_follow_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceScope` enum('marketing','ortho_active','odontomab') NOT NULL,
	`sourceId` int NOT NULL,
	`commissionDestination` enum('clinic','marketing','odontomab'),
	`commissionCrcId` varchar(32),
	`saleEffective` boolean NOT NULL DEFAULT false,
	`effectiveBy` int,
	`effectiveAt` timestamp,
	`correctedBy` int,
	`correctedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_follow_ups_id` PRIMARY KEY(`id`),
	CONSTRAINT `patient_follow_ups_source_unique` UNIQUE(`sourceScope`,`sourceId`)
);
--> statement-breakpoint
ALTER TABLE `closures` ADD `contactChannel` enum('WhatsApp','Ligação','Presencial','Instagram');--> statement-breakpoint
ALTER TABLE `closures` ADD `reference` varchar(160);--> statement-breakpoint
ALTER TABLE `val_sales` ADD `contactChannel` enum('WhatsApp','Ligação','Presencial','Instagram');--> statement-breakpoint
ALTER TABLE `val_sales` ADD `reference` varchar(160);