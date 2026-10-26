const sql = require('mssql');
const configManager = require('./configManager.cjs');

function getSqlConfig(options = {}) {
  const cfg = configManager.getConfig(options);
  return {
    user: cfg.dbUser || '',
    password: cfg.dbPassword || '',
    server: cfg.dbServer || '',
    database: cfg.dbDatabase || '',
    port: Number(cfg.dbPort) || 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 4000,
      requestTimeout: 8000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

let pool = null;

async function getPool() {
  if (pool && pool.connected) return pool;
  const sqlCfg = getSqlConfig();
  if (!sqlCfg.server || !sqlCfg.user || !sqlCfg.password) {
    throw new Error('Configuración SQL no inicializada. Requiere autenticación corporativa.');
  }
  pool = await sql.connect(sqlCfg);
  return pool;
}

function setPool(p) {
  pool = p;
}

function resetPool() {
  pool = null;
}

async function checkStatus() {
  const sqlCfg = getSqlConfig();
  try {
    const p = await service.getPool();
    await p.request().query('SELECT 1 as alive');
    return {
      connected: true,
      server: sqlCfg.server,
      database: sqlCfg.database,
      mode: 'sql',
    };
  } catch (err) {
    return {
      connected: false,
      server: sqlCfg.server || 'No configurado',
      database: sqlCfg.database || 'No configurada',
      mode: 'mock',
      error: err.message,
    };
  }
}

async function resolvePcFromIp(ip) {
  try {
    const p = await service.getPool();
    const r1 = await p
      .request()
      .input('ip', sql.VarChar(50), ip)
      .query('SELECT TOP 1 pc FROM Fecha_Relevada_PCs WHERE ip = @ip ORDER BY Fecha_Relevada DESC');
    if (r1.recordset && r1.recordset.length > 0 && r1.recordset[0].pc) {
      return r1.recordset[0].pc.trim();
    }
  } catch {
    // ignore
  }
  return null;
}

async function getTerminalInfo(query) {
  if (!query || !query.trim()) return null;
  const p = await service.getPool();
  let targetPc = query.trim();

  // If query is an IP, attempt resolving Hostname first
  const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(targetPc);
  if (isIp) {
    const resolved = await resolvePcFromIp(targetPc);
    if (resolved) {
      targetPc = resolved;
    }
  }

  // 1. CMDA_Trae_Info_DE_PC_PARAmesa_T
  const infoReq = p.request();
  infoReq.input('pc', sql.VarChar(100), targetPc);
  const infoRes = await infoReq.execute('CMDA_Trae_Info_DE_PC_PARAmesa_T');

  if (!infoRes.recordset || infoRes.recordset.length === 0) {
    return null;
  }
  const mainData = infoRes.recordset[0];

  // 2. Cmda_Trae_Datos_De_Ubicacion_Y_cpa_centro_Costo_T
  let location = '';
  let costCenter = '';
  try {
    const locReq = p.request();
    locReq.input('pc', sql.VarChar(100), targetPc);
    const locRes = await locReq.execute('Cmda_Trae_Datos_De_Ubicacion_Y_cpa_centro_Costo_T');
    if (locRes.recordset && locRes.recordset.length > 0) {
      const row = locRes.recordset[0];
      location = row.Ubicacion || row.ubicacion || row.Direccion || '';
      costCenter = row.Centro_Costo || row.centro_costo || row.cpa || '';
    }
  } catch {
    // optional location info
  }

  // 3. cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T
  const alerts = [];
  try {
    const alertReq = p.request();
    alertReq.input('terminal', sql.VarChar(100), targetPc);
    const alertRes = await alertReq.execute('cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T');
    if (alertRes.recordset) {
      for (const row of alertRes.recordset) {
        alerts.push({
          id: String(row.id || Math.random()),
          title: row.Titulo || row.titulo || 'Alerta Operativa',
          description: row.Descripcion || row.descripcion || '',
          operator: row.Operador || row.operador || 'Sistema',
          date: row.Fecha || row.fecha || '',
          active: true,
        });
      }
    }
  } catch {
    // optional alert info
  }

  // 4. CMDA_Trae_historial_De_REset_DE_UNA_PC_T
  const resetHistory = [];
  try {
    const resetReq = p.request();
    resetReq.input('pc', sql.VarChar(100), targetPc);
    const resetRes = await resetReq.execute('CMDA_Trae_historial_De_REset_DE_UNA_PC_T');
    if (resetRes.recordset) {
      for (const row of resetRes.recordset) {
        resetHistory.push({
          id: String(row.id || Math.random()),
          date: row.Fecha || row.fecha || '',
          operator: row.Operador || row.operador || '',
          reason: row.Motivo || row.motivo || '',
          result: row.Resultado || row.resultado || '',
        });
      }
    }
  } catch {
    // optional reset history
  }

  // 5. Cmda_trae_historial_UptimeXterminal_T
  let uptimeText = '';
  try {
    const uptimeReq = p.request();
    uptimeReq.input('terminal', sql.VarChar(100), targetPc);
    const uptimeRes = await uptimeReq.execute('Cmda_trae_historial_UptimeXterminal_T');
    if (uptimeRes.recordset && uptimeRes.recordset.length > 0) {
      const uRow = uptimeRes.recordset[0];
      uptimeText = uRow.Uptime || uRow.uptime || uRow.TiempoActivo || uRow.Fecha || '';
    }
  } catch {
    // optional uptime history
  }

  return {
    ...mainData,
    location,
    costCenter,
    alerts,
    resetHistory,
    uptimeText: uptimeText || mainData.uptimeText || '',
  };
}

const service = {
  get config() {
    return getSqlConfig();
  },
  getSqlConfig,
  getPool,
  setPool,
  resetPool,
  checkStatus,
  resolvePcFromIp,
  getTerminalInfo,
};

module.exports = service;
