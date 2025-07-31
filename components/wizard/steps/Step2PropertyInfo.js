// ===== FILE: components/wizard/steps/Step2PropertyInfo.js - OPPDATERT MED BOLIGTYPE OG MARKEDSDATA =====
import { useState, useRef, useEffect } from 'react';
import { useWizard } from '../../../contexts/WizardContext';
import CompetitorDashboard from '../CompetitorDashboard';

export default function Step2PropertyInfo() {
  const { data, updateData, updateMultipleData, validateStep } = useWizard();
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const [showCompetitorAnalysis, setShowCompetitorAnalysis] = useState(false);
  const [isDetectingPropertyType, setIsDetectingPropertyType] = useState(false);
  const [isFetchingMarketData, setIsFetchingMarketData] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
  if (validateStep) {
    const timer = setTimeout(() => {
      validateStep(1); // eller 2 for Step2
    }, 0);
    return () => clearTimeout(timer);
  }
}, [/* dependencies */]);
  // Auto-detect boligtype når vi har bilder
  const detectPropertyType = async () => {
    // Sjekk om vi har bilder å analysere
    const imageUrls = data.mode === 'gallery' 
      ? data.previewImages 
      : data.imageUrls?.filter(url => url.trim());

    if (!imageUrls || imageUrls.length === 0) {
      alert('Last inn bilder først (Steg 1) for å kunne identifisere boligtype');
      return;
    }

    setIsDetectingPropertyType(true);
    try {
      const response = await fetch('/api/detect-property-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Legg til boligtype i propertyInfo
        const boligTypeInfo = `\nBOLIGTYPE: ${result.propertyTypeName} (${Math.round(result.confidence * 100)}% sikkerhet)\n${result.description}`;
        
        const existingInfo = data.propertyInfo ? data.propertyInfo + '\n' : '';
        updateData('propertyInfo', existingInfo + boligTypeInfo);
        
        // Lagre boligtype separat også
        updateData('detectedPropertyType', {
          type: result.propertyType,
          name: result.propertyTypeName,
          confidence: result.confidence,
          description: result.description
        });
      } else {
        console.error('Property type detection failed:', result);
      }
    } catch (error) {
      console.error('Failed to detect property type:', error);
    } finally {
      setIsDetectingPropertyType(false);
    }
  };

  // Hent markedsdata
  const fetchMarketData = async () => {
    const addressToUse = data.manualAddress || data.propertyAddress;
    if (!addressToUse) {
      alert('Legg inn adresse først');
      return;
    }

    setIsFetchingMarketData(true);
    try {
      const response = await fetch('/api/fetch-market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address: addressToUse,
          propertyType: data.detectedPropertyType?.type,
          sqm: extractSqmFromInfo(data.propertyInfo),
          rooms: extractRoomsFromInfo(data.propertyInfo)
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setMarketData(result);
        
        // Legg til markedsinfo i propertyInfo
        const marketInfo = formatMarketData(result);
        const existingInfo = data.propertyInfo ? data.propertyInfo + '\n\n' : '';
        updateData('propertyInfo', existingInfo + marketInfo);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setIsFetchingMarketData(false);
    }
  };

  // Hjelpefunksjoner for å trekke ut data
  const extractSqmFromInfo = (info) => {
    const match = info?.match(/(\d+)\s*m[²2]/);
    return match ? parseInt(match[1]) : null;
  };

  const extractRoomsFromInfo = (info) => {
    const match = info?.match(/(\d+)\s*rom/i);
    return match ? parseInt(match[1]) : null;
  };

  const formatMarketData = (data) => {
    const { analysis, recommendations } = data;
    
    let text = 'MARKEDSANALYSE:\n';
    text += `• Gjennomsnittlig m²-pris: ${analysis.avgPricePerSqm.toLocaleString('nb-NO')} kr\n`;
    
    if (analysis.priceRange) {
      text += `• Prisspenn: ${analysis.priceRange.min.toLocaleString('nb-NO')} - ${analysis.priceRange.max.toLocaleString('nb-NO')} kr/m²\n`;
    }
    
    text += `• Basert på ${analysis.relevantSales} lignende salg\n`;
    text += `• Prisvekst siste 2 år: ${analysis.priceGrowthPercent}%\n`;
    
    if (recommendations.length > 0) {
      text += '\nANBEFALINGER:\n';
      recommendations.forEach(rec => {
        if (rec.type === 'pricing' && rec.suggestion.estimated) {
          text += `• Estimert verdi: ${rec.suggestion.estimated.toLocaleString('nb-NO')} kr\n`;
          text += `• Prisintervall: ${rec.suggestion.range.min.toLocaleString('nb-NO')} - ${rec.suggestion.range.max.toLocaleString('nb-NO')} kr\n`;
        } else {
          text += `• ${rec.title}: ${rec.description}\n`;
        }
      });
    }
    
    return text;
  };

  const fetchLocationInfo = async () => {
    const addressToUse = data.manualAddress || data.propertyAddress;
    if (!addressToUse) {
      setError('Mangler adresse for områdesøk');
      return;
    }

    setIsFetchingLocation(true);
    try {
      const response = await fetch('/api/fetch-location-info-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address: addressToUse,
          includeAdvancedAnalysis: true 
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        const existingInfo = data.propertyInfo ? data.propertyInfo + '\n\n' : '';
        updateData('propertyInfo', existingInfo + result.generatedInfo);
        updateData('areaInfo', result.areaDescription);
      }
    } catch (error) {
      console.error('Failed to fetch location info:', error);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const analyzeConditionReport = async (file) => {
    if (!file) return;

    setIsAnalyzingReport(true);

    const formData = new FormData();
    formData.append('report', file);

    try {
      const response = await fetch('/api/analyze-condition-report', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        updateData('conditionReport', result);
        
        const existingInfo = data.propertyInfo ? data.propertyInfo + '\n\n' : '';
        updateData('propertyInfo', existingInfo + result.formattedInfo);
        
        if (result.recommendations.targetGroup.includes('investor')) {
          updateData('targetGroup', 'investor');
        } else if (result.recommendations.targetGroup.includes('handy')) {
          updateData('targetGroup', 'firstTime');
        }
      }
    } catch (error) {
      console.error('Failed to analyze report:', error);
    } finally {
      setIsAnalyzingReport(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      analyzeConditionReport(file);
    }
  };

  const triggerCompetitorAnalysis = async () => {
    const address = data.propertyAddress || data.manualAddress;
    if (!address) return;

    setShowCompetitorAnalysis(true);
    
    try {
      const response = await fetch('/api/analyze-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address,
          propertyInfo: data.propertyInfo 
        })
      });

      const result = await response.json();
      updateData('competitorAnalysis', result);
    } catch (error) {
      console.error('Failed to analyze competitors:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Adresse */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Eiendomsadresse
        </label>
        <input
          type="text"
          value={data.propertyAddress || data.manualAddress}
          onChange={(e) => updateData(data.propertyAddress ? 'propertyAddress' : 'manualAddress', e.target.value)}
          placeholder="Eksempelveien 123, 0123 Oslo"
          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
        <p className="text-xs text-gray-500 mt-1">
          {data.propertyAddress && '✓ Auto-oppdaget fra galleri'}
        </p>
      </div>

      {/* Automatiske verktøy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={detectPropertyType}
          disabled={isDetectingPropertyType}
          className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex flex-col items-center gap-2"
        >
          {isDetectingPropertyType ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <span>🏠</span>
          )}
          <span className="text-xs">Identifiser boligtype</span>
        </button>

        <button
          onClick={fetchLocationInfo}
          disabled={isFetchingLocation || (!data.propertyAddress && !data.manualAddress)}
          className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex flex-col items-center gap-2"
        >
          {isFetchingLocation ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <span>🗺️</span>
          )}
          <span className="text-xs">Områdeinfo</span>
        </button>

        <button
          onClick={fetchMarketData}
          disabled={isFetchingMarketData || (!data.propertyAddress && !data.manualAddress)}
          className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex flex-col items-center gap-2"
        >
          {isFetchingMarketData ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <span>📊</span>
          )}
          <span className="text-xs">Markedsdata</span>
        </button>

        <button
          onClick={triggerCompetitorAnalysis}
          disabled={!data.propertyAddress && !data.manualAddress}
          className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex flex-col items-center gap-2"
        >
          <span>🔍</span>
          <span className="text-xs">Konkurrenter</span>
        </button>
      </div>

      {/* Boligtype visning */}
      {data.detectedPropertyType && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300 font-medium">
                🏠 Identifisert boligtype: {data.detectedPropertyType.name}
              </p>
              <p className="text-xs text-purple-200 mt-1">
                {Math.round(data.detectedPropertyType.confidence * 100)}% sikker • {data.detectedPropertyType.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Markedsdata visning */}
      {marketData && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-300 mb-3">📊 Markedsanalyse</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-green-200">Snitt m²-pris</p>
              <p className="text-white font-medium">{marketData.analysis.avgPricePerSqm.toLocaleString('nb-NO')} kr</p>
            </div>
            <div>
              <p className="text-green-200">Prisvekst</p>
              <p className="text-white font-medium">{marketData.analysis.priceGrowthPercent}%</p>
            </div>
            <div>
              <p className="text-green-200">Antall salg</p>
              <p className="text-white font-medium">{marketData.analysis.relevantSales} lignende</p>
            </div>
            {marketData.recommendations[0]?.suggestion?.estimated && (
              <div>
                <p className="text-green-200">Estimert verdi</p>
                <p className="text-white font-medium">
                  {(marketData.recommendations[0].suggestion.estimated / 1000000).toFixed(1)}M
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Boliginformasjon */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">
            Boliginformasjon
          </label>
        </div>
        
        <textarea
          value={data.propertyInfo}
          onChange={(e) => updateData('propertyInfo', e.target.value)}
          placeholder="Legg inn informasjon om boligen: størrelse, antall rom, byggeår, oppussing, spesielle egenskaper..."
          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono text-sm"
          rows={10}
        />
      </div>

      {/* Tilstandsrapport */}
      <div>
        <div className="backdrop-blur-sm bg-orange-500/10 border border-orange-400/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-200">
              📋 Tilstandsrapport (valgfritt)
            </label>
            {data.conditionReport && (
              <span className="text-xs text-green-400">✓ Analysert</span>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzingReport}
            className="w-full bg-orange-600/20 hover:bg-orange-600/30 border border-orange-400/30 text-orange-300 py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAnalyzingReport ? (
              <>
                <span className="animate-spin">⏳</span>
                Analyserer tilstandsrapport...
              </>
            ) : (
              <>
                <span>📄</span>
                Last opp tilstandsrapport
              </>
            )}
          </button>
          
          {data.conditionReport && (
            <div className="mt-4 text-sm text-gray-300 space-y-1">
              <p>✓ Byggeår: {data.conditionReport.findings.buildingYear || 'Ukjent'}</p>
              <p>✓ Tilstand: {data.conditionReport.findings.generalCondition}</p>
              {data.conditionReport.findings.totalCost && (
                <p>✓ Estimerte kostnader: kr {data.conditionReport.findings.totalCost.toLocaleString('nb-NO')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Konkurranseanalyse Dashboard */}
      {showCompetitorAnalysis && (
        <CompetitorDashboard 
          analysis={data.competitorAnalysis}
          onClose={() => setShowCompetitorAnalysis(false)}
        />
      )}
    </div>
  );
}