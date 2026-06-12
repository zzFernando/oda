import * as d3 from "d3";

export function createNetworkGraph(container, { tooltip, onSelect = () => {} }) {
  const root = d3.select(container);
  const svg = root.append("svg").attr("aria-label", "Rede de relacoes arquivisticas").attr("role", "img");
  const viewport = svg.append("g");
  const linksLayer = viewport.append("g");
  const nodesLayer = viewport.append("g");
  let simulation;
  let lastData = { nodes: [], links: [] };

  const zoom = d3.zoom().scaleExtent([0.5, 5]).on("zoom", (event) => viewport.attr("transform", event.transform));
  svg.call(zoom);

  function render(data) {
    lastData = data;
    const { width, height } = container.getBoundingClientRect();
    svg.attr("viewBox", [0, 0, width, height]);
    root.selectAll(".empty-state").remove();

    if (!data.nodes.length) {
      root.append("div").attr("class", "empty-state").text("Sem relacoes para os filtros atuais");
      return;
    }

    if (simulation) simulation.stop();
    const color = d3.scaleOrdinal().domain(["produtor", "fundo"]).range(["#8a8a8a", "#d36f4b"]);
    const radius = d3.scaleSqrt().domain([0, d3.max(data.nodes, (d) => d.value) || 1]).range([6, 20]);

    const link = linksLayer
      .selectAll("line")
      .data(data.links, (d) => `${d.source}-${d.target}`)
      .join("line")
      .attr("stroke", "rgba(101,64,45,0.24)")
      .attr("stroke-width", (d) => Math.max(1, Math.sqrt(d.value) / 32));

    const node = nodesLayer
      .selectAll("circle")
      .data(data.nodes, (d) => d.id)
      .join((enter) =>
        enter
          .append("circle")
          .attr("r", 0)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1)
          .call((selection) => selection.transition().duration(420).attr("r", (d) => radius(d.value))),
      )
      .attr("fill", (d) => color(d.type))
      .on("click", (_, d) => onSelect(d))
      .on("mousemove", (event, d) =>
        tooltip.show(event, `<strong>${d.label}</strong><br>${d.type}<br>Documentos: ${d3.format(",.0f")(d.value)}`),
      )
      .on("mouseleave", tooltip.hide);

    const label = nodesLayer
      .selectAll("text")
      .data(data.nodes, (d) => d.id)
      .join("text")
      .attr("class", "node-label")
      .text((d) => d.label)
      .attr("dy", -12);

    simulation = d3
      .forceSimulation(data.nodes)
      .force(
        "link",
        d3
          .forceLink(data.links)
          .id((d) => d.id)
          .distance(80),
      )
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide((d) => radius(d.value) + 16))
      .on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        label.attr("x", (d) => d.x + 8).attr("y", (d) => d.y - 8);
      });
  }

  return {
    update: render,
    resetZoom() {
      svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
      render(lastData);
    },
    exportSvg() {
      return svg.node();
    },
  };
}
