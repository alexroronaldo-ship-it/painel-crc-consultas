ALTER TABLE `ortho_active_patients` ADD `contactChannel` enum('WhatsApp','Ligação','Presencial','Instagram');--> statement-breakpoint
ALTER TABLE `ortho_active_patients` ADD `reference` varchar(160);