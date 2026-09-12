# Evidência de laboratório comunitário AppServer — 2026-09-12

**Escopo:** validação interna, autorizada pelo proprietário, em ambiente Docker
de testes. Docker continua fora do produto, do VSIX, do CI obrigatório e da
jornada de instalação do usuário.

## Identidade e segurança

- Topologia observada: WebApp, AppServer, DBAccess, License Server e PostgreSQL
  em rede Compose privada, publicados somente em loopback para a estação de
  teste.
- Nenhuma credencial, token, fonte ADVPL, RPO, dump de banco ou dado de negócio
  foi gravado neste documento.
- O banco foi acessado em `BEGIN TRANSACTION READ ONLY` e encerrado por
  `ROLLBACK`; não houve DDL/DML nem exportação de tabelas.

## Resultados observados

| Verificação | Resultado | Evidência resumida |
|---|---|---|
| Serviços do laboratório | PASS | AppServer em execução; DBAccess, License Server e PostgreSQL saudáveis. |
| Caminho de rede | PASS | Loopback respondeu para WebApp, TDS e DBAccess; o AppServer abriu conexões para DBAccess, licença e PostgreSQL. |
| Sessão WebApp | PASS | Seleção `P12` abriu sessão autenticada e a aplicação apresentou a área de Construção e Projetos. |
| Banco Protheus | PASS limitado | PostgreSQL respondeu com codificação `WIN1252`, 150 tabelas públicas e oito tabelas candidatas Protheus; consulta somente leitura. |
| Host VS Code/TDS | PASS limitado | VS Code 1.137.0 carregou o VSIX instalado, ativou TDS 2.1.3 e concluiu o smoke de comandos, CP1252/LF e multi-root. |

## Ajuste de infraestrutura aplicado

Após reinicialização do Docker, a descoberta de serviços da rede Compose ficou
obsoleta em alguns containers. A recuperação recriou somente os containers da
topologia, preservando os volumes. Também foi corrigido o script local de início
para aceitar a mensagem de prontidão do License Server apenas quando o
healthcheck Docker estiver saudável. O problema era de orquestração do
laboratório, não do produto.

## Limites desta evidência

Este laboratório usa imagens comunitárias. Ele prova que a topologia de testes
subiu, que uma sessão WebApp foi alcançada, que o banco responde em leitura e
que o produto coexiste com TDS instalado. Ele **não** prova licença/entitlement,
compatibilidade oficial, acesso exclusivo ao RPO, compilação real de fonte pelo
TDS, comportamento de um adapter de build, nem aprovação para Stable/Marketplace.
O fechamento desses itens segue exclusivamente
[o protocolo de homologação](appserver-homologation-acceptance.md).

## Próxima execução admissível

Quando houver um laboratório licenciado com janela de RPO, executar todos os
casos do protocolo, inclusive falha, include, lock, timeout/cancelamento e
redação. O artefato público deve conter apenas o veredito e hashes; a evidência
operacional permanece privada.
