CREATE TABLE `crc_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scope` enum('funnel','ortho_active','odontomab') NOT NULL,
	`sourceId` varchar(32) NOT NULL,
	`targetId` varchar(32) NOT NULL,
	`sourceName` varchar(160) NOT NULL,
	`targetName` varchar(160) NOT NULL,
	`recordCount` int NOT NULL,
	`totalValue` decimal(16,2) NOT NULL,
	`recordIds` text NOT NULL,
	`performedBy` int NOT NULL,
	`performedAtMs` bigint NOT NULL,
	CONSTRAINT `crc_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orto_crc_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scope` enum('funnel','ortho_active') NOT NULL,
	`crcId` varchar(32) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`removedBy` int,
	`removedAtMs` bigint,
	CONSTRAINT `orto_crc_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `orto_crc_states_scope_crc_unique` UNIQUE(`scope`,`crcId`)
);
