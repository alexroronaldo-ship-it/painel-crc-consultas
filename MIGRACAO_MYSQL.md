# Preparação para sair do Manus mantendo MySQL

Esta branch prepara a execução e a restauração. Não é uma implantação concluída.
O destino de hospedagem ainda não foi escolhido. Não foi contratado serviço,
transferido dado para terceiros nem alterado o painel em produção.

## Estado preservado em 13/10/2026

- Base do código: `e0226fff6b47625ec407a657d915a400fc367017`.
- As duas atualizações de 13/10 estão preservadas, inclusive as regras de
  considerar somente pacientes fechados. Este trabalho não altera telas ou comissões.
- O pacote de 11/10 contém backup do banco de **10/10/2026, 15h20 UTC
  (12h20 em Fortaleza)**: 16 tabelas, 87 registros no total.
- O backup não comprova os lançamentos posteriores a esse horário.
- `patient_intakes` e `__drizzle_migrations` também devem ser restauradas,
  mesmo sem correspondência nas páginas atuais. Não remover tabelas antigas.
- O ZIP e o SQL contêm dados pessoais: manter fora deste repositório público.

## O que está preparado

- `Dockerfile`: build com lockfile, Node 24 e processo sem privilégios de root.
- `compose.migration.yml`: MySQL 8.4 com volume persistente e sem porta pública.
  O servidor do painel está em perfil separado e escuta apenas no host local.
- `.env.migration.example`: nomes de configuração sem credenciais.
- `scripts/mysql-backup.mjs`: verificação SHA-256, importação que recusa banco
  ocupado, trava contra duas importações simultâneas e conferência das contagens.
  O script usa `RESTORE_DATABASE_URL`, nunca escolhe a produção automaticamente.

O Compose é uma opção para servidor com Docker. Um MySQL gerenciado e uma
hospedagem Node também podem ser usados; adaptar a conexão ao destino escolhido.
Não iniciar o perfil `app` em produção antes de resolver login e armazenamento.

## 1. Preparar um destino novo

Em um servidor privado autorizado, com Docker e Compose instalados:

```bash
cp .env.migration.example .env.migration
chmod 600 .env.migration
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Execute o gerador três vezes e preencha senhas diferentes em
`MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` e `JWT_SECRET`. Use caracteres hexadecimais
nas senhas deste exemplo para montar a URL sem problemas de codificação.
Não enviar senhas na conversa, no Git ou em capturas de tela.

```bash
docker compose --env-file .env.migration -f compose.migration.yml up -d mysql
docker compose --env-file .env.migration -f compose.migration.yml build app
```

O volume precisa ser novo. Não montar volume do Manus nem de outro sistema.
Não usar `docker compose down -v`: esse comando apaga o banco persistente.

## 2. Conferir e restaurar o backup

Extraia `backup-original/database.sql.gz` e `backup-original/manifest.json` do
ZIP para uma pasta privada **fora do repositório**. Os exemplos abaixo usam
`/caminho/privado/backup-original`; substitua pelo caminho real no servidor.

Primeiro, confira o arquivo, sem abrir conexão com o banco:

```bash
docker compose --env-file .env.migration -f compose.migration.yml run --rm --no-deps \
  --volume /caminho/privado/backup-original:/backup:ro \
  app node scripts/mysql-backup.mjs --mode inspect \
  --dump /backup/database.sql.gz --manifest /backup/manifest.json
```

Com o MySQL saudável e o painel parado, restaure somente no destino vazio:

```bash
docker compose --env-file .env.migration -f compose.migration.yml run --rm --no-deps \
  --volume /caminho/privado/backup-original:/backup:ro \
  app sh -c 'RESTORE_DATABASE_URL="$DATABASE_URL" node scripts/mysql-backup.mjs --mode restore --confirm-empty-target --dump /backup/database.sql.gz --manifest /backup/manifest.json'
```

O importador preserva IDs, usuários, permissões e registros do dump. Ele verifica
tabelas e contagens ao terminar. Se falhar durante a execução do SQL, o MySQL pode
ficar parcialmente restaurado: DDL não tem rollback completo. Não repetir sobre
esse banco; investigar e preparar outro destino vazio. Nunca apagar a produção.

Para uma conferência posterior, repita o comando usando `--mode verify` e retire
`--confirm-empty-target`. Faça isso antes de liberar gravações: novos lançamentos
naturalmente alteram as contagens do backup.

Para banco gerenciado, use a conexão restrita ao banco de destino em
`RESTORE_DATABASE_URL` e TLS: `MYSQL_REQUIRE_TLS=1`, ou `MYSQL_SSL_CA_FILE` com
a autoridade certificadora fornecida pela hospedagem. O script não desativa a
validação do certificado. Ajustar também a conexão da aplicação ao TLS exigido
pelo provedor antes da publicação.

## 3. Compatibilizar a estrutura com o código atual

O backup já tem a estrutura até a alteração `0020`. A atualização `0021` de
13/10 adicionou `val_sales.treatment`, ausente no backup de 10/10.

Confira a existência da coluna sem alterar dados:

```bash
docker compose --env-file .env.migration -f compose.migration.yml exec -T mysql \
  sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --user="$MYSQL_USER" "$MYSQL_DATABASE" --execute="SHOW COLUMNS FROM val_sales LIKE '\''treatment'\'';"'
```

**Somente se a coluna estiver ausente**, aplique a migração aditiva existente:

```bash
docker compose --env-file .env.migration -f compose.migration.yml exec -T mysql \
  sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --user="$MYSQL_USER" "$MYSQL_DATABASE"' \
  < drizzle/0021_nasty_swordsman.sql
```

Os históricos ficam com tratamento nulo; o código atual já trata essa situação.
Não preencher tratamentos por suposição. Não executar `pnpm db:push` sobre o
dump: `__drizzle_migrations` tem somente uma entrada, apesar de a estrutura conter
alterações posteriores. Reconciliar a tabela de migrações com o schema realmente
restaurado antes de habilitar migrações automáticas futuras.

Se houver backup mais recente ou novos commits no GitHub, conferir novamente a
compatibilidade antes de aplicar qualquer SQL. O roteiro acima descreve apenas
o backup disponível e o commit registrado no começo deste documento.

## 4. Pendências antes de abrir o painel à equipe

1. **Hospedagem:** escolher servidor/serviço e disponibilizar acesso; configurar
   HTTPS e backups externos com teste de restauração. O volume local sozinho não
   protege contra perda do servidor.
2. **Login:** a aplicação ainda usa a autenticação Manus. Suas credenciais não
   estão no backup. Para sair totalmente do Manus, implementar autenticação
   independente e vincular os quatro usuários existentes, mantendo IDs e papéis.
   Não criar administrador genérico nem liberar rotas sem autenticação.
3. **Fotos e logos:** o ZIP contém referências, mas não os arquivos. Exportar ou
   recuperar esses arquivos com acesso autorizado e migrar o armazenamento.
4. **Conferência:** validar login real, permissões, leitura e gravação, gráficos,
   comissões, campanhas, transferências e uploads no novo ambiente.
5. **Virada:** obter backup recente ou conciliar os lançamentos posteriores a
   10/10; definir breve pausa de gravação, validar o novo endereço e só então
   direcionar a equipe. Preservar o serviço original como retorno até a aceitação.

Depois de resolver essas pendências, o comando do perfil do app será:

```bash
docker compose --env-file .env.migration -f compose.migration.yml --profile app up -d app
```

O app fica em `127.0.0.1:3000`, para ser acessado por proxy HTTPS no servidor.
O healthcheck verifica somente que o processo responde; não comprova login,
banco restaurado ou funcionamento completo.

## Validação desta preparação

Os testes do importador exercitam bloqueio de destino ocupado, trava de
concorrência, hash, contagens e tratamento de falhas com conexões simuladas.
A preparação passou em 9 testes do importador, na checagem TypeScript e no
build do cliente e do servidor. A leitura offline confirmou o hash do backup;
a comparação de colunas confirmou que somente `val_sales.treatment` falta
para o schema atual. O YAML do Compose foi analisado sintaticamente.
O build mantém os avisos preexistentes sobre analytics ausente e bundle grande.
A execução real em MySQL e o build da imagem Docker ainda dependem do ambiente
de destino e devem ser realizados antes da migração definitiva.

Referências: [imagem oficial MySQL](https://hub.docker.com/_/mysql/) e
[ordem de inicialização do Compose](https://docs.docker.com/compose/how-tos/startup-order/).
