# Validação visual — ações por linha e meta semanal

A captura autenticada confirmou que a tabela exibe a coluna fixa “Ações por linha”, com os botões “Corrigir tempo” e “Excluir” visíveis em cada registro mesmo quando a tabela é mais larga que a área disponível. O bloco de limpeza total foi retirado da interface.

O gráfico final mostra S1–S4, uma linha tracejada comum que representa a meta de R$ 37.500 em cada semana e o valor que ainda falta em cada período. Para setembro de 2026, os cartões exibem S1 R$ 33.020 (faltam R$ 4.480), S2 R$ 16.430 (faltam R$ 21.070), S3 R$ 6.330 (faltam R$ 31.170) e S4 R$ 0 (faltam R$ 37.500).

A API foi coberta por testes para atualizar somente o registro selecionado e rejeitar tempos negativos. O navegador interativo não possuía sessão autenticada; por isso a interação visual autenticada foi validada com a captura própria do WebDev, enquanto o comportamento do endpoint foi verificado por testes automatizados.
No celular, os botões “Corrigir tempo” e “Excluir” permanecem visíveis na borda direita da tabela durante a rolagem horizontal. O gráfico reorganiza S1–S4 em uma grade 2 × 2, preservando a linha de meta e os valores faltantes.
