# Transferir registros e retirar CRC

- [x] Botão disponível em Odontomab, Funil de Vendas Orto Implante e Pacientes Ativos Orto Implante.
- [x] Origem/destino explícitos, resumo de todos os meses com quantidade e valor, confirmação e senha provisória 0000; API restrita à gerência.
- [x] Transferência atômica somente dentro da página escolhida, preservando IDs, pacientes, valores, datas, campanhas, convênios, fotos de pacientes e autoria anterior em auditoria.
- [x] Comissão e progresso recalculados para a destinatária; faturamento da equipe preservado. Fotos profissionais, metas pessoais, tarefas e agenda não transferidas.
- [x] Retirada reversível da origem, histórico consultável e reativação que não desfaz transferências; estados separados entre as duas páginas Orto Implante.
- [x] Novos lançamentos e transferência serializados por bloqueios de perfil. Destino inexistente/retirado, resumo desatualizado e rollback cobertos por testes.
- [x] Migração 0018 aplicada sem modificar registros existentes. 115 testes, tipagem, build e diff aprovados.
- [x] Capturas autenticadas desktop/mobile e testes de diálogo/sucesso com respostas tRPC simuladas. Nenhuma transferência ou retirada real executada.

Pronto para checkpoint final. As CRCs de origem permanecem no histórico, em vez de exclusão física, para preservar rastreabilidade dos pacientes e dados semanais.
