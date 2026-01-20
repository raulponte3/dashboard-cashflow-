import { useState } from 'react';

export default function AIRecommendations({ realData, projectionData, avgIngresos, avgEgresos, lastSaldo }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const weeksNegative = realData.filter(w => w.saldoNeto < 0).length;
      const totalIngresos = realData.reduce((sum, w) => sum + w.ingresos, 0);
      const totalEgresos = realData.reduce((sum, w) => sum + w.egresos, 0);
      const burnRate = avgEgresos - avgIngresos;
      
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

Por favor proporciona tu análisis en este formato EXACTO:

## 🔍 DIAGNÓSTICO
[2-3 líneas sobre el estado actual]

## ⚠️ RIESGOS CRÍTICOS
- [Riesgo 1]
- [Riesgo 2]
- [Riesgo 3]

## 💡 OPORTUNIDADES
- [Oportunidad 1]
- [Oportunidad 2]
- [Oportunidad 3]

## 🎯 ACCIONES INMEDIATAS (Esta Semana)
1. [Acción específica con números]
2. [Acción específica con números]
3. [Acción específica con números]
4. [Acción específica con números]
5. [Acción específica con números]

## 📅 ESTRATEGIA 30 DÍAS
- [Plan 1]
- [Plan 2]
- [Plan 3]

Sé MUY específico con números, porcentajes y plazos concretos.`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al analizar con IA');
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;
      
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

  const parseMarkdown = (text) => {
    return text
      .replace(/## (.*?)$/gm, '<h3 class="text-lg font-bold text-slate-900 mt-6 mb-3 flex items-center gap-2">$1</h3>')
      .replace(/### (.*?)$/gm, '<h4 class="text-md font-semibold text-slate-800 mt-4 mb-2">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-semibold">$1</strong>')
      .replace(/^\d+\.\s(.+)$/gm, '<li class="ml-6 mb-2 text-slate-700">$1</li>')
      .replace(/^[-•]\s(.+)$/gm, '<li class="ml-6 mb-2 text-slate-700">$1</li>')
      .replace(/\n\n/g, '<br/><br/>');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            🤖 Análisis Inteligente con IA
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            GPT-4 analizará tus datos y te dará recomendaciones personalizadas
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
            Asegúrate de haber configurado tu OPENAI_API_KEY en las variables de entorno de Vercel.
          </p>
        </div>
      )}

      {recommendations && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-3xl">🎯</div>
            <h4 className="text-lg font-semibold text-slate-800">Recomendaciones Personalizadas</h4>
          </div>
          
          <div 
            className="prose prose-sm max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ 
              __html: parseMarkdown(recommendations)
            }}
          />

          <div className="mt-6 pt-4 border-t border-blue-200 flex items-center justify-between">
            <p className="text-xs text-slate-500 italic">
              💡 Análisis generado por GPT-4 basado en {realData.length} semanas de datos ({realData[0]?.week} al {realData[realData.length - 1]?.week})
            </p>
            <button
              onClick={analyzeWithAI}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              🔄 Actualizar análisis
            </button>
          </div>
        </div>
      )}

      {!recommendations && !analyzing && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🧠</div>
          <h4 className="text-lg font-semibold text-slate-800 mb-2">
            Obtén insights personalizados con IA
          </h4>
          <p className="text-sm text-slate-600 mb-4">
            GPT-4 analizará tus {realData.length} semanas de datos y te dará recomendaciones específicas
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mt-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-2xl mb-2">🔍</div>
              <h5 className="font-semibold text-sm text-slate-800 mb-1">Identifica Patrones</h5>
              <p className="text-xs text-slate-600">Descubre tendencias ocultas en tus datos</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-2xl mb-2">⚠️</div>
              <h5 className="font-semibold text-sm text-slate-800 mb-1">Detecta Riesgos</h5>
              <p className="text-xs text-slate-600">Anticipa problemas antes de que ocurran</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-2xl mb-2">🎯</div>
              <h5 className="font-semibold text-sm text-slate-800 mb-1">Acciones Concretas</h5>
              <p className="text-xs text-slate-600">Pasos específicos priorizados</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-2xl mb-2">📈</div>
              <h5 className="font-semibold text-sm text-slate-800 mb-1">Estrategia 30 Días</h5>
              <p className="text-xs text-slate-600">Plan de acción mensual personalizado</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
