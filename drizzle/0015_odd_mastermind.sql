ALTER TABLE `val_sales` ADD `patientName` varchar(160);--> statement-breakpoint
ALTER TABLE `val_sales` ADD `phone` varchar(40);--> statement-breakpoint
ALTER TABLE `val_sales` ADD `patientType` enum('active','new');--> statement-breakpoint
ALTER TABLE `val_sales` ADD `photoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `val_sales` ADD `photoUrl` varchar(768);