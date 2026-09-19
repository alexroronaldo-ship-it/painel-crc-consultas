CREATE TABLE `val_sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleDate` varchar(10) NOT NULL,
	`value` decimal(12,2) NOT NULL,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `val_sales_id` PRIMARY KEY(`id`)
);
