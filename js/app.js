import * as d3 from "d3";
import { createBarChart } from "./charts/barChart.js";
import { createGeoMap } from "./charts/geoMap.js";
import { createLineChart } from "./charts/lineChart.js";
import { createNetworkGraph } from "./charts/networkGraph.js";
import { createSankeyFlow } from "./charts/sankeyFlow.js";
import { createScatterPlot } from "./charts/scatterPlot.js";
import { loadDashboardData } from "./utils/dataLoader.js";

const initialState = {
  period: "Todos",
  fund: "Todos",
  producer: "Todos",
  city: "Todos",
  theme: "Todos",
  type: "Todos",
  yearStart: 1850,
  yearEnd: 2026,
};

const state = {
  ...initialState,
  raw: null,
  filteredDocs: [],
};

const elements = {
  status: document.querySelector("#loadStatus"),
  periodFilter: document.querySelector("#periodFilter"),
  fundFilter: document.querySelector("#fundFilter"),
  producerFilter: document.querySelector("#producerFilter"),
  cityFilter: document.querySelector("#cityFilter"),
  themeFilter: document.querySelector("#themeFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  yearStart: document.querySelector("#yearStart"),
  yearEnd: document.querySelector("#yearEnd"),
  yearStartLabel: document.querySelector("#yearStartLabel"),
  yearEndLabel: document.querySelector("#yearEndLabel"),
  resetZoom: document.querySelector("#resetZoom"),
  resetFilters: document.querySelector("#resetFilters"),
  selectionStatus: document.querySelector("#selectionStatus"),
  kpiFunds: document.querySelector("#kpiFunds"),
  kpiDocs: document.querySelector("#kpiDocs"),
  kpiPeriod: document.querySelector("#kpiPeriod"),
  kpiProducers: document.querySelector("#kpiProducers"),
  kpiUsers: document.querySelector("#kpiUsers"),
  kpiConsultas: document.querySelector("#kpiConsultas"),
  tooltip: document.querySelector("#tooltip"),
};

const tooltip = {
  show(event, html) {
    elements.tooltip.innerHTML = html;
    elements.tooltip.style.left = `${event.clientX}px`;
    elements.tooltip.style.top = `${event.clientY}px`;
    elements.tooltip.style.opacity = 1;
  },
  hide() {
    elements.tooltip.style.opacity = 0;
  },
};

const charts = {
  bar: createBarChart(document.querySelector("#barChart"), {
    tooltip,
    onSelect: (d) => applyFilter("period", d.label),
  }),
  line: createLineChart(document.querySelector("#lineChart"), { tooltip }),
  scatter: createScatterPlot(document.querySelector("#scatterPlot"), {
    tooltip,
    onSelect: (d) => applyFilter("fund", d.fundo),
  }),
  network: createNetworkGraph(document.querySelector("#networkGraph"), {
    tooltip,
    onSelect: (d) => applyFilter(d.type === "produtor" ? "producer" : "fund", d.label),
  }),
  sankey: createSankeyFlow(document.querySelector("#sankeyFlow"), {
    tooltip,
    onSelect: (d) => applyFilter("theme", d.theme),
  }),
  map: createGeoMap(document.querySelector("#geoMap"), {
    tooltip,
    onSelect: (d) => applyFilter("city", d.municipio),
  }),
};

function number(value) {
  return Number(value ?? 0);
}

function buildOptions(select, values, first = "Todos") {
  select.replaceChildren(
    ...[first, ...values].map((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      return option;
    }),
  );
}

function syncControls() {
  elements.periodFilter.value = state.period;
  elements.fundFilter.value = state.fund;
  elements.producerFilter.value = state.producer;
  elements.cityFilter.value = state.city;
  elements.themeFilter.value = state.theme;
  elements.typeFilter.value = state.type;
  elements.yearStart.value = state.yearStart;
  elements.yearEnd.value = state.yearEnd;
  elements.yearStartLabel.textContent = state.yearStart;
  elements.yearEndLabel.textContent = state.yearEnd;
}

function applyFilter(key, value) {
  state[key] = value;
  syncControls();
  render();
}

function fundMeta() {
  return new Map(state.raw.fundos.map((row) => [row.nome_fundo, row]));
}

function getFilteredDocs() {
  const fundByName = fundMeta();
  const start = Math.min(state.yearStart, state.yearEnd);
  const end = Math.max(state.yearStart, state.yearEnd);

  return state.raw.documentos
    .map((row) => ({
      ...row,
      ano: number(row.ano),
      quantidade: number(row.quantidade),
      fundoMeta: fundByName.get(row.fundo),
    }))
    .filter((row) => row.ano >= start && row.ano <= end)
    .filter((row) => state.period === "Todos" || row.periodo_historico === state.period)
    .filter((row) => state.fund === "Todos" || row.fundo === state.fund)
    .filter((row) => state.producer === "Todos" || row.orgao_produtor === state.producer)
    .filter((row) => state.city === "Todos" || row.municipio === state.city)
    .filter((row) => state.theme === "Todos" || row.tema === state.theme)
    .filter((row) => state.type === "Todos" || row.tipologia === state.type);
}

function filteredConsultas() {
  const start = Math.min(state.yearStart, state.yearEnd);
  const end = Math.max(state.yearStart, state.yearEnd);
  return state.raw.consultas
    .map((row) => ({
      ...row,
      ano: number(row.ano),
      consultas: number(row.consultas),
      usuarios: number(row.usuarios),
    }))
    .filter((row) => row.ano >= start && row.ano <= end)
    .filter((row) => state.period === "Todos" || row.periodo_historico === state.period)
    .filter((row) => state.fund === "Todos" || row.fundo === state.fund)
    .filter((row) => state.producer === "Todos" || row.orgao_produtor === state.producer)
    .filter((row) => state.city === "Todos" || row.municipio === state.city)
    .filter((row) => state.theme === "Todos" || row.tema === state.theme)
    .filter((row) => state.type === "Todos" || row.tipologia === state.type);
}

function updateKpis(docs, consultas) {
  const fundCount = new Set(docs.map((d) => d.fundo)).size;
  const producerCount = new Set(docs.map((d) => d.orgao_produtor)).size;
  const totalDocs = d3.sum(docs, (d) => d.quantidade);
  const years = docs.map((d) => d.ano);
  const period = years.length ? `${d3.min(years)}-${d3.max(years)}` : "0";
  const users = d3.sum(consultas, (d) => d.usuarios);
  const consultasTotal = d3.sum(consultas, (d) => d.consultas);

  elements.kpiFunds.textContent = d3.format(",.0f")(fundCount);
  elements.kpiDocs.textContent = d3.format(",.0f")(totalDocs);
  elements.kpiPeriod.textContent = period;
  elements.kpiProducers.textContent = d3.format(",.0f")(producerCount);
  elements.kpiUsers.textContent = d3.format(",.0f")(users);
  elements.kpiConsultas.textContent = d3.format(",.0f")(consultasTotal);
  elements.selectionStatus.textContent = `${d3.format(",.0f")(docs.length)} registros documentais filtrados`;
}

function dataForLine(docs, consultas) {
  const docsByYear = d3.rollup(
    docs,
    (items) => d3.sum(items, (d) => d.quantidade),
    (d) => d.ano,
  );
  const consultasByYear = d3.rollup(
    consultas,
    (items) => d3.sum(items, (d) => d.consultas),
    (d) => d.ano,
  );
  const years = [...new Set([...docsByYear.keys(), ...consultasByYear.keys()])].sort(d3.ascending);
  let accumulated = 0;
  return years.map((year) => {
    accumulated += docsByYear.get(year) ?? 0;
    return {
      year,
      documents: accumulated,
      consultas: consultasByYear.get(year) ?? 0,
    };
  });
}

function dataForPeriods(docs) {
  return d3
    .rollups(
      docs,
      (items) => d3.sum(items, (d) => d.quantidade),
      (d) => d.periodo_historico,
    )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => d3.descending(a.value, b.value));
}

function dataForNetwork(docs) {
  const producerValues = d3.rollup(
    docs,
    (items) => d3.sum(items, (d) => d.quantidade),
    (d) => d.orgao_produtor,
  );
  const fundValues = d3.rollup(
    docs,
    (items) => d3.sum(items, (d) => d.quantidade),
    (d) => d.fundo,
  );
  const linkValues = d3.rollups(
    docs,
    (items) => d3.sum(items, (d) => d.quantidade),
    (d) => d.orgao_produtor,
    (d) => d.fundo,
  );

  const nodes = [
    ...[...producerValues].map(([label, value]) => ({ id: `p:${label}`, label, value, type: "produtor" })),
    ...[...fundValues].map(([label, value]) => ({ id: `f:${label}`, label, value, type: "fundo" })),
  ];
  const links = linkValues.flatMap(([producer, funds]) =>
    funds.map(([fund, value]) => ({ source: `p:${producer}`, target: `f:${fund}`, value })),
  );
  return { nodes, links };
}

function dataForSankey(docs) {
  const stages = [
    ["Producao", "Transferencia"],
    ["Transferencia", "Recolhimento"],
    ["Recolhimento", "Destinacao"],
  ];
  const byTheme = d3.rollups(
    docs,
    (items) => d3.sum(items, (d) => d.quantidade),
    (d) => d.tema,
  );
  return byTheme.flatMap(([theme, value]) =>
    stages.map(([source, target], index) => ({
      theme,
      source,
      target,
      value: Math.round(value * [1, 0.72, 0.46][index]),
    })),
  );
}

function dataForMap(docs) {
  const cityMeta = new Map(state.raw.municipios.map((row) => [row.municipio, row]));
  return d3
    .rollups(
      docs,
      (items) => ({
        documents: d3.sum(items, (d) => d.quantidade),
        funds: new Set(items.map((d) => d.fundo)).size,
        instituicoes: new Set(items.map((d) => d.orgao_produtor)).size,
      }),
      (d) => d.municipio,
    )
    .map(([municipio, metrics]) => ({
      municipio,
      ...metrics,
      regiao: cityMeta.get(municipio)?.regiao ?? "RS",
      latitude: number(cityMeta.get(municipio)?.latitude),
      longitude: number(cityMeta.get(municipio)?.longitude),
    }))
    .filter((d) => d.latitude && d.longitude);
}

function dataForSemantic(docs) {
  const fundByName = fundMeta();
  return d3
    .rollups(
      docs,
      (items) => d3.sum(items, (d) => d.quantidade),
      (d) => d.fundo,
      (d) => d.tema,
      (d) => d.cluster,
    )
    .flatMap(([fundo, themes]) =>
      themes.flatMap(([tema, clusters]) =>
        clusters.map(([cluster, documents]) => {
          const meta = fundByName.get(fundo) ?? {};
          return {
            fundo,
            tema,
            cluster,
            documents,
            x: number(meta.umap_x),
            y: number(meta.umap_y),
          };
        }),
      ),
    );
}

function render() {
  const docs = getFilteredDocs();
  const consultas = filteredConsultas();
  state.filteredDocs = docs;

  updateKpis(docs, consultas);
  charts.line.update(dataForLine(docs, consultas));
  charts.bar.update(dataForPeriods(docs));
  charts.network.update(dataForNetwork(docs));
  charts.sankey.update(dataForSankey(docs));
  charts.map.update(dataForMap(docs));
  charts.scatter.update(dataForSemantic(docs));
}

function bindEvents() {
  const bindings = [
    ["period", elements.periodFilter],
    ["fund", elements.fundFilter],
    ["producer", elements.producerFilter],
    ["city", elements.cityFilter],
    ["theme", elements.themeFilter],
    ["type", elements.typeFilter],
  ];
  for (const [key, element] of bindings) {
    element.addEventListener("change", (event) => {
      state[key] = event.target.value;
      render();
    });
  }
  elements.yearStart.addEventListener("input", (event) => {
    state.yearStart = Number(event.target.value);
    syncControls();
    render();
  });
  elements.yearEnd.addEventListener("input", (event) => {
    state.yearEnd = Number(event.target.value);
    syncControls();
    render();
  });
  elements.resetFilters.addEventListener("click", () => {
    Object.assign(state, initialState);
    syncControls();
    render();
  });
  elements.resetZoom.addEventListener("click", () => {
    Object.values(charts).forEach((chart) => chart.resetZoom());
  });
  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => exportCurrent(button.dataset.export));
  });
  window.addEventListener("resize", () => render());
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportCurrent(type) {
  if (type === "csv") {
    const rows = state.filteredDocs;
    const header = ["ano", "periodo_historico", "fundo", "orgao_produtor", "municipio", "tema", "tipologia", "quantidade"];
    const csv = [
      header.join(","),
      ...rows.map((row) => header.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(",")),
    ].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "apers-dados-filtrados.csv");
    return;
  }

  const svg = charts.line.exportSvg().cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    .axis path,.axis line{stroke:#ded8d2}
    .axis text,.legend{fill:#6f6f6f;font:12px sans-serif}
    .grid-line{stroke:rgba(67,45,31,.10)}
  `;
  svg.insertBefore(style, svg.firstChild);
  const source = new XMLSerializer().serializeToString(svg);

  if (type === "svg") {
    downloadBlob(new Blob([source], { type: "image/svg+xml;charset=utf-8" }), "apers-evolucao-anual.svg");
    return;
  }

  const image = new Image();
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = svg.viewBox.baseVal.width || 1200;
    canvas.height = svg.viewBox.baseVal.height || 720;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => downloadBlob(blob, "apers-evolucao-anual.png"));
  };
  image.src = url;
}

function hydrateOptions() {
  const { fundos, produtores, municipios, documentos } = state.raw;
  const periods = [...new Set(documentos.map((d) => d.periodo_historico))].sort();
  const themes = [...new Set(documentos.map((d) => d.tema))].sort();
  const types = [...new Set(documentos.map((d) => d.tipologia))].sort();

  buildOptions(elements.periodFilter, periods);
  buildOptions(elements.fundFilter, fundos.map((d) => d.nome_fundo).sort());
  buildOptions(elements.producerFilter, produtores.map((d) => d.nome_produtor).sort());
  buildOptions(elements.cityFilter, municipios.map((d) => d.municipio).sort());
  buildOptions(elements.themeFilter, themes);
  buildOptions(elements.typeFilter, types);
}

async function init() {
  try {
    state.raw = await loadDashboardData();
    hydrateOptions();
    bindEvents();
    syncControls();
    render();
    elements.status.textContent = "Dados carregados";
  } catch (error) {
    console.error(error);
    elements.status.textContent = "Erro ao carregar dados";
    document.querySelector(".main").insertAdjacentHTML(
      "afterbegin",
      `<section class="viz-panel" style="padding:16px;margin-bottom:18px;">${error.message}</section>`,
    );
  }
}

init();
