# Atualização de qualidade da gestão e vendas

- [x] Comissão Marketing – Ortoimplante: cada CRC ativa tem painel individual com vendas, tarefas válidas e respostas em até dois minutos.
- [x] Indicador de qualidade da gestão mensal consolidado no final da página, com pontuação de 0–100 calculada por vendas (50), tarefas válidas (20), respostas ≤2 min (5), agendamentos (20) e qualidade dos registros (5). A meta geral de vendas é R$ 400.000 e a pontuação de vendas é proporcional até os 50 pontos.
- [x] O resumo mostra somente a pontuação consolidada e o valor total gerado; as categorias de pontos não ficam espalhadas no painel.
- [x] Comissão de Vendas – Odontomab: tratamento bloqueado em Implante, Prótese, Orto e Clínica em geral; tabela e gráfico financeiro por tratamento adicionados.
- [x] Gráfico financeiro por convênio mantido com receita em reais por convênio; registros históricos sem tratamento ficam preservados e são sinalizados para correção manual.
- [x] Registros novos de Marketing, Comissão Clínica e Odontomab com todos os campos exibidos obrigatórios; campanha é obrigatória apenas no Marketing.
- [x] Regra de resposta rápida corrigida para incluir médias de até dois minutos.
- [x] Migração 0021 aplicada, preservando todos os registros existentes, com a coluna opcional `treatment` em `val_sales`.
- [x] **Operação exclusiva para pacientes fechados:** os três formulários fixam o status como Fechado; APIs rejeitam `Em acompanhamento` e `Não fechado`; listas, dashboards, gráficos, comissões, uso de campanhas e transferências consideram exclusivamente registros fechados. Registros históricos com outros status são preservados no banco, mas ficam fora dos resultados operacionais.
- [x] Página **Painel da Gerente** protegida por autenticação administrativa e senha provisória `0000`, com bloqueio ao sair ou atualizar.
- [x] Consulta gerencial mensal consolidando dados reais de Marketing, Clínica e Odontomab, com visão individual por CRC e sem misturar registros entre módulos.
- [x] Gráfico e resumo de 0–100 pontos seguindo os prints: vendas (50), tarefas válidas (15), respostas até 2 minutos (15), agendamentos (10) e qualidade dos registros (10), incluindo pontos obtidos e faltantes.
- [x] Tipagem, 21 suítes / 132 testes, build, diff e capturas desktop/mobile do acesso protegido validados.

# Comissão Clínica e acompanhamento de pacientes

- [x] Removido o cadastro e a exibição de campanhas da página Comissão Clínica – Ortoimplant, preservando registros históricos sem apagá-los.
- [x] Tratamento da Comissão Clínica limitado a Implante, Prótese, Orto e Clínica geral; novo cadastro exige uma dessas opções.
- [x] Dashboards próprios de referência e receita por tratamento adicionados à Comissão Clínica, com valores financeiros e quantidade de registros.
- [x] Nova página Acompanhamento de Pacientes para registrar leads, informar CRC, campanha (teve/não teve), contato, referência, dados de fechamento e observação.
- [x] Correção individual enquanto o lead estiver em acompanhamento e efetivação transacional única para Comissão Clínica, Marketing ou Vendas Odontomab, sob a CRC selecionada.
- [x] Efetivação exige data, tratamento, valor e CRC; para Marketing exige campanha e para Odontomab exige tipo do paciente e convênio.
- [x] Migrações 0022–0023 aplicadas em tabela inicialmente vazia; dados existentes não foram alterados. Tipagem, 22 suítes / 137 testes, build, diff e visual desktop/mobile validados.
- [x] Comissão Clínica: dois gráficos horizontais agora mostram a referência mais usada e os tratamentos fechados (Implante, Prótese, Orto e Clínica geral), ordenados por quantidade de pacientes e com receita exibida como apoio.
- [x] Painel da Gerente: histórico mensal protegido registra inscrições, correções, efetivações e exclusões com data/hora, módulo, paciente, CRC, resumo e usuário responsável.
- [x] Migração 0024 criou o histórico de auditoria; registros atuais foram inseridos como inscrições preservando data e usuário de criação. Exclusões anteriores à implantação não foram inventadas; novas ações passam a ser auditadas automaticamente.
- [x] Tipagem, 22 suítes / 138 testes, build, diff e visual desktop validados.
- [x] Página **Total vendido por CRC** criada: consolida somente pacientes fechados das comissões Marketing, Clínica e Odontomab para cada CRC, inclusive CRCs sem vendas.
- [x] Cada CRC possui meta individual fixa de R$ 75 mil, total vendido, percentual, valor faltante ou superávit, quantidade de vendas e páginas de origem; gráfico horizontal responsivo destaca a linha dourada da meta.
- [x] Filtro opcional por mês e visão de todo o período; 23 suítes / 140 testes, tipagem, build, diff e visual desktop/mobile validados.
- [x] Comissão Clínica: a referência Marketing foi substituída por Google no formulário, validação da API e gráfico de origem; o acompanhamento de pacientes mantém suas opções independentes. Não havia registro clínico histórico com Marketing para migrar.
- [x] Comissão Clínica: Google foi renomeado para **Campanha orgânica**. Essa origem não entra em vendas, metas, tratamentos, semanas ou comissão clínica; ela é direcionada exclusivamente ao canal Comissão Marketing no total por CRC. Migração 0026 atualizou os 3 históricos existentes sem apagar registros.
- [x] Total vendido por CRC passou a detalhar cada valor por Comissão Marketing, Comissão Clínica e Comissão de Vendas Pacientes, com vendas, meta, comissão e origem dos registros em cada canal. Cada cartão mostra o total final e as três comissões separadas; gráficos de barras empilhadas mostram venda e comissão por CRC. Meta Clínica configurada no mês é respeitada; Marketing e Vendas Pacientes usam R$ 75 mil por CRC.
- [x] Painel da Gerente: ícones de ajuda explicam os cinco critérios sem poluir a tela; o consolidado do mês usa dados reais das três páginas e meta única de R$ 400 mil.
- [x] Odontomab: comissão de outubro de 2026 suspensa para todas as CRCs, com valor de comissão zerado, observação de implantação e reativação automática nas vendas de novembro. Histórico e vendas permanecem visíveis; Aline e Michele seguem acessíveis nas abas, inclusive em modo histórico.
- [x] Acesso do gestor: `grupoalvasaude@gmail.com` promovido para o papel `manager`, que exige a senha da gerente e pode apenas consultar o Painel da Gerente; não recebeu permissões de edição administrativa. Migração 0027 aplicada e cobertura automatizada incluída.
- [x] Total vendido por CRC: cada origem dentro de cada canal passou a mostrar valor vendido, quantidade de vendas e a comissão correspondente. Ex.: Campanha orgânica → Marketing agora deixa visíveis os R$ 29.030,00 vendidos e os R$ 58,06 de comissão da CRC, sem duplicar valores no total.
