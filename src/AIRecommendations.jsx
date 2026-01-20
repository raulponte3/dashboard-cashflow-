import { useState } from 'react';

export default function AIRecommendations({ realData, projectionData, avgIngresos, avgEgresos, lastSaldo }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      // Preparar datos para el análisis
      const weeksNegative = realData.filter(w => w.saldoNeto < 0).length;
      const totalIngresos = realData.reduce((sum, w) => sum + w.ingresos, 0);
      const totalEgresos = realData.reduce((sum, w) => sum + w.egresos, 0);
      const burnRate = avgEgresos - avgIngresos;
      
      // Calcular tendencias
      const lastFiveWeeks = realData.slice(-5);
      const trendIngresos = lastFiveWeeks.length > 0 
        ? (lastFiveWeeks[lastFiveWeeks.length - 1].ingresos - lastFiveWeeks[0].ingresos) / lastFiveWeeks[0].ingresos * 100
        : 0;

      const prompt = `Eres un CFO experto analizando el flujo de caja de un e-commerce chileno. Analiza estos datos y proporciona recomendaciones específicas y accionables.

DATOS FINANCIEROS:
- Total semanas analizadas: ${realData.length}
- Semanas con saldo negativo: ${weeksNegative}
- Saldo actual: ${formatCurrency(lastSaldo)}
- Ingreso promedio semanal: ${formatCurrency(avgIngresos)}
- Egreso promedio semanal: ${formatCurrency(avgEgresos)}
- Burn rate semanal: ${formatCurrency(burnRate)}
- Total ingresos período: ${formatCurrency(totalIngresos)}
- Total egresos período: ${formatCurrency(totalEgresos)}
- Tendencia ingresos últimas 5 semanas: ${trendIngresos.toFixed(1)}%

DATOS SEMANALES (últimas 8 semanas):
${realData.slice(-8).map(w => `${w.week}: Ingresos ${formatCurrency(w.ingresos)}, Egresos ${formatCurrency(w.egresos)}, Saldo Neto ${formatCurrency(w.saldoNeto)}`).join('\n')}

Por favor proporciona:

1. **DIAGNÓSTICO** (2-3 líneas): Estado actual del flujo de caja
2. **RIESGOS CRÍTICOS** (3 bullets): Principales amenazas detectadas
3. **OPORTUNIDADES** (3 bullets): Áreas de mejora identificadas
4. **ACCIONES INMEDIATAS** (5 bullets): Pasos concretos para esta semana
5. **ESTRATEGIA 30 DÍAS** (3 bullets): Plan de acción para el próximo mes

Sé específico con números y plazos. Responde en formato markdown limpio.`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Error al analizar con IA');
      }

      const data = await response.json();
      const analysis = data.content[0].text;
      
      setRecommendations(analysis);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            🤖 Análisis Inteligente con IA
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Claude analizará tus datos y te dará recomendaciones personalizadas
          </p>
        </div>
        <button
          onClick={analyzeWithAI}
          disabled={analyzing}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 font-medium shadow-lg"
        >
          {analyzing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analizando...
            </span>
          ) : (
            '✨ Analizar con IA'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">❌ {error}</p>
          <p className="text-xs text-red-600 mt-2">
            Nota: Esta función usa la API de Claude directamente desde el navegador. 
            Asegúrate de tener configuradas las credenciales correctamente.
          </p>
        </div>
      )}

      {recommendations && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-3xl">🎯</div>
            <h4 className="text-lg font-semibold text-slate-800">Recomendaciones Personalizadas</h4>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <div 
              className="text-slate-700 space-y-4"
              dangerouslySetInnerHTML={{ 
                __html: recommendations
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>')
                  .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
                  .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')
                  .replace(/\n\n/g, '</p><p class="mt-3">')
                  .replace(/^(.+)$/gm, '<p>$1</p>')
              }}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-blue-200">
            <p className="text-xs text-slate-500 italic">
              💡 Análisis generado por Claude AI basado en tus datos reales del {realData[0]?.week} al {realData[realData.length - 1]?.week}
            </p>
          </div>
        </div>
      )}

      {!recommendations && !analyzing && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🧠</div>
          <h4 className="text-lg font-semibold text-slate-800 mb-2">
            Obtén insights personalizados
          </h4>
          <p className="text-sm text-slate-600 mb-4">
            Claude analizará tus {realData.length} semanas de datos y te dará recomendaciones específicas para mejorar tu flujo de caja
          </p>
          <ul className="text-xs text-slate-500 text-left max-w-md mx-auto space-y-2">
            <li>✓ Identifica patrones y tendencias ocultas</li>
            <li>✓ Detecta riesgos críticos antes de que sea tarde</li>
            <li>✓ Sugiere acciones concretas y priorizadas</li>
            <li>✓ Proyecta escenarios futuros basados en tu historial</li>
          </ul>
        </div>
      )}
    </div>
  );
}
