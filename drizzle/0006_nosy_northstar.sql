CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10),
	`weeklyGoal` decimal(12,2) NOT NULL DEFAULT '37500.00',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `closures` ADD `campaignId` int;