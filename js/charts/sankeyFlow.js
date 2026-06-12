import * as d3 from "d3";

export function createSankeyFlow(container, { tooltip, onSelect = () => {} }) {
  const root = d3.select(container);
  const svg = root.append("svg").attr("aria-label", "Fluxo documental").attr("role", "img");
  const layer = svg.append("g");
  const margin = { top: 18, right: 22, bottom: 22, left: 22 };
  let lastData = [];
  let currentTransform = d3.zoomIdentity;

  const stages = ["Producao", "Transferencia", "Recolhimento", "Destinacao"];
  const zoom = d3.zoom().scaleExtent([0.75, 5]).on("zoom", (event) => {
    currentTransform = event.transform;
    layer.attr("transform", currentTransform);
  });
  svg.call(zoom);

  function render(data, animate = true) {
    lastData = data;
    const { width, height } = container.getBoundingClientRect();
    svg.attr("viewBox", [0, 0, width, height]);
    root.selectAll(".empty-state").remove();
    layer.attr("transform", currentTransform);

    if (!data.length) {
      root.append("div").attr("class", "empty-state").text("Sem fluxos para os filtros atuais");
      return;
    }

    const innerWidth = Math.max(1, width - margin.left - margin.right);
    const innerHeight = Math.max(1, height - margin.top - margin.bottom);
    const stageX = d3.scalePoint().domain(stages).range([margin.left + 40, margin.left + innerWidth - 40]);
    const maxValue = d3.max(data, (d) => d.value) || 1;
    const widthScale = d3.scaleSqrt().domain([0, maxValue]).range([2, 24]);
    const color = d3.scaleOrdinal().domain([...new Set(data.map((d) => d.theme))]).range(["#d36f4b", "#65402d", "#8a8a8a", "#a97436", "#58735c"]);
    const yByTheme = d3
      .scalePoint()
      .domain([...new Set(data.map((d) => d.theme))])
      .range([margin.top + 56, margin.top + innerHeight - 42]);

    const stageLabels = layer
      .selectAll("text.stage")
      .data(stages)
      .join("text")
      .attr("class", "legend stage")
      .attr("x", (d) => stageX(d))
      .attr("y", margin.top + 10)
      .attr("text-anchor", "middle")
      .text((d) => d);

    const links = layer.selectAll("path.flow").data(data, (d) => `${d.theme}-${d.source}-${d.target}`);
    links
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "flow")
            .attr("fill", "none")
            .attr("stroke-opacity", 0)
            .attr("stroke-linecap", "round"),
        (update) => update,
        (exit) => exit.transition().duration(180).attr("stroke-opacity", 0).remove(),
      )
      .on("click", (_, d) => onSelect(d))
      .on("mousemove", (event, d) =>
        tooltip.show(event, `<strong>${d.theme}</strong><br>${d.source} -> ${d.target}<br>${d3.format(",.0f")(d.value)} documentos`),
      )
      .on("mouseleave", tooltip.hide)
      .transition()
      .duration(animate ? 520 : 0)
      .attr("stroke", (d) => color(d.theme))
      .attr("stroke-opacity", 0.58)
      .attr("stroke-width", (d) => widthScale(d.value))
      .attr("d", (d) => {
        const x1 = stageX(d.source);
        const x2 = stageX(d.target);
        const y = yByTheme(d.theme);
        const offset = (stages.indexOf(d.source) - 1.5) * 5;
        return `M${x1},${y + offset} C${(x1 + x2) / 2},${y - 40 + offset} ${(x1 + x2) / 2},${y + 40 + offset} ${x2},${y + offset}`;
      });

    const nodes = stages.flatMap((stage) =>
      [...new Set(data.map((d) => d.theme))].map((theme) => ({
        id: `${stage}-${theme}`,
        stage,
        theme,
        value: d3.sum(data.filter((d) => d.theme === theme && (d.source === stage || d.target === stage)), (d) => d.value),
      })),
    );

    layer
      .selectAll("circle.flow-node")
      .data(nodes, (d) => d.id)
      .join("circle")
      .attr("class", "flow-node")
      .attr("cx", (d) => stageX(d.stage))
      .attr("cy", (d) => yByTheme(d.theme))
      .attr("r", (d) => (d.value > 0 ? Math.max(4, widthScale(d.value) / 2) : 0))
      .attr("fill", (d) => color(d.theme))
      .attr("stroke", "#ffffff");

    stageLabels.raise();
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
