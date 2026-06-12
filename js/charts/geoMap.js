import * as d3 from "d3";

const rsOutline = [
  [-57.6, -27.1],
  [-55.2, -27.0],
  [-52.2, -27.6],
  [-49.8, -29.0],
  [-49.7, -30.6],
  [-51.0, -32.8],
  [-53.8, -33.7],
  [-56.1, -32.5],
  [-57.8, -30.5],
  [-57.6, -27.1],
];

export function createGeoMap(container, { tooltip, onSelect = () => {} }) {
  const root = d3.select(container);
  const svg = root.append("svg").attr("aria-label", "Mapa do Rio Grande do Sul").attr("role", "img");
  const layer = svg.append("g");
  const mapLayer = layer.append("g");
  const pointsLayer = layer.append("g");
  let lastData = [];

  const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", (event) => layer.attr("transform", event.transform));
  svg.call(zoom);

  function render(data, animate = true) {
    lastData = data;
    const { width, height } = container.getBoundingClientRect();
    svg.attr("viewBox", [0, 0, width, height]);
    root.selectAll(".empty-state").remove();

    if (!data.length) {
      root.append("div").attr("class", "empty-state").text("Sem municipios para os filtros atuais");
      return;
    }

    const projection = d3
      .geoMercator()
      .fitExtent(
        [
          [28, 26],
          [width - 28, height - 28],
        ],
        { type: "Polygon", coordinates: [rsOutline] },
      );
    const path = d3.geoPath(projection);
    const radius = d3.scaleSqrt().domain([0, d3.max(data, (d) => d.documents) || 1]).range([5, 24]);
    const color = d3.scaleOrdinal().domain([...new Set(data.map((d) => d.regiao))]).range(["#d36f4b", "#65402d", "#8a8a8a", "#a97436", "#58735c"]);

    mapLayer
      .selectAll("path")
      .data([{ type: "Polygon", coordinates: [rsOutline] }])
      .join("path")
      .attr("d", path)
      .attr("fill", "rgba(211,111,75,0.08)")
      .attr("stroke", "rgba(101,64,45,0.42)")
      .attr("stroke-width", 1.4);

    const selection = pointsLayer.selectAll("circle").data(data, (d) => d.municipio);
    selection.exit().transition().duration(180).attr("r", 0).remove();
    selection
      .enter()
      .append("circle")
      .attr("r", 0)
      .attr("fill-opacity", 0.75)
      .attr("stroke", "#ffffff")
      .on("click", (_, d) => onSelect(d))
      .on("mousemove", (event, d) =>
        tooltip.show(
          event,
          `<strong>${d.municipio}</strong><br>Fundos: ${d.funds}<br>Instituicoes: ${d.instituicoes}<br>Documentos: ${d3.format(",.0f")(d.documents)}`,
        ),
      )
      .on("mouseleave", tooltip.hide)
      .merge(selection)
      .transition()
      .duration(animate ? 520 : 0)
      .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
      .attr("cy", (d) => projection([d.longitude, d.latitude])[1])
      .attr("r", (d) => radius(d.documents))
      .attr("fill", (d) => color(d.regiao));

    pointsLayer
      .selectAll("text")
      .data(data.filter((d) => d.documents > d3.quantile(data.map((x) => x.documents).sort(d3.ascending), 0.72)), (d) => d.municipio)
      .join("text")
      .attr("class", "map-label")
      .attr("x", (d) => projection([d.longitude, d.latitude])[0] + 10)
      .attr("y", (d) => projection([d.longitude, d.latitude])[1] - 8)
      .text((d) => d.municipio);
  }

  return {
    update: render,
    resetZoom() {
      svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
      render(lastData, false);
    },
    exportSvg() {
      return svg.node();
    },
  };
}
