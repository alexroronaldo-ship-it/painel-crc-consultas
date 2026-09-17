CREATE TABLE `patient_intakes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientName` varchar(160) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`firstConsultationRequest` text NOT NULL,
	`scheduledDate` varchar(10) NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patient_intakes_id` PRIMARY KEY(`id`)
);
