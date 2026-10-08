# Atualização — retirada de CRC, Particular e fotos

- [x] Particular incluído na Odontomab: cadastro, correção, tabela, busca e cartão de acompanhamento. Mantida comissão fixa de 0,2% e não reclassificados registros antigos sem convênio.
- [x] Retirar CRC com diálogo nomeado, confirmação, senha provisória validada no servidor e permissão de gerência.
- [x] Retirada reversível com isActive e auditoria; preservados ID, foto, vendas, pacientes, comissão e semanas. CRCs retiradas permite consultar o histórico ou reativar o mesmo perfil.
- [x] CRCs retiradas fora das abas ativas e de novos lançamentos; correção de paciente antigo mantém a atribuição original. Estado vazio previsto para retirada da última CRC.
- [x] Pacientes Ativos Orto Implante exibe retrato profissional e upload de Wisllayny/JAYZA com comissão exclusiva dos fechamentos desse módulo. Foto compartilhada com o Funil de Vendas, como explicado na interface; métricas continuam independentes.
- [x] Migração 0017 aditiva aplicada; todos os perfis existentes continuam ativos por padrão. 96 testes, tipagem, build e integridade do diff aprovados. Habilidade validada.
- [x] Revisão das capturas autenticadas de Odontomab e Pacientes Ativos, desktop e celular: Retirar CRC visível, Particular nos indicadores/formulário, miniaturas nas abas e foto com comissão na coluna lateral.

Nenhuma CRC real foi retirada ou reativada e nenhum paciente foi alterado como teste. Retirada, senha, acesso, reativação, preservação e caso sem CRC ativa foram testados com mocks, não por exclusões na base real. O próximo passo é salvar o checkpoint final da versão validada.
