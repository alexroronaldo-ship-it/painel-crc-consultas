CREATE TABLE `manager_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(40) NOT NULL,
	`action` enum('created','updated','deleted','effective') NOT NULL,
	`entityId` int NOT NULL,
	`patientName` varchar(160),
	`crcName` varchar(32),
	`summary` text NOT NULL,
	`performedBy` int NOT NULL,
	`performedByName` varchar(160) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manager_audit_logs_id` PRIMARY KEY(`id`)
);
