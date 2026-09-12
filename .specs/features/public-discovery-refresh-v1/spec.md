# Especificação — descoberta pública e consistência de marca

**Status:** Em execução
**Data:** 2026-09-12
**Escopo:** metadados públicos, documentação de lançamento e descoberta do VS Code; não altera contratos de runtime nem promove Marketplace/Stable.

## Objetivo

Fazer com que uma pessoa que encontre o repositório ou o VSIX compreenda, em poucos minutos, o valor verificável do produto, o que ele não tenta substituir e o estágio real de publicação. A apresentação deve ser consistente com o estado público observado, sem usar estrelas, instalações ou alegações de produtividade como prova de qualidade.

## Requisitos

### PDR-001 — estado público verdadeiro

- A documentação de lançamento DEVE registrar que o repositório é público, que a proteção de `main`, CodeQL, varredura de segredos e private vulnerability reporting estão ativos quando esta for a evidência observada.
- Ela NÃO DEVE afirmar que a visibilidade privada, checks pulados ou a inexistência de proteção ainda são o estado atual.
- Evidência histórica pode permanecer, desde que esteja claramente rotulada como histórica e não como estado do candidato corrente.

### PDR-002 — descoberta honesta no Marketplace

- O manifesto da extensão DEVE usar somente categorias permitidas e compatíveis com capacidades entregues.
- A extensão DEVE aparecer em `Programming Languages`, além de `Linters` e `Testing`, pois seu valor central é engenharia ADVPL/TLPP; nenhuma categoria deve prometer IDE, compilador ou chat próprio.
- Palavras-chave, ícone, banner, walkthrough, licença, repositório e canal preview DEVEM permanecer consistentes.

### PDR-003 — identidade independente e memorável

- A marca pública continua **Protheus Engineering Agent** até uma decisão jurídica/naming separada.
- A narrativa DEVE priorizar “camada de evidências de engenharia para ADVPL/TLPP no VS Code”, não “agente genérico autônomo”.
- O disclaimer de independência de TOTVS/Protheus/Hermes DEVE permanecer visível e não se deve usar identidade visual de terceiros.

### PDR-004 — benchmark de mercado reproduzível

- A análise DEVE comparar referências reais de adoção e distribuição sem inferir qualidade pelas estrelas.
- Deve distinguir itens que são padrões de publicação (README, release, comunidade, suporte, website) daqueles que são escolhas de produto (chat, edição autônoma, terminal, provider lock-in).
- Recomendações devem indicar o que será implementado agora, o que é experimento de adoção e o que depende de proprietário, publisher ou revisão jurídica.

### PDR-005 — prevenção de regressão editorial

- Um teste de publicação DEVE falhar se a documentação operacional voltar a chamar o repositório atual de privado ou negar controles públicos que já estão ativos.
- O teste DEVE cobrir as categorias de descoberta do manifesto.

## Não objetivos

- Publicar no Visual Studio Marketplace, alterar o publisher ou remover `preview`.
- Prometer afiliação, homologação TOTVS, ganho de produtividade, liderança de mercado ou suporte comercial.
- Habilitar Discussions sem uma política de moderação e SLA de triagem.
- Construir website, chat, IDE Electron, explorer, terminal ou Git UI próprios.

## Critérios de aceite

1. O benchmark e a decisão de marca possuem fontes primárias ou oficiais datadas.
2. A documentação operacional reflete a evidência pública observada em 2026-09-12 e conserva gates externos como pendências explícitas.
3. O manifesto inclui as três categorias definidas e o teste de contrato correspondente passa.
4. A suíte focal de publicação, o validador estrutural e a revisão de diff passam sem finding bloqueante.
