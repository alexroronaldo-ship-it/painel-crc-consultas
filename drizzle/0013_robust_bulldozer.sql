CREATE TABLE `crc_profiles` (
	`crcName` varchar(32) NOT NULL,
	`photoKey` varchar(512) NOT NULL,
	`photoUrl` varchar(768) NOT NULL,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crc_profiles_crcName` PRIMARY KEY(`crcName`)
);
