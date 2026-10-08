ALTER TABLE `odontomab_crcs` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `odontomab_crcs` ADD `removedBy` int;--> statement-breakpoint
ALTER TABLE `odontomab_crcs` ADD `removedAt` timestamp;