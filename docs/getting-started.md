# Começando em cinco minutos

## Caminho offline

1. Instale o VSIX e abra a Central de Engenharia na Activity Bar.
2. Execute **Protheus Agent: Abrir workspace de exemplo offline**.
3. Execute **Diagnóstico**, **Indexar workspace** e **Revisar arquivo ADVPL/TLPP ativo**.
4. Confira os achados no painel nativo **Problemas** e o JSON no canal de saída.
5. Execute **Revisar mudanças Git** em um projeto versionado para gerar evidência de change set.

Esse caminho não exige Docker, Protheus, banco, Hermes, modelo ou rede. O resultado é pre-review determinístico; não é prova de compilação.

## Conhecimento do projeto

- Registre eventos no Journal com autoria.
- Revise a prévia e os hashes antes de promover um evento para Project Memory.
- Use expiração explícita para registros temporários.
- Importe snapshots TDN/Dictionary somente quando o arquivo declarar origem e licença/autorização; confira SHA-256 e atualidade antes da confirmação.

## Build

**Preparar build supervisionado** mostra o plano e nunca executa silenciosamente. O pacote público não traz AppServer, RPO nem credenciais. Sem adapter confiável fornecido pelo host, a resposta correta é `BUILD_UNAVAILABLE`.

## Próximos passos

Use as jornadas em `docs/workflows/pt-BR/`, a configuração em `.pea/config.json` conforme `schemas/pea-config.schema.json` e os limites em `docs/limitations.md`.
