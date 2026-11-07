let sql = null;
const configManager = require('./configManager.cjs');

function getSqlModule() {
  if (!sql) {
    sql = require('mssql');
  }
  return sql;
}

function isMssqlLoaded() {
  return sql !== null;
}

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
  const sqlMod = getSqlModule();
  pool = await sqlMod.connect(sqlCfg);
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
    const sqlMod = getSqlModule();
    const r1 = await p
      .request()
      .input('ip', sqlMod.VarChar(50), ip)
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
  const sqlMod = getSqlModule();
  infoReq.input('pc', sqlMod.VarChar(100), targetPc);
  const infoRes = await infoReq.execute('CMDA_Trae_Info_DE_PC_PARAmesa_T');

  if (!infoRes.recordset || infoRes.recordset.length === 0) {
    return null;
  }
  const mainData = infoRes.recordset[0];

  // 2. Ejecución concurrente de Stored Procedures secundarios (Promise.allSettled)
  const fetchLocation = async () => {
    try {
      const locReq = p.request();
      locReq.input('pc', sqlMod.VarChar(100), targetPc);
      const locRes = await locReq.execute('Cmda_Trae_Datos_De_Ubicacion_Y_cpa_centro_Costo_T');
      if (locRes.recordset && locRes.recordset.length > 0) {
        const row = locRes.recordset[0];
        return {
          location: row.Ubicacion || row.ubicacion || row.Direccion || '',
          costCenter: row.Centro_Costo || row.centro_costo || row.cpa || '',
        };
      }
    } catch {
      // optional location info
    }
    return { location: '', costCenter: '' };
  };

  const fetchAlerts = async () => {
    const alertsList = [];
    try {
      const alertReq = p.request();
      alertReq.input('terminal', sqlMod.VarChar(100), targetPc);
      const alertRes = await alertReq.execute('cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T');
      if (alertRes.recordset) {
        for (const row of alertRes.recordset) {
          alertsList.push({
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
    return alertsList;
  };

  const fetchResets = async () => {
    const resetList = [];
    try {
      const resetReq = p.request();
      resetReq.input('pc', sqlMod.VarChar(100), targetPc);
      const resetRes = await resetReq.execute('CMDA_Trae_historial_De_REset_DE_UNA_PC_T');
      if (resetRes.recordset) {
        for (const row of resetRes.recordset) {
          resetList.push({
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
    return resetList;
  };

  const fetchUptime = async () => {
    try {
      const uptimeReq = p.request();
      uptimeReq.input('terminal', sqlMod.VarChar(100), targetPc);
      const uptimeRes = await uptimeReq.execute('Cmda_trae_historial_UptimeXterminal_T');
      if (uptimeRes.recordset && uptimeRes.recordset.length > 0) {
        const uRow = uptimeRes.recordset[0];
        return uRow.Uptime || uRow.uptime || uRow.TiempoActivo || uRow.Fecha || '';
      }
    } catch {
      // optional uptime history
    }
    return '';
  };

  const [locSettled, alertsSettled, resetsSettled, uptimeSettled] = await Promise.allSettled([
    fetchLocation(),
    fetchAlerts(),
    fetchResets(),
    fetchUptime(),
  ]);

  const loc = locSettled.status === 'fulfilled' ? locSettled.value : { location: '', costCenter: '' };
  const alerts = alertsSettled.status === 'fulfilled' ? alertsSettled.value : [];
  const resetHistory = resetsSettled.status === 'fulfilled' ? resetsSettled.value : [];
  const uptimeText = uptimeSettled.status === 'fulfilled' ? uptimeSettled.value : '';

  return {
    ...mainData,
    location: loc.location,
    costCenter: loc.costCenter,
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
  isMssqlLoaded,
  getSqlModule,
};

module.exports = service;
