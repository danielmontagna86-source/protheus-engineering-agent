# Jornada do responsável pelo release

1. Congele commit, versão, contrato público, compatibilidade, changelog e claims aprovados.
2. Confirme CI Windows/Linux e Node 22/24, CodeQL, dependency review, OSV/npm audit, licenças e secret scan.
3. Reproduza VSIX, ZIP-fonte, SBOM e manifesto; confira SHA-256 e instalação após download.
4. Confira UAT/acessibilidade, homologação licenciada, piloto, suporte e rollback.
5. Registre aprovação nominal. Só então autorize visibilidade, tag, GitHub Release, Marketplace e anúncio como ações separadas.

Saída: GO somente quando todos os gates pertencem ao mesmo commit/artefato. Caso contrário, NO-GO com dependências externas explícitas.
