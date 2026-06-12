import * as arrow from "apache-arrow";
import initParquet, { readParquet } from "parquet-wasm";

const cache = new Map();
let parquetReady;

async function ensureParquetRuntime() {
  if (!parquetReady) {
    const wasmUrl = "https://cdn.jsdelivr.net/npm/parquet-wasm@0.6.0/esm/parquet_wasm_bg.wasm";
    parquetReady = initParquet(wasmUrl);
  }
  return parquetReady;
}

function arrowTableToRows(table) {
  const fields = table.schema.fields.map((field) => ({
    name: field.name,
    vector: table.getChild(field.name),
  }));
  const rows = [];
  for (let index = 0; index < table.numRows; index += 1) {
    const record = {};
    for (const field of fields) {
      const value = field.vector?.get(index);
      record[field.name] = value instanceof Date ? value : value?.toString?.() ?? value;
    }
    rows.push(record);
  }
  return rows;
}

function normalizeValue(value) {
  if (value instanceof Date) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return value;
}

function normalizeRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeValue(value)])),
  );
}

export async function loadParquet(path) {
  if (cache.has(path)) return cache.get(path);

  const promise = (async () => {
    await ensureParquetRuntime();
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Nao foi possivel carregar ${path}: ${response.status}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const wasmTable = readParquet(bytes);
    const table = arrow.tableFromIPC(wasmTable.intoIPCStream());
    return normalizeRows(arrowTableToRows(table));
  })();

  cache.set(path, promise);
  return promise;
}

export async function loadDashboardData() {
  const [fundos, documentos, produtores, municipios, temporalidade, consultas] = await Promise.all([
    loadParquet("./data/fundos.parquet"),
    loadParquet("./data/documentos.parquet"),
    loadParquet("./data/produtores.parquet"),
    loadParquet("./data/municipios.parquet"),
    loadParquet("./data/temporalidade.parquet"),
    loadParquet("./data/consultas.parquet"),
  ]);

  return { fundos, documentos, produtores, municipios, temporalidade, consultas };
}

export function clearDataCache() {
  cache.clear();
}

/*
  Evolucao prevista:
  - Um pipeline Python pode gerar os arquivos Parquet usando pandas/pyarrow e gravar em /data.
  - GitHub Actions pode executar esse pipeline em agendamento cron, commitar os Parquet
    atualizados e publicar o site estatico no GitHub Pages.
  - Como o dashboard consome apenas loadDashboardData(), a troca de arquivos locais por
    artefatos automatizados nao exige mudancas nos modulos de graficos.
  - Integracoes futuras com sistemas arquivisticos podem materializar CSV/Parquet por
    assunto, fundo, municipio ou orgao produtor sem introduzir backend no portal.
*/
