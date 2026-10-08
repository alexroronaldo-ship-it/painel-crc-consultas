CREATE TABLE `odontomab_crcs` (
	`id` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`normalizedName` varchar(160) NOT NULL,
	`photoKey` varchar(512),
	`photoUrl` varchar(768),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `odontomab_crcs_id` PRIMARY KEY(`id`),
	CONSTRAINT `odontomab_crcs_normalizedName_unique` UNIQUE(`normalizedName`)
);
--> statement-breakpoint
ALTER TABLE `val_sales` ADD `crcId` varchar(32) DEFAULT 'VAL' NOT NULL;

--> statement-breakpoint
-- Perfil histórico existente; não cria vendas nem dados de teste.
INSERT INTO `odontomab_crcs` (`id`, `name`, `normalizedName`, `photoKey`, `photoUrl`)
VALUES ('VAL', 'Vivi', 'vivi',
 (SELECT `photoKey` FROM `crc_profiles` WHERE `crcName` = 'VAL' LIMIT 1),
 (SELECT `photoUrl` FROM `crc_profiles` WHERE `crcName` = 'VAL' LIMIT 1));
