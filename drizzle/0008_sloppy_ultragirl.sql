CREATE TABLE `crc_weekly_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crcName` varchar(32) NOT NULL,
	`month` varchar(7) NOT NULL,
	`week` int NOT NULL,
	`description` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crc_weekly_activities_id` PRIMARY KEY(`id`),
	CONSTRAINT `crc_weekly_activities_crc_month_week_unique` UNIQUE(`crcName`,`month`,`week`)
);
