import * as d3 from "d3";

export function createLineChart(container, { tooltip }) {
  const root = d3.select(container);
  const svg = root.append("svg").attr("aria-label", "Evolucao anual").attr("role", "img");
  const margin = { top: 18, right: 34, bottom: 48, left: 78 };
  const plot = svg.append("g");
  const grid = svg.append("g");
  const docsPath = plot.append("path").attr("fill", "none").attr("stroke", "#65402d").attr("stroke-width", 2.8);
  const consultPath = plot.append("path").attr("fill", "none").attr("stroke", "#d36f4b").attr("stroke-width", 2.4);
  const dots = plot.append("g");
  const xAxis = svg.append("g").attr("class", "axis");
  const yAxis = svg.append("g").attr("class", "axis");
  const legend = svg.append("g");
  let lastData = [];
  let currentTransform = d3.zoomIdentity;

  const zoom = d3
    .zoom()
    .scaleExtent([1, 12])
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
    const xBase = d3.scaleLinear().domain(d3.extent(data, (d) => d.year)).range([0, innerWidth]);
    const x = currentTransform.rescaleX(xBase);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => Math.max(d.documents, d.consultas)) || 1])
      .nice()
      .range([innerHeight, 0]);
    const line = (key) =>
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d[key]))
        .curve(d3.curveMonotoneX);

    plot.attr("transform", `translate(${margin.left},${margin.top})`);
    grid
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""))
      .selectAll("line")
      .attr("class", "grid-line");
    grid.selectAll("path").remove();

    xAxis
      .attr("transform", `translate(${margin.left},${margin.top + innerHeight})`)
      .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format("d")));
    yAxis.attr("transform", `translate(${margin.left},${margin.top})`).call(d3.axisLeft(y).ticks(5, "~s"));

    docsPath.datum(data).transition().duration(animate ? 560 : 0).attr("d", line("documents"));
    consultPath.datum(data).transition().duration(animate ? 560 : 0).attr("d", line("consultas"));

    const pointData = data.flatMap((d) => [
      { ...d, metric: "Documentos", value: d.documents, color: "#65402d" },
      { ...d, metric: "Consultas", value: d.consultas, color: "#d36f4b" },
    ]);
    const selection = dots.selectAll("circle").data(pointData, (d) => `${d.metric}-${d.year}`);
    selection.exit().remove();
    selection
      .enter()
      .append("circle")
      .attr("r", 0)
      .on("mousemove", (event, d) =>
        tooltip.show(event, `<strong>${d.metric} em ${d.year}</strong><br>${d3.format(",.0f")(d.value)}`),
      )
      .on("mouseleave", tooltip.hide)
      .merge(selection)
      .transition()
      .duration(animate ? 420 : 0)
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.value))
      .attr("r", 3.5)
      .attr("fill", (d) => d.color);

    legend.attr("transform", `translate(${margin.left},${Math.max(12, margin.top - 2)})`);
    legend
      .selectAll("text")
      .data(["Documentos acumulados", "Consultas anuais"])
      .join("text")
      .attr("class", "legend")
      .attr("x", (_, i) => i * 170)
      .attr("y", 0)
      .attr("fill", (_, i) => (i === 0 ? "#65402d" : "#d36f4b"))
      .text((d) => d);
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
