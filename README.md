# Observatorio de Dados Arquivisticos APERS

Modulo estatico de Visual Analytics pensado para ser publicado como uma aba/rota do site
existente do APERS, por exemplo:

```text
https://apers.rs.gov.br/oda
```

A proposta nao substitui o portal institucional. Ela complementa a navegacao atual, a pesquisa
textual, os servicos e as paginas de acervo com uma area analitica focada em exploracao visual,
transparencia publica e descoberta de informacoes.

## Executar localmente

```bash
python3 -m http.server 8000
```

Acesse:

```text
http://localhost:8000
```

Em producao, publique esta pasta como o conteudo da rota `/oda`. Os caminhos de assets usam
referencias relativas (`./css`, `./js`, `./data`) para funcionar corretamente quando o dashboard
estiver hospedado em `https://apers.rs.gov.br/oda`.

## Estrutura

```text
.
├── index.html
├── assets/
│   └── icons/
│       └── observatorio.png
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── charts/
│   │   ├── barChart.js
│   │   ├── geoMap.js
│   │   ├── lineChart.js
│   │   ├── networkGraph.js
│   │   ├── sankeyFlow.js
│   │   └── scatterPlot.js
│   └── utils/
│       └── dataLoader.js
└── data/
    ├── fundos.parquet
    ├── documentos.parquet
    ├── produtores.parquet
    ├── municipios.parquet
    ├── temporalidade.parquet
    └── consultas.parquet
```

## Visualizacoes

- Painel executivo com fundos, documentos, periodo coberto, produtores, usuarios e consultas.
- Crescimento temporal do acervo e evolucao anual de consultas.
- Distribuicao documental por periodo historico.
- Rede de orgaos produtores e fundos documentais.
- Fluxo documental em etapas de producao, transferencia, recolhimento e destinacao.
- Mapa esquematico do Rio Grande do Sul com distribuicao municipal.
- UMAP semantico simulado para exploracao de temas e clusters.

## Arquitetura

- `dataLoader.js` concentra leitura Parquet via `parquet-wasm` e Apache Arrow.
- `app.js` aplica filtros globais, transformacoes, cross-filtering e exportacoes.
- Cada grafico D3 e um modulo independente em `js/charts/`.
- O cache em memoria evita recarregar arquivos ja solicitados.

## Evolucao prevista

Um pipeline Python pode gerar os Parquet em `data/` a partir de sistemas arquivisticos.
Uma GitHub Action pode executar o ETL em agenda, versionar os artefatos e publicar o site
estatico no GitHub Pages. Como a camada visual depende apenas dos arquivos locais, a troca
de dados manuais por dados automatizados nao exige backend.

Evite bibliotecas de graficos prontas como Chart.js, ECharts, Recharts ou Plotly. Toda a
renderizacao visual deve ser feita diretamente com D3.

## Creditos de assets

O simbolo de observatorio usado no cabecalho da rota `/oda` foi baixado a partir do link
fornecido do Flaticon:

```text
https://www.flaticon.com/br/icone-gratis/observatorio_124552
```

Antes de publicar em producao, confirme a atribuicao/licenca exigida pela conta ou plano usado
no Flaticon.
