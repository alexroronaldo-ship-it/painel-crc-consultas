-- Reparo aditivo: a migração 0022 foi aplicada parcialmente no banco legado.
-- A coluna contactChannel existe; esta etapa repõe apenas a coluna reference ausente.
ALTER TABLE `val_sales` ADD `reference` varchar(160);
