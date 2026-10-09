# Validação — Transferir registros e retirar CRC

## Escopo

O botão está disponível em Odontomab (Ativos & Novo), Funil de Vendas Orto Implante e Pacientes Ativos Orto Implante. Todas as transferências ficam restritas à página escolhida. Nenhum paciente, venda ou CRC real foi transferido ou retirado durante a validação.

## Evidências

Capturas autenticadas das três páginas em desktop 1440×1000 e celular 390×1000 confirmaram botão, abas, marcas e valores existentes sem alteração. O navegador separado chegou ao login; por isso o diálogo foi validado adicionalmente com Playwright e respostas tRPC inteiramente simuladas.

As imagens do mecanismo de captura do projeto exibiram conteúdo após autenticação: Funil com R$ 38.160,00 e oito fechamentos, retratos de Wisllayny/JAYZA em Pacientes Ativos e abas Vivi/Michele/Aline na Odontomab. As capturas não exibiram a tela de login. Os logs “Missing session cookie” correspondem à navegação separada realizada anteriormente, não são diagnóstico das imagens capturadas pelo projeto. O diálogo e a retirada real de perfis não foram testados na sessão com dados reais; os estados de histórico, seleção da destinatária e sucesso foram testados com respostas simuladas, para não alterar pacientes.

O script `/home/ubuntu/crc-ui-validation/test-transfer.mjs` verificou as três páginas em 1440×1000 e 390×844: seleção de origem/destino, resumo com R$ 8.100,01, confirmação desabilitada até consentimento, senha, botão Cancelar e ausência de erros de JavaScript/rolagem horizontal. Todas as mutações foram bloqueadas; zero chamadas de escrita reais.

O script `/home/ubuntu/crc-ui-validation/test-transfer-success.mjs` interceptou a resposta de sucesso, sem encaminhar a requisição ao servidor: verificou toast, fechamento do diálogo, retirada da aba de origem, seleção da destinatária e consulta histórica somente leitura nos módulos Orto Implante.

## Dados e regras

Migração 0018 cria somente auditoria e estado de retirada independente por página. A transferência bloqueia perfis e registros, valida checksum do resumo, altera apenas CRC de cada registro, retira a origem e grava auditoria em transação única. Mantém IDs, valores, datas, campanhas, convênios, telefones, fotos dos pacientes e autoria anterior. Fotos profissionais, metas individuais, tarefas e agenda não passam para a destinatária. Reativação do perfil não devolve pacientes já transferidos.

A comissão e os indicadores são recalculados para a destinatária pela regra de cada página. O faturamento total da equipe permanece o mesmo. A transferência afeta todos os meses, não apenas o filtro visível.

## Testes

115 testes automatizados aprovados na execução de 09/10/2026, incluindo autorização, senha, confirmação, preservação, auditoria, rollback, origem/destino, retirada, restauração, checksum e isolamento de comissão entre módulos. Tipagem, build e integridade do diff aprovados. Aviso de tamanho do bundle já existente não impede o build.
