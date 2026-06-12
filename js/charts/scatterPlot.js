import * as d3 from "d3";

export function createScatterPlot(container, { tooltip, onSelect = () => {} }) {
  const root = d3.select(container);
  const svg = root.append("svg").attr("aria-label", "UMAP semantico").attr("role", "img");
  const margin = { top: 18, right: 28, bottom: 54, left: 62 };
  const plot = svg.append("g");
  const grid = svg.append("g");
  const points = plot.append("g");
  const xAxis = svg.append("g").attr("class", "axis");
  const yAxis = svg.append("g").attr("class", "axis");
  let lastData = [];
  let currentTransform = d3.zoomIdentity;

  const zoom = d3
    .zoom()
    .scaleExtent([1, 14])
    .on("zoom", (event) => {
      currentTransform = event.transform;
      render(lastData, false);
    });

  svg.call(zoom);

  function render(data, animate = true) {
    lastData = data;
    const { width, height } = container.getBoundingClientRect();
    svg.attr("viewBox", [0, 0, width, height]);
    root.selectAll(".empty-state").remove();

    if (!data.length) {
      root.append("div").attr("class", "empty-state").text("Sem dados para os filtros atuais");
      return;
    }

    const innerWidth = Math.max(1, width - margin.left - margin.right);
    const innerHeight = Math.max(1, height - margin.top - margin.bottom);
    const xBase = d3.scaleLinear().domain(d3.extent(data, (d) => d.x)).nice().range([0, innerWidth]);
    const x = currentTransform.rescaleX(xBase);
    const y = d3.scaleLinear().domain(d3.extent(data, (d) => d.y)).nice().range([innerHeight, 0]);
    const radius = d3.scaleSqrt().domain([0, d3.max(data, (d) => d.documents) || 1]).range([5, 18]);
    const color = d3
      .scaleOrdinal()
      .domain([...new Set(data.map((d) => d.cluster))])
      .range(["#d36f4b", "#65402d", "#8a8a8a", "#a97436", "#58735c", "#4f6f88"]);

    plot.attr("transform", `translate(${margin.left},${margin.top})`);
    grid
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""))
      .selectAll("line")
      .attr("class", "grid-line");
    grid.selectAll("path").remove();

    xAxis.attr("transform", `translate(${margin.left},${margin.top + innerHeight})`).call(d3.axisBottom(x).ticks(5));
    yAxis.attr("transform", `translate(${margin.left},${margin.top})`).call(d3.axisLeft(y).ticks(5));

    const selection = points.selectAll("circle").data(data, (d) => d.fundo);
    selection.exit().transition().duration(180).attr("r", 0).remove();
    selection
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.x))
      .attr("cy", innerHeight)
      .attr("r", 0)
      .attr("fill-opacity", 0.78)
      .attr("stroke", "#ffffff")
      .on("click", (_, d) => onSelect(d))
      .on("mousemove", (event, d) =>
        tooltip.show(
          event,
          `<strong>${d.fundo}</strong><br>Tema: ${d.tema}<br>Cluster: ${d.cluster}<br>Documentos: ${d3.format(",.0f")(d.documents)}`,
        ),
      )
      .on("mouseleave", tooltip.hide)
      .merge(selection)
      .transition()
      .duration(animate ? 520 : 0)
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", (d) => radius(d.documents))
      .attr("fill", (d) => color(d.cluster));
  }

  return {
    update: render,
    resetZoom() {
      svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
    },
    exportSvg() {
      return svg.node();
    },
  };
}
