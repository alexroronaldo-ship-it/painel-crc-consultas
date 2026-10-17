CREATE TABLE `manager_crc_slots` (
	`slot` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manager_crc_slots_slot` PRIMARY KEY(`slot`)
);
INSERT INTO `manager_crc_slots` (`slot`, `name`) VALUES (1, 'Wisllayny'), (2, 'JAYZA'), (3, 'Aline'), (4, 'Vaga 4'), (5, 'Vaga 5');
