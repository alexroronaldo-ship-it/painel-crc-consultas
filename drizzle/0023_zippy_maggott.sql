ALTER TABLE `patient_follow_ups` DROP INDEX `patient_follow_ups_source_unique`;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `crcName` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `hasCampaign` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `campaignId` int;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `patientName` varchar(160) NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `phone` varchar(40) NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `contactChannel` enum('WhatsApp','Ligação','Presencial','Instagram') NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `reference` enum('Dentista','Paciente','Marketing','Não se aplica') NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `closingDate` varchar(10);--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `closedItem` varchar(40);--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `value` decimal(12,2);--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `notes` text NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `destinationRecordId` int;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` ADD `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` DROP COLUMN `sourceScope`;--> statement-breakpoint
ALTER TABLE `patient_follow_ups` DROP COLUMN `sourceId`;