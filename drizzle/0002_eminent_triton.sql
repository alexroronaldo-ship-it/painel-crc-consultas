CREATE TABLE `closures` (
		`id` int AUTO_INCREMENT NOT NULL,
		`crcName` varchar(32) NOT NULL,
		`patientName` varchar(160) NOT NULL,
		`phone` varchar(40) NOT NULL,
		`closingDate` varchar(10) NOT NULL,
		`closedItem` text NOT NULL,
		`value` decimal(12,2) NOT NULL,
		`createdBy` int NOT NULL,
		`createdAt` timestamp NOT NULL DEFAULT (now()),
		CONSTRAINT `closures_id` PRIMARY KEY(`id`)
	);
