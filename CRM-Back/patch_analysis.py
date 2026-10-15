import re
p='C:/Users/Sr. Sebastian/Desktop/TESIS/CRM-Front/src/components/analisys/Analisys.jsx'
s=open(p,encoding='utf-8').read()
needle='Análisis</h1>'
assert needle in s, 'marker not found'
insert = needle + '''
        <button
          onClick={() => updatePredictions().then(fetchAnalysisData)}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          Ejecutar predicciones
        </button>'''
s=s.replace(needle, insert, 1)
open(p,'w',encoding='utf-8').write(s)
print("done")