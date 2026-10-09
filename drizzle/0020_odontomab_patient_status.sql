ALTER TABLE `val_sales` ADD `internalStatus` enum('closed','not_closed','follow_up') DEFAULT 'closed' NOT NULL;
