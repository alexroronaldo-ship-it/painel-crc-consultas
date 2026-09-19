# Validação visual — campanhas dinâmicas

A página Campanhas foi validada em desktop e celular. O menu lateral possui o item Campanhas, o cadastro apresenta nome, início, fim opcional e meta semanal, e os estados vazios explicam que a primeira inscrição cria automaticamente os gráficos.

O formulário Novo fechamento agora possui um seletor opcional de campanha, e a tabela de registros exibe a campanha vinculada ou “Sem campanha”. A página Campanhas consulta somente fechamentos vinculados para calcular seus indicadores.

Os testes automatizados confirmam que cada campanha cadastrada gera um resumo próprio, inclusive com total zero, que cada nova campanha corresponde a uma nova coluna no comparativo e que o gráfico S1–S4 usa somente os fechamentos da campanha selecionada. A soma semanal permanece igual ao total da campanha no mês.
