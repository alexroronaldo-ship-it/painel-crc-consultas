-- Mantém os registros existentes e apenas atualiza o rótulo de origem da Comissão Clínica.
-- Campanha orgânica é contabilizada somente no canal Comissão Marketing do consolidado por CRC.
UPDATE `ortho_active_patients`
SET `reference` = 'Campanha orgânica'
WHERE `reference` = 'Google';
