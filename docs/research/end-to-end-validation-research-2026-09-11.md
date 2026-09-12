# Pesquisa de validação ponta a ponta — 2026-09-11

**Decisão:** o produto pode continuar como extensão VS Code independente com
runtime reutilizável. Nenhuma pesquisa sustenta transformar Hermes ou Docker em
pré-requisito. A promoção Stable 1.0 continua `NO-GO` até que as provas externas
abaixo existam no mesmo release candidate.

**Método:** fontes primárias atuais, cruzadas com o código, CI e documentação
versionada do repositório. Uma fonte descreve uma obrigação/possibilidade da
plataforma; ela não substitui uma execução no nosso artefato.

## Achados que alteram a execução

| Tema | Fonte e achado | Decisão executável |
|---|---|---|
| Extensão remota | A documentação de [Remote Development](https://code.visualstudio.com/docs/remote/faq) explica que extensões de workspace executam no host remoto e recomenda testar extensões em container; a página de [troubleshooting](https://code.visualstudio.com/docs/remote/troubleshooting) descreve a instalação de um VSIX local no endpoint remoto. | Conservar `extensionKind: ["workspace"]`; exigir um teste do VSIX no Extension Host remoto, registrando local de execução. Rodar Node em container é evidência auxiliar, não substituta. |
| Pacote VSIX | O [Marketplace do VS Code](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace) documenta instalação por `code --install-extension arquivo.vsix`. | Tratar instalação, upgrade, uninstall/reinstall e rollback como contrato do artefato, não apenas do workspace de desenvolvimento. |
| Manifesto | A referência do [manifesto de extensões](https://code.visualstudio.com/api/references/extension-manifest) exige nome, versão, publisher e engine VS Code compatível; define metadados de licença. | Manter validação de manifesto/package e revisar metadados no commit que virar `main`; não deduzir licença da API enquanto o branch padrão não contém o arquivo. |
| Marketplace e pré-release | O guia de [publicação](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) exige versão numérica `major.minor.patch`; pré-release usa flag, não sufixo SemVer. Ele também descreve versão distinta para pré-release/release. | Manter `0.3.0` numérico e `preview`; definir a sequência 1.0 somente na ação de publicação, com artefatos e hashes fechados. |
| Publisher verificado | O mesmo guia informa pré-requisito de extensão no Marketplace por no mínimo seis meses, domínio registrado por seis meses, TXT DNS e revisão do Marketplace em até cinco dias úteis. | O selo não pode ser requisito para o primeiro upload, mas deve constar como meta pós-lançamento com domínio legítimo, sem prometer o badge na estreia. |
| Code scanning | [GitHub Code Scanning](https://docs.github.com/en/code-security/concepts/code-scanning/code-scanning) informa que code scanning é gratuito para repositórios públicos; privados exigem GitHub Code Security. | O `SKIPPED` atual é corretamente `NO-GO` para o lançamento público. Para fechar: tornar o repositório público na ação autorizada ou contratar/ativar a capacidade aplicável; depois rodar e arquivar resultados no commit candidato. |
| Proteção de branch | A API de [branch protection](https://docs.github.com/en/rest/branches/branch-protection) informa que GitHub Free protege branches públicos, enquanto privados exigem plano compatível; [status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) devem estar verdes/neutral/skipped conforme a regra configurada. | Antes da primeira merge pública, configurar `main` com checks obrigatórios estritos, revisão e bloqueio de force push; revalidar nomes dos checks a partir de execução recente. |
| Proveniência | [Artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) informa que Free/Pro/Team permitem atestações apenas para repositórios públicos; privado/interno exige Enterprise Cloud. | Não alegar atestação enquanto privada. Depois de visibilidade/entitlement, gerar e verificar atestação para VSIX, SBOM e source ZIP, além dos hashes locais existentes. |
| Protheus/EngPro | O repositório oficial [EngPro skills](https://github.com/totvs/engpro-advpl-tlpp-skills) é MIT, atualizado continuamente, recomenda curadoria humana e declara que skills não garantem qualidade final. | Manter o provider fixado em `config/skill-providers.json`; tratar suas orientações como padrão de trabalho, nunca como compilação/homologação. |
| TDS | O repositório oficial [TDS-VSCode](https://github.com/totvs/tds-vscode) já cobre desenvolvimento e compilação. | Diferenciar o produto por evidência/qualidade/integração governada; não reimplementar compile/debug/RPO. A coexistência TDS precisa de prova instalada, mas não prova AppServer. |

## Pesquisa de Docker e AppServer

Os testes já documentados com imagens oficiais EngPro mostram contrato de
analisador e PostgreSQL em ambiente efêmero. Eles são adequados como QA interno.
O AppServer oficial de desenvolvimento exige artefatos legítimos do titular
(configuração, RPO, dicionário/includes e infraestrutura associada). Imagens
comunitárias não transferem direitos sobre runtime, RPO ou conteúdo proprietário
apenas porque os scripts de Compose têm licença aberta. Portanto, a forma
correta de fechar a integração é uma homologação privada com materiais
entitlement-verified, não adicionar uma imagem comunitária ao produto.

Referências internas com admissão, execução negativa e teardown:

- [revisão de Docker e lançamento](docker-test-lab-and-stable-launch-review-2026-09-08.md)
- [validação Docker interna](../qa/internal-docker-validation-2026-09-09.md)
- [validação Docker/Marketplace posterior](docker-marketplace-and-publication-validation-2026-09-10.md)

## Modelo de lançamento recomendado

1. **Release candidate fechado:** repetir a bateria P0 de checkout limpo no SHA
   a publicar, gerar VSIX/SBOM/source ZIP/hashes e anexar evidência.
2. **Homologação controlada:** executar protocolo remoto, acessibilidade/UAT,
   AppServer licenciado e piloto. Corrigir qualquer P0/P1 antes de regenerar
   artefatos — correção cria novo candidato e exige nova bateria P0.
3. **Governança pública:** obter revisão jurídica/marca, domínio/publisher,
   definir a visibilidade e ativar controles GitHub disponíveis. Reexecutar
   CodeQL/policy/provenance após a mudança aplicável.
4. **Publicação autorizada:** somente então merge, tag, GitHub Release,
   Marketplace e anúncio — ações separadas, com verificação pública de download
   e instalação logo após o upload.

## Limites de conclusão

Esta pesquisa **SUPORTA** o processo e as escolhas de plataforma. Ela não prova
que uma instância Protheus particular, leitores de tela, usuários reais,
GitHub/Marketplace ou o domínio do publisher já passaram. Essas são provas
operacionais e humanas a produzir conforme o ledger Stable 1.0.
