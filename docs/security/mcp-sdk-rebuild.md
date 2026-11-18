# Rebuild verificável do SDK MCP

O lockfile usa o SDK 2.4.0 reconstruído em `release-artifacts/mcp-sdk/modelcontextprotocol-server-2.4.0-verified.tgz`. A pasta `release-artifacts` guarda os arquivos gerados do checkout e é excluída do Git. O bootstrap é uma etapa explícita anterior ao `npm ci`.

## Checkout limpo no Windows

Use Git, Python 3.12.10 com zlib 1.3.1 e Node 22.23.5 para a reconstrução de referência. Confira a distribuição Node no manifesto SHA-256 da versão oficial. O SHA-256 da distribuição Windows x64 ZIP utilizada na validação foi `4a191082e9706866830379d577d2cc8a50c776fcd9436a8d061b063ed0d9a0e3`. [Distribuição oficial Node 22.23.5](https://nodejs.org/dist/v22.23.5/)

```powershell
python scripts/bootstrap-mcp-sdk.py --node C:/caminho/node-v22.23.5-win-x64/node.exe
npm ci --cache release-artifacts/npm-clean-cache --ignore-scripts --no-audit --no-fund
npm run validate
```

O bootstrap usa um diretório e uma store pnpm temporários novos em cada execução. Ele busca o commit da tag do SDK e o commit corretivo do GitHub oficial, verifica os dois IDs e o diff mínimo do PR #3108, verifica o SHA-512 do pnpm 10.26.1, aplica os diffs pinados e instala com lock congelado e scripts de instalação desativados. O `prepack` revisado de upstream chama apenas o build do SDK e resolve o mesmo pnpm pinado no script. Os dois builds precisam coincidir após normalização do manifesto e da embalagem. O hash do tarball, os dois sourcemaps de Ajv e todas as licenças verificadas são registrados em `release-artifacts/mcp-sdk/provenance.json`. [Correção oficial #3108](https://github.com/modelcontextprotocol/typescript-sdk/pull/3108)

## Instalação local em outra plataforma

Depois do rebuild de referência, transfira o tarball e sua proveniência usando o meio local escolhido. A opção abaixo valida o hash e instala o tarball na pasta prevista pelo lockfile. Essa opção não recompila o SDK. O Node usado para testar a aplicação pode ser diferente do Node pinado para reconstruir o SDK.

```bash
python3 scripts/bootstrap-mcp-sdk.py --from-verified /caminho/modelcontextprotocol-server-2.4.0-verified.tgz
npm ci --cache release-artifacts/npm-clean-cache --ignore-scripts --no-audit --no-fund
npm run validate
```

O SHA-256 esperado do tarball é `478c607f4252af5eb6c1a84801f06239b1954fd2633932fa58c27833800b86de`. O fluxo interno que reempacota o VSIX a partir do arquivo de fontes verifica o artefato no checkout chamador e semeia a cópia temporária antes de executar o `npm ci`. Ausência, hash divergente ou links no caminho abortam a operação. O fluxo local funciona sem publicar o tarball em um registro.

O tarball normalizado mantém as declarações TypeScript e os mapas JavaScript executáveis. Ele descarta os 24 mapas de navegação de declarações e seus comentários de referência. O gerador detectou variação de um desses mapas entre duas compilações equivalentes. Os 93 arquivos entregues são comparados antes de gerar o tarball e sua integridade fica fixada no lockfile.

## GitHub Actions

`.github/workflows/prepare-mcp-sdk.yml` é reutilizado por CI, segurança e proveniência. Cada execução que precisa instalar a revisão atual tem um produtor Windows x64 com Node 22.23.5 e Python 3.12.10. Ele recompila, verifica e entrega o tarball e o recibo como artefato da própria execução, com retenção de sete dias. Os consumidores baixam pelo ID devolvido pelo produtor e verificam o SHA-256 local antes de `npm ci`. O lockfile do npm confirma também a integridade SHA-512. O tarball do SDK não entra no conjunto de artefatos de release.

Os caches de gerenciador de pacotes do setup continuam desativados. O artefato não é restaurado de outra execução, e os jobs começam com uma instalação do lockfile. A matriz de CI conserva Windows/Linux, Node 22/24, o gate de mutação e o Extension Host. A instalação da versão antiga pinada usada para o teste de rollback continua com o lockfile daquela revisão. O monitor público usa somente a biblioteca padrão do Node e já pode rodar sem instalar dependências.

O workflow de segurança conserva o OSV do lockfile inteiro. Um job separado empacota o VSIX e monta um CycloneDX com a cadeia npm de runtime e as dependências identificadas no sourcemap pinado do Ajv usado no executável MCP. O inventário confirma os bytes do executável dentro do VSIX e registra os dois hashes. O scan recebe esse CycloneDX como entrada. O escopo é a composição identificada do MCP e do provider, e o scan do lockfile continua responsável pelo restante das dependências.

```bash
node scripts/mcp-composition.mjs
osv-scanner scan source --lockfile=package-lock.json
osv-scanner scan source --sbom=release-artifacts/mcp-composition.cdx.json
```

## Escopo do empacotador VSIX

O empacotador local atende ao projeto e à lista explícita de 28 entradas, incluindo os manifestos gerados. Suporta versões estáveis `x.y.z`, `engines.vscode` com versão estável exata ou com `^`, identificadores ASCII de extensão, entry point JavaScript já presente no pacote, ícone de Marketplace PNG e referências `%chave%` para strings do manifesto. Preserva as propriedades VSIX de identidade, localização, compatibilidade, categorias, tags, vínculos, branding, preview, preço, Q&A e os assets usados pelo produto. O manifesto JSON mantém as contribuições e capacidades do VS Code. O SVG estático da barra de atividades é um asset do produto e passa pela varredura de texto.

O projeto usa `preview: true` no manifesto para preparar o canal de pré-release. Nesse modo, o VSIX declara `Microsoft.VisualStudio.Code.PreRelease=true` e exige VS Code 1.63.0 ou posterior. Um manifesto sem preview não emite essa propriedade. O metadado prepara o artefato para revisão e não modifica nenhum canal público.

Esse é um subconjunto do VSCE. Vale para o inventário e documentação deste repositório. Não implementa assinatura, publicação, seleção de alvo, descoberta de dependências, regras de `.vscodeignore`, reescrita de links Markdown nem a validação geral de badges e imagens do Marketplace. Qualquer mudança fora do subconjunto precisa de revisão e testes próprios antes de publicar.

O VSCE 4.0.0 original usava o preset recomendado e a regra dotenv do Secretlint, permitia a mensagem `BasicAuth` e aplicava os mesmos filtros da regra para blocos de chave privada e para a forma de token npm. O empacotador mantém essa configuração e bloqueia erros sem imprimir a amostra que acionou a regra. O VSCE pulava SVGs em disco na varredura de segredos. Aqui SVG é tratado como texto. JPG, JPEG, PNG e GIF são tratados como binários e não passam por essa varredura. Testes sintéticos cobrem chave privada multilinha, token npm, `.env`, token dentro de SVG, redaction e a exceção preexistente de BasicAuth.
