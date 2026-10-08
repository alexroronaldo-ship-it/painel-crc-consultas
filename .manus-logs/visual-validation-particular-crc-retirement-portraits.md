# Revisão visual — Particular, retirada e retratos

As capturas do projeto em 08/10/2026 às 20:18, 20:20, 20:21 e 20:22 exibiram conteúdo autenticado real, não a tela de login. Esta inspeção foi feita pelas imagens retornadas pela captura do projeto, e não pelo navegador separado que anteriormente chegou ao login.

Na imagem desktop de `/val` (1440 × 1250), foram conferidos o título Odontomab (Ativos & Novo), os botões Editar CRC, Nova CRC e Retirar CRC na área Equipe CRC, três abas com miniaturas de Vivi, Michele e Aline e o retrato da CRC selecionada. Na imagem completa anterior, o dashboard Acompanhamento por convênio / Particular tinha seis cartões, incluindo Particular, e o formulário mostrava o rótulo Convênio / Particular. A lista das opções é derivada da constante compartilhada validada pela API; sua aceitação em cadastro e correção foi testada.

Em `/pacientes-ativos`, a imagem final (1440 × 1250) mostrou miniaturas de Wisllayny e JAYZA nas abas, foto de Wisllayny na coluna direita, botão Trocar foto e comissão mensal R$ 0,00. O indicador de vendas do módulo também era zero, enquanto o Funil tem valores diferentes: os cálculos continuam independentes. O botão troca a foto profissional compartilhada por pessoa; isso está explicitamente explicado abaixo do cartão. Após ajuste de altura natural, o texto inferior da foto não sobrepõe o gráfico seguinte.

As capturas completas de 390 × 844 das duas páginas foram examinadas: os controles da Odontomab se ajustam em linhas, abas e retratos permanecem dentro da tela, Particular aparece no acompanhamento e as tabelas mantêm rolagem horizontal. O retrato em Pacientes Ativos passa abaixo dos indicadores em vez de diminuir sua largura.

Não houve CRC retirada nesta tarefa. Por isso, o conteúdo condicional CRCs retiradas não apareceu na base real e não foi afirmado como verificado visualmente. Retirada com senha correta/incorreta, autorização, consulta histórica, reativação, bloqueio de novos dados, preservação e seleção sem CRC ativa foram verificados em testes automatizados com mocks. Nenhum paciente, venda ou perfil real foi removido ou modificado para testar.
