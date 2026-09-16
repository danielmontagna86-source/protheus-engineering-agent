# Operações de lançamento público

**Status:** O repositório público e o GitHub preview existem; Stable e
Marketplace continuam bloqueados até o gate do candidato exato estar verde.

Este é o checklist operacional para transformar o repositório e a listing do VS
Code em um produto público confiável. Ele não altera a decisão `NO-GO`, não cria
endosso e não autoriza uma release por si só.

## Estado observado em 2026-09-15

- O repositório canônico é público. O Community Profile marca 100%, há 15
  tópicos específicos e o homepage permanece vazio até existir site de produto
  verificável. O preview social 1280 × 640 está versionado em
  [`media/social-preview.png`](../media/social-preview.png), mas sua atribuição
  e renderização no card do GitHub ainda precisam de confirmação manual.
- A proteção de `main` exige pull request, conversas resolvidas, admin
  enforcement e nove checks: matriz Windows/Linux × Node 22/24, mutação/audit,
  VS Code Extension Host, CodeQL, segredo verificado e OSV. Force-push e
  exclusão estão bloqueados. A aprovação obrigatória permanece em zero somente
  pela exceção pública de mantenedor único em `GOVERNANCE.md`.
- Dependabot, secret scanning, push protection, CodeQL e private vulnerability
  reporting estão ativos. Checks verdes devem sempre ser lidos no commit do
  candidato, não herdados de uma revisão anterior.
- A prévia pública `v0.3.9` no GitHub possui source ZIP, VSIX, SBOM, manifesto
  e `SHA256SUMS`, todos vinculados ao commit `29993a8`; os ativos baixados foram
  conferidos por SHA-256 e por atestação. A manutenção posterior de CodeQL no
  commit `877b87b` passou a matriz protegida, mas não cria um novo artefato. A
  prévia não é uma release Stable nem uma publicação Marketplace.
- Toda Action externa continua fixada por SHA completo; Actions locais seguem
  permitidas conforme a política do repositório.
- Publisher e identificador da extensão no Marketplace não estão verificados
  como listing vivo. Nenhuma versão Marketplace é alegada como publicada.

Estas observações devem ser atualizadas imediatamente antes de cada decisão de
release. Visibilidade no GitHub expõe fontes e histórico de Actions, permite
forks públicos e é um evento de divulgação, não uma mudança cosmética.

## Baseline do repositório público

Antes de promover um candidato, o responsável pela release deve atualizar estas
evidências por API/UI e registrá-las no recibo:

1. Manter a descrição do repositório em português e centrada no escopo
   verificado: `Extensão VS Code independente para engenharia ADVPL/TLPP baseada
   em evidências: CodeGraph, revisão e contexto de projeto.` Manter apenas os
   tópicos específicos: `advpl`, `tlpp`, `protheus`, `totvs`,
   `vscode-extension`, `visual-studio-code`, `developer-tools`, `code-review`,
   `static-analysis`, `codegraph`, `model-context-protocol`, `mcp`,
   `developer-productivity`, `software-quality` e `local-first`.
2. Atribuir o [`media/social-preview.png`](../media/social-preview.png) revisado
   (1280 × 640 PNG, menos de 1 MB) como preview social do repositório e conferir
   o card renderizado. O gráfico abstrato não contém UI fabricada, logo de
   fornecedor, declaração “oficial” ou endosso implícito.
3. Confirmar que README, `README.en.md`, `LICENSE.md`, `NOTICE`, avisos de
   terceiros, `SECURITY.md`, `SUPPORT.md`, guia de contribuição, governança,
   formulários de issue, template de pull request, changelog, citação e Code
   Owners existem e possuem links corretos na branch padrão.
4. Manter Dependabot e private vulnerability reporting ativos e confirmar o URL
   de segurança antes de convidar relatos públicos. `SECURITY.md` continua a
   rota versionada de divulgação responsável.
5. Manter a proteção de `main` com PR atualizado, conversas resolvidas, matriz
   CI, mutação/audit, host VS Code, OSV, secret scan e CodeQL. Bloquear
   force-push e exclusão. Ao entrar um segundo mantenedor, exigir ao menos uma
   aprovação como definido em `GOVERNANCE.md`.
6. Manter permissões padrão de Actions em leitura, SHA pinning e nenhuma
   exposição de segredo a pull requests originados de forks. O workflow de
   release permanece manual e usa atestações de artefato.

## Contrato de listing no Marketplace

A página do Marketplace é uma superfície de produto. A primeira prévia só pode
ser submetida depois que o baseline público e o gate de evidência de release
passarem.

- **Nome:** Protheus Engineering Agent
- **Descrição curta:** Ferramentas independentes de engenharia para projetos ADVPL/TLPP no VS Code, com evidências reproduzíveis.
- **Categorias/palavras-chave:** usar `Programming Languages`, `Linters` e `Testing`;
  publicar somente palavras-chave que descrevem capacidades já entregues.
- **Canal:** versão numérica `0.x.y` com a flag de prévia enquanto `preview` for
  verdadeiro. Uma listing estável usa versão distinta `1.0.0` ou posterior com
  `preview` desligado.
- **Publisher:** criar ou confirmar o publisher imutável sob a identidade
  Microsoft do responsável pela release. Não guardar token no Git; usar
  publicação federada quando houver suporte, em vez de credencial duradoura.
- **Mídia:** enviar capturas reais e sanitizadas do VSIX instalado: Central de
  Engenharia, revisão offline de arquivos alterados em Problemas/Saída e o
  walkthrough de primeiro valor. Validar foco por teclado, alto contraste,
  zoom de 200% e rótulos de leitor de tela na mesma matriz VS Code suportada
  antes de chamá-las de prontas para produção.
- **Alegações:** afirmar somente que capacidades determinísticas/offline estão
  disponíveis sem Hermes ou modelo. Não alegar compilação, segurança de
  produção, suporte TOTVS, melhoria de produtividade, prevenção de defeito,
  liderança de mercado ou compatibilidade além da evidência publicada.

A submissão ao Marketplace é separada de uma GitHub Release. Empacotar e
inspecionar primeiro o VSIX exato, publicar esse arquivo idêntico por checksum e
então baixar novamente o pacote do Marketplace, registrando sua identidade e
versão.

## Plano de adoção rumo a 1.000 estrelas

**1.000 estrelas é uma meta de adoção, não gate de release, métrica de qualidade
ou promessa.** Estrelas podem sinalizar descoberta, mas não comprovam eficácia,
uso ativo, segurança ou liderança de mercado.

O crescimento, portanto, é uma sequência de ciclos guiados por evidência:

1. **Primeiro valor:** tornar o walkthrough offline de cinco minutos
   reproduzível a partir de perfil VS Code limpo e publicar resultado medido,
   ressalvas e matriz suportada.
2. **Prova:** publicar uma amostra legal pequena e vídeo curto do VSIX real
   mostrando `indexação → revisão de mudanças → Problemas` nativos. Vincular
   fonte, versão, comando e limites.
3. **Comunidade:** triar issues pelos formulários existentes, aplicar `good
   first issue` somente após reproducer e resultado esperado e publicar nota de
   versão mensal com lacunas de evidência fechadas.
4. **Distribuição:** publicar artigos técnicos bilíngues e demonstrações para
   comunidades ADVPL/TLPP, usuários TDS e mantenedores. Cada material conduz a
   um fluxo verificado, não a alegações genéricas de IA.
5. **Retenção:** convidar usuários representativos ao piloto pré-registrado,
   publicar achados agregados e limites e priorizar os maiores atritos
   reproduzíveis. Não solicitar estrelas em troca de acesso, suporte ou
   alegações de produto.

Monitorar impressões, conversão de clone para instalação, conclusão do primeiro
valor, usuários semanais retidos, tempo de resposta de issue, taxa de bug
reproduzível, falsos positivos de review e feedback qualitativo do piloto.
Reportar estrelas e instalações Marketplace separadamente como proxies datados
de adoção.

## Procedimento ordenado de release

1. Fazer merge somente do candidato revisado após todos os checks CI exigidos
   passarem em seu commit `main` exato.
2. Gerar source ZIP, VSIX, SBOM, manifesto e checksums desse commit limpo;
   executar fresh-install, ciclo de vida, coexistência TDS e UAT humana exigida.
3. Completar os gates de compatibilidade externa, marca/jurídico, reporte de
   segurança, acessibilidade e piloto; registrar aprovação nominal do
   responsável na evidência final ignorada.
4. Atualizar a prova dos controles públicos, atribuir/verificar o preview social
   e inspecionar CodeQL, dependências, segredos e proteção no commit candidato.
5. Disparar a proveniência, verificar sua atestação, criar tag imutável e
   GitHub Release, baixar cada artefato e conferir todos os hashes novamente.
6. Submeter o mesmo VSIX verificado no canal Marketplace aprovado, verificar a
   listing/instalação pública e então publicar o anúncio bilíngue com versão,
   limites e rota de suporte exatos.

Qualquer hash, scan, download, review, UAT ou autorização que falhe interrompe a
sequência. Retirar ou corrigir adiante; nunca reescrever tag consumida ou trocar
silenciosamente um build do Marketplace.
