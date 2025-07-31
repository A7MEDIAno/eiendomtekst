// ===== FILE: components/wizard/CompetitorDashboard.js - KONKURRANSEANALYSE =====
import { useState } from 'react';

export default function CompetitorDashboard({ analysis, onClose }) {
  const [selectedTab, setSelectedTab] = useState('overview');

  if (!analysis) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-gray-400">Analyserer markedet i området...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-6 border-b border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              🔍 Konkurranseanalyse
            </h3>
            <p className="text-gray-400">
              Fant {analysis?.totalListings || 12} lignende boliger til salgs innen 2km
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {['overview', 'pricing', 'features', 'recommendations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-6 py-3 font-medium transition-all ${
              selectedTab === tab
                ? 'bg-gray-700/50 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
          >
            {tab === 'overview' && '📊 Oversikt'}
            {tab === 'pricing' && '💰 Prisnivå'}
            {tab === 'features' && '🏠 Egenskaper'}
            {tab === 'recommendations' && '💡 Anbefalinger'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-700/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                3.2 mill
              </div>
              <p className="text-gray-400">Snitt prisantydning</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                87m²
              </div>
              <p className="text-gray-400">Snitt størrelse</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                42 dager
              </div>
              <p className="text-gray-400">Snitt liggetid</p>
            </div>
          </div>
        )}

        {selectedTab === 'pricing' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-white mb-4">Prisnivå per m²</h4>
              <div className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">25k</span>
                  <span className="text-gray-400">45k</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-4 relative">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full" style={{width: '60%'}}></div>
                  <div className="absolute top-1/2 -translate-y-1/2 bg-blue-500 w-2 h-6 rounded-full" style={{left: '70%'}}>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-blue-400 whitespace-nowrap">
                      Din bolig: 35k/m²
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-medium text-white mb-4">Prisutvikling siste 6 mnd</h4>
              <div className="bg-gray-700/30 rounded-lg p-4 h-48 flex items-center justify-center">
                <p className="text-gray-500">Graf kommer her</p>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'features' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-white mb-4">🏷️ Populære salgsord i området</h4>
              <div className="flex flex-wrap gap-2">
                {['Barnevennlig', 'Solrikt', 'Oppusset', 'Sentralt', 'Balkong', 'Rolig', 'Moderne'].map((tag) => (
                  <span key={tag} className="bg-gray-700/50 text-gray-300 px-4 py-2 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-medium text-white mb-4">⚡ Dine konkurransefortrinn</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <div>
                    <p className="text-white font-medium">Nyere bad (2019 vs snitt 2008)</p>
                    <p className="text-gray-400 text-sm">Betydelig konkurransefortrinn</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <div>
                    <p className="text-white font-medium">Balkong (kun 40% har)</p>
                    <p className="text-gray-400 text-sm">Attraktivt for målgruppen</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <div>
                    <p className="text-white font-medium">Garasje (kun 25% har)</p>
                    <p className="text-gray-400 text-sm">Sjelden i dette området</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'recommendations' && (
          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
              <h4 className="text-lg font-medium text-blue-300 mb-3">💰 Prisanbefaling</h4>
              <p className="text-gray-300 mb-2">
                Basert på analysen anbefaler vi en prisantydning på <strong>2.9-3.1 millioner</strong>
              </p>
              <p className="text-gray-400 text-sm">
                Dette er 50-100k under snitt for rask salg, men reflekterer boligens kvaliteter.
              </p>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
              <h4 className="text-lg font-medium text-purple-300 mb-3">📝 Markedsføringstips</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• Fremhev balkong og garasje ekstra - dette er sjeldne egenskaper</li>
                <li>• Bruk "barnevennlig" - populært søkeord i området</li>
                <li>• Fokuser på det nye badet i beskrivelsene</li>
                <li>• Nevn nærhet til [populært område/skole]</li>
              </ul>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
              <h4 className="text-lg font-medium text-green-300 mb-3">🎯 Målgruppe</h4>
              <p className="text-gray-300">
                Primær: <strong>Barnefamilier</strong> (30-45 år)<br/>
                Sekundær: <strong>Førstegangskjøpere</strong> med god økonomi
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}