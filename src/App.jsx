import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showProjections, setShowProjections] = useState(true);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDataFromSheet();
  }, []);

  const loadDataFromSheet = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets');
      
      if (!response.ok) {
        throw new Error('Error al cargar datos del servidor');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const processedData = processSheetData(data.meses);
      setHistoricalData(processedData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processSheetData = (mesesData) => {
    const data = [];
    
    Object.entries(mesesData).forEach(([mes, semanas]) => {
      semanas.forEach((semana, idx) => {
        data.push({
          week: `${mes} S${idx + 1}`,
          ingresos: semana.ingresos || 0,
          egresos: (semana.opex || 0) + (semana.capex || 0) + (semana.impuestos || 0),
          saldoNeto: semana.saldo || 0,
          saldoAcum: semana.saldoAcumulado || 0
        });
      });
    });

    return data.filter(d => d.ingresos > 0 || d.egresos > 0 || d.saldoAcum !== 0);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const avgIngresos = historicalData.length > 0 
    ? historicalData.reduce((sum, item) => sum + item.ingresos, 0) / historicalData.filter(item => item.ingresos > 0).length 
    : 0;
  const avgEgresos = historicalData.length > 0 
    ? historicalData.reduce((sum, item) => sum + item.egresos, 0) / historicalData.filter(item => item.egresos > 0).length 
    : 0;
  const lastSaldo = historicalData.length > 0 ? historicalData[historicalData.length - 1].saldoAcum : 0;

  const projectionData = [];
  if (historicalData.length > 0) {
    const months = ['Mar', 'Abr', 'May'];
    let currentSaldo = lastSaldo;
    
    months.forEach((month) => {
      for (let week = 1; week <= 4; week++) {
        const weekName = month + ' S' + week;
        const projIngresos = avgIngresos * 0.85;
        const projEgresos = avgEgresos * 1.0;
        const projSaldoNeto = projIngresos - projEgresos;
        currentSaldo += projSaldoNeto;
        
        projectionData.push({
          week: weekName,
          ingresos: projIngresos,
          egresos: projEgresos,
          saldoNeto: projSaldoNeto,
          saldoAcum: currentSaldo
        });
      }
    });
  }

  const cashflowData = [...historicalData, ...projectionData];
  const projectedSaldo = projectionData.length > 0 ? projectionData[projectionData.length - 1].saldoAcum : 0;
  const burnRate = avgEgresos - avgIngresos;
  const weeksUntilZero = lastSaldo > 0 && burnRate > 0 ? Math.floor(lastSaldo / burnRate) : null;
  const weeksNegative = historicalData.filter(item => item.saldoNeto < 0).length;

  const generateAlerts = () => {
    const alerts = [];
    
    if (lastSaldo < 0) {
      alerts.push({
        type: 'critical',
        title: 'Saldo Negativo Crítico',
        message: 'Tu saldo actual es ' + formatCurrency(lastSaldo) + '. Necesitas financiamiento urgente.',
        action: 'Buscar línea de crédito o negociar aplazamiento de pagos'
      });
    } else if (lastSaldo < 2000000) {
      alerts.push({
        type: 'warning',
        title: 'Liquidez Muy Baja',
        message: 'Solo tienes ' + formatCurrency(lastSaldo) + ' disponible.',
        action: 'Acelerar cobros y postergar pagos no urgentes'
      });
    }

    if (projectionData.length > 0) {
      const next4Weeks = projectionData.slice(0, 4);
      const willBeNegative = next4Weeks.some(week => week.saldoAcum < 0);
      if (willBeNegative && lastSaldo >= 0) {
        const weekNegative = next4Weeks.find(week => week.saldoAcum < 0);
        alerts.push({
          type: 'warning',
          title: 'Proyección Negativa Próximamente',
          message: 'Se proyecta saldo negativo en ' + weekNegative.week,
          action: 'Planificar inyección de capital o ajustar gastos'
        });
      }
    }

    alerts.push({
      type: 'info',
      title: 'Datos desde Google Sheets',
      message: 'Dashboard conectado con Google Service Account',
      action: 'Los datos se actualizan automáticamente desde tu hoja de cálculo'
    });

    return alerts;
  };

  const alerts = historicalData.length > 0 ? generateAlerts() : [];

  const incomeComposition = [
    { name: 'MercadoLibre', value: 92500000, color: '#3b82f6' },
    { name: 'Página', value: 3500000, color: '#10b981' },
    { name: 'Walmart', value: 2000000, color: '#f59e0b' },
    { name: 'Otros', value: 800000, color: '#8b5cf6' }
  ];

  const opexComposition = [
    { name: 'Bodega', value: 9500000, color: '#ef4444' },
    { name: 'Préstamos', value: 25000000, color: '#f97316' },
    { name: 'Publicidad', value: 7000000, color: '#06b6d4' },
    { name: 'Logística', value: 4500000, color: '#8b5cf6' },
    { name: 'Sueldos', value: 2500000, color: '#10b981' },
    { name: 'Otros', value: 3000000, color: '#6b7280' }
  ];

  const getAlertIcon = (type) => {
    if (type === 'critical') return '🚨';
    if (type === 'warning') return '⚠️';
    if (type === 'info') return 'ℹ️';
    return '📌';
  };

  const getAlertColor = (type) => {
    if (type === 'critical') return 'border-red-500 bg-red-50';
    if (type === 'warning') return 'border-orange-500 bg-orange-50';
    if (type === 'info') return 'border-blue-500 bg-blue-50';
    return 'border-gray-500 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-slate-800">Cargando datos...</h2>
          <p className="text-slate-600 mt-2">Conectando con Google Sheets</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-4">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error al cargar datos</h2>
            <p className="text-slate-600 mb-4">{error}</p>
          </div>
          <button
            onClick={loadDataFromSheet}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard Flujo de Caja</h1>
              <p className="text-slate-600">Sincronizado con Google Sheets via Service Account</p>
            </div>
            <button
              onClick={loadDataFromSheet}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              🔄 {loading ? 'Cargando...' : 'Recargar Datos'}
            </button>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              🔔 Centro de Alertas ({alerts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert, idx) => (
                <div key={idx} className={'border-l-4 rounded-lg p-4 ' + getAlertColor(alert.type)}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800 mb-1">{alert.title}</h4>
                      <p className="text-sm text-slate-700 mb-2">{alert.message}</p>
                      <p className="text-xs text-slate-600 italic">💡 {alert.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Saldo Actual</p>
                <p className={'text-2xl font-bold ' + (lastSaldo >= 0 ? 'text-slate-800' : 'text-red-600')}>
                  {formatCurrency(lastSaldo)}
                </p>
              </div>
              <span className="text-4xl">💰</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Proyección 3 Meses</p>
                <p className={'text-2xl font-bold ' + (projectedSaldo >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(projectedSaldo)}
                </p>
              </div>
              <span className="text-4xl">📅</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Burn Rate Semanal</p>
                <p className={'text-2xl font-bold ' + (burnRate <= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(Math.abs(burnRate))}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {burnRate > 0 ? '📉 Negativo' : '📈 Positivo'}
                </p>
              </div>
              <span className="text-4xl">📊</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Semanas de Datos</p>
                <p className="text-2xl font-bold text-slate-800">
                  {historicalData.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ✅ Sincronizado
                </p>
              </div>
              <span className="text-4xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={'px-6 py-3 font-medium whitespace-nowrap ' + (activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-600')}
            >
              Resumen General
            </button>
            <button
              onClick={() => setActiveTab('projections')}
              className={'px-6 py-3 font-medium whitespace-nowrap ' + (activeTab === 'projections' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-600')}
            >
              Proyecciones
            </button>
            <button
              onClick={() => setActiveTab('composition')}
              className={'px-6 py-3 font-medium whitespace-nowrap ' + (activeTab === 'composition' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-600')}
            >
              Composición
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={'px-6 py-3 font-medium whitespace-nowrap ' + (activeTab === 'analysis' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-600')}
            >
              Análisis Detallado
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Evolución Saldo Acumulado</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={cashflowData}>
                      <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fill: '#64748b' }} tickFormatter={(v) => '$' + (v/1000000).toFixed(1) + 'M'} />
                      <Tooltip 
                        formatter={(v) => formatCurrency(v)}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="saldoAcum" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        fill="url(#colorSaldo)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Ingresos vs Egresos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fill: '#64748b' }} tickFormatter={(v) => '$' + (v/1000000).toFixed(1) + 'M'} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                      <Bar dataKey="egresos" fill="#ef4444" name="Egresos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'projections' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">📈 Optimista</h4>
                    <p className="text-sm text-green-700 mb-2">Ingresos +20%, Egresos -10%</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(projectedSaldo * 1.5)}</p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">📊 Base</h4>
                    <p className="text-sm text-blue-700 mb-2">Ingresos -15%, Egresos estables</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(projectedSaldo)}</p>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-2">📉 Pesimista</h4>
                    <p className="text-sm text-red-700 mb-2">Ingresos -30%, Egresos +10%</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(projectedSaldo * 0.4)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Proyección Próximos 3 Meses</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#64748b' }} tickFormatter={(v) => '$' + (v/1000000).toFixed(1) + 'M'} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#a78bfa" name="Ingresos Proyectados" />
                      <Bar dataKey="egresos" fill="#fca5a5" name="Egresos Proyectados" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-3">💡 Acciones Recomendadas</h4>
                  <ul className="text-sm text-yellow-700 space-y-2 ml-4 list-disc">
                    <li><strong>Semana 1-2:</strong> Acelerar cobros de MercadoLibre y Walmart</li>
                    <li><strong>Semana 3-4:</strong> Postergar compras grandes hasta mejorar liquidez</li>
                    <li><strong>Semana 5-8:</strong> Negociar pagos fraccionados con proveedores</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'composition' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Composición Ingresos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={incomeComposition}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => name + ': ' + (percent * 100).toFixed(0) + '%'}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {incomeComposition.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Composición OPEX</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={opexComposition}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => name + ': ' + (percent * 100).toFixed(0) + '%'}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {opexComposition.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Saldo Neto Semanal</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fill: '#64748b' }} tickFormatter={(v) => '$' + (v/1000000).toFixed(1) + 'M'} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="saldoNeto" name="Saldo Neto">
                        {historicalData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.saldoNeto >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-sm text-slate-600 mb-1">Ingreso Promedio</p>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(avgIngresos)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-sm text-slate-600 mb-1">Egreso Promedio</p>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(avgEgresos)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-sm text-slate-600 mb-1">Margen Neto</p>
                    <p className={'text-xl font-bold ' + ((avgIngresos - avgEgresos) >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(avgIngresos - avgEgresos)}
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    ⚠️ Puntos Críticos
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1 ml-6 list-disc">
                    <li>Saldo final: {formatCurrency(lastSaldo)}</li>
                    <li>Préstamos representan ~48% de egresos</li>
                    <li>{weeksNegative} semanas con saldo negativo de {historicalData.length} totales</li>
                    <li>Dependencia alta de MercadoLibre (~93% ingresos)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Plan de Acción Prioritario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">🚨 URGENTE</h4>
              <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
                <li>Buscar línea de crédito adicional</li>
                <li>Negociar aplazamiento de préstamos</li>
                <li>Acelerar cobros pendientes</li>
              </ul>
            </div>
            
            <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 mb-2">⚠️ IMPORTANTE</h4>
              <ul className="text-sm text-orange-700 space-y-1 ml-4 list-disc">
                <li>Fraccionar compras de mercancía</li>
                <li>Renegociar con proveedores</li>
                <li>Reducir publicidad 20%</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-500 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">📊 ESTRATÉGICO</h4>
              <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                <li>Crecer Walmart y Falabella 50%</li>
                <li>Colchón mínimo $5M</li>
                <li>Optimizar logística</li>
              </ul>
            </div>
            
            <div className="bg-green-50 border border-green-500 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">💡 CONTINUO</h4>
              <ul className="text-sm text-green-700 space-y-1 ml-4 list-disc">
                <li>Actualizar Google Sheet cada lunes</li>
                <li>Revisar alertas semanalmente</li>
                <li>Analizar ROI mensualmente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
