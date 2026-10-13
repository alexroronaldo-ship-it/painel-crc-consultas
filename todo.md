# Atualização de qualidade da gestão e vendas

- [x] Comissão Marketing – Ortoimplante: cada CRC ativa tem painel individual com vendas, tarefas válidas e respostas em até dois minutos.
- [x] Indicador de qualidade da gestão mensal consolidado no final da página, com pontuação de 0–100 calculada por vendas (50), tarefas válidas (15), respostas ≤2 min (15), agendamentos (10) e qualidade dos registros (10).
- [x] O resumo mostra somente a pontuação consolidada e o valor total gerado; as categorias de pontos não ficam espalhadas no painel.
- [x] Comissão de Vendas – Odontomab: tratamento bloqueado em Implante, Prótese, Orto e Clínica em geral; tabela e gráfico financeiro por tratamento adicionados.
- [x] Gráfico financeiro por convênio mantido com receita em reais por convênio; registros históricos sem tratamento ficam preservados e são sinalizados para correção manual.
- [x] Registros novos de Marketing, Comissão Clínica e Odontomab com todos os campos exibidos obrigatórios; campanha é obrigatória no Marketing e na Comissão Clínica.
- [x] Regra de resposta rápida corrigida para incluir médias de até dois minutos.
- [x] Migração 0021 aplicada, preservando todos os registros existentes, com a coluna opcional `treatment` em `val_sales`.
- [x] **Operação exclusiva para pacientes fechados:** os três formulários fixam o status como Fechado; APIs rejeitam `Em acompanhamento` e `Não fechado`; listas, dashboards, gráficos, comissões, uso de campanhas e transferências consideram exclusivamente registros fechados. Registros históricos com outros status são preservados no banco, mas ficam fora dos resultados operacionais.
- [x] Página **Painel da Gerente** protegida por autenticação administrativa e senha provisória `0000`, com bloqueio ao sair ou atualizar.
- [x] Consulta gerencial mensal consolidando dados reais de Marketing, Clínica e Odontomab, com visão individual por CRC e sem misturar registros entre módulos.
- [x] Gráfico e resumo de 0–100 pontos seguindo os prints: vendas (50), tarefas válidas (15), respostas até 2 minutos (15), agendamentos (10) e qualidade dos registros (10), incluindo pontos obtidos e faltantes.
- [x] Tipagem, 21 suítes / 132 testes, build, diff e capturas desktop/mobile do acesso protegido validados.
