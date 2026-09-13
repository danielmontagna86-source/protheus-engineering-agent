# Design — fechamento interno do candidato de release

O repositório já possui um pipeline completo para o candidato. Em vez de criar
outro empacotador ou uma falsa automação de aprovação, esta mudança corrige o
registro de governança e executa a cadeia já existente contra o commit exato.

```text
commit limpo
  -> npm ci + bateria interna
  -> VSIX/source/SBOM verificáveis
  -> relatório de validação
  -> PASS interno / NO-GO externo explícito
```

O resultado é um pacote operacional pronto para ser associado à futura
evidência final, mas não é a evidência final. Essa separação impede que um
teste local, uma conta de automação ou uma imagem de Docker substitua a prova
de publisher, AppServer licenciado, acessibilidade ou uso humano.
