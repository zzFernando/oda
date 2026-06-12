import * as d3 from "d3";

export function createBarChart(container, { tooltip, onSelect = () => {} }) {
  const root = d3.select(container);
  const svg = root.append("svg").attr("aria-label", "Distribuicao documental").attr("role", "img");
  const layer = svg.append("g");
  const grid = layer.append("g");
  const bars = layer.append("g");
  const xAxis = svg.append("g").attr("class", "axis");
  const yAxis = svg.append("g").attr("class", "axis");
  const margin = { top: 18, right: 22, bottom: 82, left: 78 };
  let currentTransform = d3.zoomIdentity;
  let lastData = [];

  const zoom = d3
    .zoom()
    .scaleExtent([1, 8])
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
    layer.attr("transform", `translate(${margin.left},${margin.top})`);

    const xBase = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.28);
    const x = currentTransform.rescaleX(d3.scaleLinear().domain([0, data.length]).range([0, innerWidth]));
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value) || 1]).nice().range([innerHeight, 0]);

    grid
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""))
      .selectAll("line")
      .attr("class", "grid-line");
    grid.selectAll("path").remove();

    xAxis
      .attr("transform", `translate(${margin.left},${margin.top + innerHeight})`)
      .call(d3.axisBottom(xBase))
      .selectAll("text")
      .attr("transform", "rotate(-34)")
      .style("text-anchor", "end");
    yAxis.attr("transform", `translate(${margin.left},${margin.top})`).call(d3.axisLeft(y).ticks(5, "~s"));

    const selection = bars.selectAll("rect").data(data, (d) => d.label);
    selection.exit().transition().duration(180).attr("y", innerHeight).attr("height", 0).remove();

    selection
      .enter()
      .append("rect")
      .attr("rx", 4)
      .attr("x", (_, i) => x(i) + xBase.bandwidth() * 0.12)
      .attr("width", Math.max(2, xBase.bandwidth() * currentTransform.k * 0.76))
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", "#d36f4b")
      .on("click", (_, d) => onSelect(d))
      .on("mousemove", (event, d) =>
        tooltip.show(event, `<strong>${d.label}</strong><br>Documentos: ${d3.format(",.0f")(d.value)}`),
      )
      .on("mouseleave", tooltip.hide)
      .merge(selection)
      .transition()
      .duration(animate ? 520 : 0)
      .attr("x", (_, i) => x(i) + xBase.bandwidth() * 0.12)
      .attr("width", Math.max(2, xBase.bandwidth() * currentTransform.k * 0.76))
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => innerHeight - y(d.value));
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
