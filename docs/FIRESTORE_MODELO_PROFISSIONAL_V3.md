# Firestore Modelo Profissional V3 (Estilo da Sorte)

## 1) Diagnostico do modelo atual (capturas + codigo)

Seu modelo atual ja tem uma base boa:

- colecoes centrais corretas (`usuarios`, `sorteios`, `vendas`, `configuracoes`, `auditoria`)
- separacao por perfil (`admin`, `vendedor`, `cliente`)
- subcolecoes de sorteio (`numeros`, `participantes`, `ganhadores`)
- trilha de auditoria

Pontos que reduzem maturidade em ambiente comercial:

- dados sensiveis (CPF/telefone) em locais de alta leitura (`numeros`, `participantes`)
- coexistencia de estados legados em venda (`status`, `statusPagamento`, `statusVenda`)
- metadados de operacao ainda incompletos para rastreabilidade (ex.: `entidadeTipo`, `entidadeId`, `source`)
- falta de padrao unico para campos de data e versionamento por documento
- indices ainda incompletos para algumas queries reais do app

## 2) Objetivo do V3

Evoluir para um schema:

- seguro (LGPD-first, minimo dado sensivel em leitura ampla)
- performatico (indices para consultas de tela, agregacoes prontas)
- auditavel (historico tecnico e de negocio)
- compativel (sem quebra do app atual durante migracao)

## 3) Modelo alvo V3 (compativel)

## 3.1 Colecao `configuracoes`

Documentos:

- `configuracoes/app`
- `configuracoes/sorteio_atual`
- `configuracoes/versao_app`
- `configuracoes/limites`
- `configuracoes/versao_banco`

Campos recomendados adicionais:

- `app`: `manutencao`, `nomeApp`, `contatoSuporte`, `timezoneDefault`
- `limites`: `expiracaoPendenciaMinutos`, `percentualComissaoPadrao`, `maxNumerosPorVenda`
- `versao_banco`: `schemaVersion`, `migradoPor`, `migradoEm`

## 3.2 Colecao `usuarios/{uid}` (dados publicos controlados)

Obrigatorios:

- `uid`, `nome`, `email`, `tipo`, `status`
- `criadoEm`, `atualizadoEm`, `createdAt`, `updatedAt`

Por tipo:

- vendedor: `comissao`, `totalVendas`, `avatarUrl`, `emailRecuperacao`
- cliente: `criadoPor` (uid do vendedor/admin que cadastrou)

Subcolecao:

- `usuarios/{uid}/pushTokens/{tokenId}`: `token`, `plataforma`, `ativo`, `ultimoUsoEm`

## 3.3 Colecao `usuarios_privados/{uid}` (PII)

Obrigatorios:

- `cpf` (somente backend/admin/dono)
- `cpfMascarado`

Opcionais:

- `telefone`, `dataNascimento`, `endereco`, `observacoesInternas`

Regra: nunca duplicar CPF em `numeros`, `participantes` ou `vendas`.

## 3.4 Colecao `sorteios/{sorteioId}`

Obrigatorios:

- `titulo`, `codigoSorteio`, `status`, `statusLegado`
- `dataSorteio`, `totalNumeros`, `precoPorNumero`
- `vendasAtivas`, `adminId`
- `criadoEm`, `atualizadoEm`

Opcionais de negocio:

- `premioPrincipal`, `premioDinheiro`, `metaArrecadacao`, `termosCondicoes`, `imagemUrl`

Resultado:

- `ganhadorId`, `numeroSorteado`, `resultado`

Metricas denormalizadas:

- `metrics` e `metricas` (compatibilidade legada)

Subcolecoes:

- `sorteios/{sorteioId}/numeros/{numeroId}`
- `sorteios/{sorteioId}/participantes/{clienteId}`
- `sorteios/{sorteioId}/ganhadores/{ganhadorId}`
- `sorteios/{sorteioId}/metrics/current`
- `sorteios/{sorteioId}/vendedores/{vendedorId}` (opcional para distribuicao)

## 3.5 Subcolecao `numeros`

Obrigatorios:

- `numero` (padrao 6 digitos no app atual)
- `status`: `disponivel|reservado|vendido`
- `sorteioId`
- `atualizadoEm`

Quando reservado/vendido:

- `clienteId`, `nomeCliente`, `vendedorId`, `vendaId`
- `reservadoEm`, `expiracaoReserva`, `vendidoEm`
- `valorPago` (opcional)

Nao recomendado:

- `cpfCliente`, `telefoneCliente` (remover gradualmente)

## 3.6 Subcolecao `participantes`

Obrigatorios:

- `clienteId`, `nomeCliente` (ou `nome` por legado)
- `quantidadeNumeros`, `valorTotal`, `ultimaCompraEm`
- `sorteioId`, `vendasIds`

Nao recomendado:

- `cpf`, `telefone` em leitura ampla de vendedor

## 3.7 Colecao `vendas/{vendaId}`

Obrigatorios:

- ids: `sorteioId`, `clienteId`, `vendedorId`
- espelho de nomes: `clienteNome`, `vendedorNome`
- bilhetes: `numero` (legado), `numeros[]`, `quantidade`
- financeiro: `valor`, `valorUnitario`, `valorTotal`, `formaPagamento`
- estado: `status` (fonte principal)
- compat: `statusPagamento`, `statusVenda` (enquanto migracao)
- datas: `criadoEm`, `confirmadoEm`, `canceladoEm`, `atualizadoEm`

Auditoria financeira:

- `comissaoAplicada`, `codigoTransacao`
- `canceladoPor`, `motivoCancelamento`

Estado canonico recomendado:

- `pendente`, `pago`, `cancelado`, `estornado`

## 3.8 Colecao `auditoria/{logId}`

Obrigatorios:

- `acao`, `detalhes`, `userId`, `timestamp`

Recomendados para v3:

- `entidadeTipo`, `entidadeId`
- `dadosRelevantes`
- `source` (`callable`, `scheduler`, `trigger`)
- `requestId` (correlacao)

## 4) Padroes tecnicos obrigatorios

- IDs imutaveis, sem semantic overload
- datas sempre em server timestamp
- valores monetarios em numero decimal padronizado (2 casas)
- status sempre via enum controlado
- versao de schema em `configuracoes/versao_banco`
- compatibilidade legada em fase de transicao (campos antigos mantidos)

## 5) Matriz de acesso (resumo)

- Admin:
  - leitura/escrita completa em negocio
- Vendedor:
  - leitura ampla de sorteio e disponibilidade
  - escrita apenas via Cloud Functions (nao direto em `vendas`)
- Cliente:
  - leitura do proprio perfil e dos proprios bilhetes
  - sem leitura de PII de terceiros
- `auditoria`:
  - leitura admin
  - escrita backend

## 6) Indices V3 recomendados

Minimos para o app atual + escala:

- `usuarios`: (`tipo`, `nome`) e (`tipo`, `status`, `nome`)
- `vendas`: (`vendedorId`, `criadoEm desc`)
- `vendas`: (`sorteioId`, `criadoEm desc`)
- `vendas`: (`vendedorId`, `status`, `criadoEm desc`)
- `vendas`: (`vendedorId`, `statusPagamento`, `criadoEm desc`)
- `vendas`: (`sorteioId`, `status`, `criadoEm desc`)
- `vendas`: (`sorteioId`, `statusPagamento`, `criadoEm desc`)
- `sorteios`: (`status`, `dataSorteio asc`) e (`status`, `dataSorteio desc`)
- `numeros` (collection group): (`clienteId`, `status`, `atualizadoEm desc`)
- `numeros` (collection group): (`status`, `numero`)
- `auditoria`: (`entidadeTipo`, `entidadeId`, `timestamp desc`)

## 7) Estrategia de migracao sem quebra

Fase 1 (segura):

- manter leitura do app atual
- manter `statusPagamento` e `statusVenda`
- garantir escrita backend sincronizando os 3 status

Fase 2 (higiene):

- parar de preencher CPF/telefone em `numeros` e `participantes`
- enriquecer `auditoria` com `entidadeTipo/entidadeId/source`

Fase 3 (consolidacao):

- front passa a consumir somente `vendas.status`
- congelar campos legados como somente leitura

Fase 4 (opcional futura):

- remover campos legados apos ciclo completo de versao

## 8) Melhorias imediatas de alto impacto

- blindar PII definitivamente em colecoes de alta leitura
- padronizar `status` como campo canonico unico
- ampliar cobertura de indices para queries reais de tela
- manter recalculo de metricas por callable e uso de `metrics/current`
- manter toda escrita critica via Cloud Functions (ja correto no projeto)

---

Esse V3 foi desenhado para o seu app atual, sem exigir reescrita total do front-end.
