import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showProjections, setShowProjections] = useState(true);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(null);
  const [showDateSelector, setShowDateSelector] = useState(false);

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
      
      if (processedData.length > 0 && currentWeekIndex === null) {
        setCurrentWeekIndex(processedData.length - 1);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processSheetData = (mesesData) => {
    const data = [];
    
    const monthMap = {
      'Octubre': 'Oct', 'Noviembre': 'Nov', 'Diciembre': 'Dic',
      'Enero': 'Ene', 'Febrero': 'Feb', 'Marzo': 'Mar',
      'Abril': 'Abr', 'Mayo': 'May', 'Junio': 'Jun',
      'Julio': 'Jul', 'Agosto': 'Ago', 'Septiembre': 'Sep'
    };
    
    Object.entries(mesesData).forEach(([mes, semanas]) => {
      const mesAbrev = monthMap[mes] || mes;
      semanas.forEach((semana) => {
        data.push({
          week: mesAbrev + ' S' + semana.semana,
          ingresos: semana.ingresos || 0,
          egresos: (semana.opex || 0) + (semana.capex || 0) + (semana.impuestos || 0),
          saldoNeto: semana.saldo || 0,
          saldoAcum: semana.saldoAcumulado || 0
        });
      });
    });

    return data.filter(d => d.ingresos > 0 || d.egresos > 0 || Math.abs(d.saldoAcum) > 0);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const realData = currentWeekIndex !== null ? historicalData.slice(0, currentWeekIndex + 1) : historicalData;
  const projectedDataFromSheet = currentWeekIndex !== null ? historicalData.slice(currentWeekIndex + 1) : [];

  const avgIngresos = realData.length > 0 ? realData.reduce((sum, item) => sum + item.ingresos, 0) / realData.filter(item => item.ingresos > 0).length : 0;
  const avgEgresos = realData.length > 0 ? realData.reduce((sum, item) => sum + item.egresos, 0) / realData.filter(item => item.egresos > 0).length : 0;
  const lastSaldo = realData.length > 0 ? realData[realData.length - 1].saldoAcum : 0;

  const projectionData = [];
  if (realData.length > 0) {
    const months = ['Mar', 'Abr', 'May', 'Jun'];
    let currentSaldo = lastSaldo;
    
    projectedDataFromSheet.forEach(item => {
      projectionData.push({ ...item, isFromSheet: true });
      currentSaldo = item.saldoAcum;
    });
    
    const weeksToProject = Math.max(0, 12 - projectedDataFromSheet.length);
    let weekCounter = 0;
    
    for (let i = 0; i < months.length && weekCounter < weeksToProject; i++) {
      const month = months[i];
      for (let week = 1; week <= 4 && weekCounter < weeksToProject; week++) {
        const projIngresos = avgIngresos * 0.85;
        const projEgresos = avgEgresos * 1.0;
        const projSaldoNeto = projIngresos - projEgresos;
        currentSaldo += projSaldoNeto;
        
        projectionData.push({
          week: month + ' S' + week,
          ingresos: projIngresos,
          egresos: projEgresos,
          saldoNeto: projSaldoNeto,
          saldoAcum: currentSaldo,
          isFromSheet: false
        });
        weekCounter++;
      }
    }
  }

  const cashflowData = [...realData, ...projectionData];
  const projectedSaldo = projectionData.length > 0 ? projectionData[projectionData.length - 1].saldoAcum : 0;
  const burnRate = avgEgresos - avgIngresos;
  const weeksNegative = realData.filter(item => item.saldoNeto < 0).length;

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

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-slate-800">Cargando datos...</h2>
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
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
            <p className="text-slate-600 mb-4">{error}</p>
          </div>
          <button onClick={loadDataFromSheet} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard Flujo de Caja</h1>
            <p className="text-slate-600">Sincronizado con Google Sheets</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowDateSelector(!showDateSelector)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              📅 {showDateSelector ? 'Ocultar' : 'Configurar'} Fecha
            </button>
            <button onClick={loadDataFromSheet} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400">
              🔄 Recargar
            </button>
          </div>
        </div>

        {showDateSelector && historicalData.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">📅 Configurar Semana Actual</h3>
            <select value={currentWeekIndex !== null ? currentWeekIndex : historicalData.length - 1} onChange={(e) => setCurrentWeekIndex(parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg mb-4">
              {historicalData.map((item, idx) => (
                <option key={idx} value={idx}>{item.week} - {formatCurrency(item.saldoAcum)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <p className="text-xs text-blue-600 font-medium">Reales</p>
                <p className="text-lg font-bold text-blue-800">{realData.length}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
                <p className="text-xs text-purple-600 font-medium">Sheet</p>
                <p className="text-lg font-bold text-purple-800">{projectedDataFromSheet.length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <p className="text-xs text-green-600 font-medium">Auto</p>
                <p className="text-lg font-bold text-green-800">{projectionData.filter(p => !p.isFromSheet).length}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-sm text-slate-600 mb-1">Saldo Actual</p>
            <p className={'text-2xl font-bold ' + (lastSaldo >= 0 ? 'text-slate-800' : 'text-red-600')}>
              {formatCurrency(lastSaldo)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <p className="text-sm text-slate-600 mb-1">Proyección 3M</p>
            <p className={'text-2xl font-bold ' + (projectedSaldo >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(projectedSaldo)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <p className="text-sm text-slate-600 mb-1">Burn Rate</p>
            <p className={'text-2xl font-bold ' + (burnRate <= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(Math.abs(burnRate))}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-sm text-slate-600 mb-1">Semanas</p>
            <p className="text-2xl font-bold text-slate-800">{historicalData.length}</p>
            <p className="text-xs text-slate-500 mt-1">✅ {realData.length} | 📊 {projectionData.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b overflow-x-auto">
            <button onClick={() => setActiveTab('overview')} className={'px-6 py-3 font-medium ' + (activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-600')}>
              Resumen
            </button>
            <button onClick={() => setActiveTab('projections')} className={'px-6 py-3 font-medium ' + (activeTab === 'projections' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-600')}>
              Proyecciones
            </button>
            <button onClick={() => setActiveTab('composition')} className={'px-6 py-3 font-medium ' + (activeTab === 'composition' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-600')}>
              Composición
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Saldo Acumulado</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart>
                      <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" data={cashflowData} tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={(v) => '

            {activeTab === 'projections' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">📈 Optimista</h4>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(projectedSaldo * 1.5)}</p>
                  </div>
                  <div className="bg-blue-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">📊 Base</h4>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(projectedSaldo)}</p>
                  </div>
                  <div className="bg-red-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-2">📉 Pesimista</h4>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(projectedSaldo * 0.4)}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis tickFormatter={(v) => '$' + (v/1000000).toFixed(1) + 'M'} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="ingresos" fill="#a78bfa" name="Ingresos" />
                    <Bar dataKey="egresos" fill="#fca5a5" name="Egresos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'composition' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Ingresos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={incomeComposition} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => name + ': ' + (percent * 100).toFixed(0) + '%'}>
                        {incomeComposition.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">OPEX</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={opexComposition} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => name + ': ' + (percent * 100).toFixed(0) + '%'}>
                        {opexComposition.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} + (v/1000000).toFixed(1) + 'M'} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="saldoAcum" data={realData} stroke="#3b82f6" strokeWidth={3} fill="url(#colorSaldo)" name="Saldo Real" />
                      {showProjections && projectionData.length > 0 && (
                        <Area type="monotone" dataKey="saldoAcum" data={[realData[realData.length - 1], ...projectionData]} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorProj)" name="Proyección" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Ingresos vs Egresos (Datos Reales)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={realData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={(v) => '

            {activeTab === 'projections' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">📈 Optimista</h4>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(projectedSaldo * 1.5)}</p>
                  </div>
                  <div className="bg-blue-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">📊 Base</h4>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(projectedSaldo)}</p>
                  </div>
                  <div className="bg-red-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-2">📉 Pesimista</h4>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(projectedSaldo * 0.4)}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis tickFormatter={(v) => '$' + (v/1000000).toFixed(1) + 'M'} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="ingresos" fill="#a78bfa" name="Ingresos" />
                    <Bar dataKey="egresos" fill="#fca5a5" name="Egresos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'composition' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Ingresos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={incomeComposition} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => name + ': ' + (percent * 100).toFixed(0) + '%'}>
                        {incomeComposition.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">OPEX</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={opexComposition} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => name + ': ' + (percent * 100).toFixed(0) + '%'}>
                        {opexComposition.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} + (v/1000000).toFixed(1) + 'M'} />
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">📈 Optimista</h4>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(projectedSaldo * 1.5)}</p>
                  </div>
                  <div className="bg-blue-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">📊 Base</h4>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(projectedSaldo)}</p>
                  </div>
                  <div className="bg-red-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-2">📉 Pesimista</h4>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(projectedSaldo * 0.4)}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis tickFormatter={(v) => '$' + (v/1000000).toFixed(1) + 'M'} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="ingresos" fill="#a78bfa" name="Ingresos" />
                    <Bar dataKey="egresos" fill="#fca5a5" name="Egresos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'composition' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Ingresos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={incomeComposition} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => name + ': ' + (percent * 100).toFixed(0) + '%'}>
                        {incomeComposition.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">OPEX</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={opexComposition} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => name + ': ' + (percent * 100).toFixed(0) + '%'}>
                        {opexComposition.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
