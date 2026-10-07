CREATE TABLE `ortho_active_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`origin` varchar(160) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10),
	`weeklyGoal` decimal(12,2),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ortho_active_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ortho_active_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crcName` varchar(32) NOT NULL,
	`month` varchar(7) NOT NULL,
	`monthlyGoal` decimal(12,2),
	`weeklySalesGoal` decimal(12,2),
	`timeGoalSeconds` int,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ortho_active_goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `ortho_active_goals_crc_month_unique` UNIQUE(`crcName`,`month`)
);
--> statement-breakpoint
CREATE TABLE `ortho_active_patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crcName` varchar(32) NOT NULL,
	`patientName` varchar(160) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`closingDate` varchar(10) NOT NULL,
	`closedItem` text NOT NULL,
	`value` decimal(12,2) NOT NULL,
	`totalTimeSeconds` int NOT NULL DEFAULT 0,
	`internalStatus` enum('closed','follow_up','not_closed') NOT NULL DEFAULT 'closed',
	`internalNotes` text,
	`campaignId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ortho_active_patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ortho_active_weekly` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crcName` varchar(32) NOT NULL,
	`month` varchar(7) NOT NULL,
	`week` int NOT NULL,
	`taskCount` int NOT NULL DEFAULT 0,
	`taskGoal` int,
	`description` text,
	`appointmentCount` int NOT NULL DEFAULT 0,
	`appointmentGoal` int,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ortho_active_weekly_id` PRIMARY KEY(`id`),
	CONSTRAINT `ortho_active_weekly_crc_month_week_unique` UNIQUE(`crcName`,`month`,`week`)
);
