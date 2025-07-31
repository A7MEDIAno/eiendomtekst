// components/SimplifiedWizard.js - FORENKLET WIZARD MED ALLE FUNKSJONER
import { useState, useCallback, useRef } from 'react';
import { exportToWord, exportToPDF, downloadFile } from '../lib/exportUtils';
import CompetitorDashboard from './wizard/CompetitorDashboard';

export default function SimplifiedWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  // All data i ett objekt - MED ALLE FEATURES
  const [wizardData, setWizardData] = useState({
    // Input data
    galleryUrl: '',
    imageUrls: [],
    propertyInfo: '',
    targetGroup: 'standard',
    
    // Analyse resultater
    results: [],
    address: '',
    propertyType: null,
    intro: '',
    conditionReport: null,
    marketData: null,
    competitorAnalysis: null,
    locationInfo: null,
    
    // Eksport
    exportFormat: 'word',
    includeAllAnalyses: true
  });

  // Oppdater data
  const updateData = useCallback((key, value) => {
    setWizardData(prev => ({ ...prev, [key]: value }));
  }, []);

  // STEP 1: Alt-i-ett input og analyse
  const Step1InputAndAnalyze = () => {
    const [previewImages, setPreviewImages] = useState([]);
    const [conditionReportFile, setConditionReportFile] = useState(null);
    const [autoAnalyzeEnabled, setAutoAnalyzeEnabled] = useState(true);

    // Forhåndsvis galleri og start auto-analyse hvis enabled
    const previewGallery = async () => {
      if (!wizardData.galleryUrl) return;
      
      setProcessingStage('Henter bilder...');
      setError('');
      
      try {
        const response = await fetch('/api/preview-gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ galleryUrl: wizardData.galleryUrl })
        });
        
        if (response.ok) {
          const result = await response.json();
          setPreviewImages(result.images || []);
          updateData('imageUrls', result.images || []);
          if (result.address) {
            updateData('address', result.address);
          }
          
          // Auto-start full analyse hvis enabled
          if (autoAnalyzeEnabled && result.images.length > 0) {
            await runCompleteAnalysis(result.images, result.address);
          }
        }
      } catch (err) {
        setError('Kunne ikke hente forhåndsvisning');
      }
    };

    // Kjør KOMPLETT analyse med alle features
    const runCompleteAnalysis = async (images = wizardData.imageUrls, address = wizardData.address) => {
      setIsProcessing(true);
      
      try {
        setProcessingStage('🚀 Starter komplett analyse...');
        
        // Bruk den forbedrede kombinerte API-en
        const response = await fetch('/api/analyze-all-enhanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            galleryUrl: wizardData.galleryUrl,
            imageUrls: images,
            mode: 'direct', // Vi har allerede hentet bildene
            propertyInfo: wizardData.propertyInfo,
            targetGroup: wizardData.targetGroup,
            includeIntro: true,
            includeMarketData: true,
            includeLocationInfo: true, 
            includeCompetitors: true,
            includePropertyType: true
          })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
          // Oppdater all data på en gang
          updateMultipleData({
            results: result.results,
            address: result.address || address,
            propertyType: result.propertyType,
            intro: result.intro,
            marketData: result.marketData,
            locationInfo: result.locationInfo,
            competitorAnalysis: result.competitorAnalysis
          });

          // Hvis tilstandsrapport er lastet opp, analyser den også
          if (conditionReportFile) {
            setProcessingStage('📋 Analyserer tilstandsrapport...');
            const reportAnalysis = await analyzeConditionReport(conditionReportFile);
            updateData('conditionReport', reportAnalysis);
          }

          setProcessingStage('');
          setCurrentStep(2);
        } else {
          throw new Error(result.error || 'Analyse feilet');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsProcessing(false);
        setProcessingStage('');
      }
    };

    // API-funksjon for tilstandsrapport (beholdes separat da den bruker FormData)
    const analyzeConditionReport = async (file) => {
      const formData = new FormData();
      formData.append('report', file);
      
      const response = await fetch('/api/analyze-condition-report', {
        method: 'POST',
        body: formData
      });
      return await response.json();
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file && file.type === 'application/pdf') {
        setConditionReportFile(file);
      }
    };

    return (
      <div className="space-y-6">
        {/* Gallery URL med auto-analyse toggle */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Galleri URL
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoAnalyzeEnabled}
                onChange={(e) => setAutoAnalyzeEnabled(e.target.checked)}
                className="rounded border-gray-500 text-blue-600"
              />
              <span className="text-gray-400">Auto-analyser alt</span>
            </label>
          </div>
          <div className="flex gap-3">
            <input
              type="url"
              value={wizardData.galleryUrl}
              onChange={(e) => updateData('galleryUrl', e.target.value)}
              placeholder="https://www.pholio.no/galleri/300781"
              className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
              disabled={isProcessing}
            />
            <button
              onClick={previewGallery}
              disabled={!wizardData.galleryUrl || isProcessing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {isProcessing ? '⏳' : '🚀'} Start
            </button>
          </div>
        </div>

        {/* Processing status */}
        {isProcessing && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div>
                <p className="text-blue-300 font-medium">Prosesserer...</p>
                <p className="text-sm text-blue-200">{processingStage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview images */}
        {previewImages.length > 0 && (
          <div className="bg-gray-700/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-3">
              Fant {previewImages.length} bilder
            </p>
            <div className="grid grid-cols-8 gap-2">
              {previewImages.slice(0, 16).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Preview ${idx + 1}`}
                  className="aspect-square rounded object-cover"
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick settings */}
        <div className="grid grid-cols-2 gap-4">
          {/* Property info */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Boliginformasjon
            </label>
            <textarea
              value={wizardData.propertyInfo}
              onChange={(e) => updateData('propertyInfo', e.target.value)}
              placeholder="P-rom, byggeår, etasje..."
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
              rows={3}
              disabled={isProcessing}
            />
          </div>

          {/* Tilstandsrapport */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tilstandsrapport
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full h-[76px] bg-orange-600/20 hover:bg-orange-600/30 border border-orange-400/30 text-orange-300 rounded-lg text-sm"
            >
              {conditionReportFile ? (
                <span>✓ {conditionReportFile.name}</span>
              ) : (
                <span>📄 Last opp PDF</span>
              )}
            </button>
          </div>
        </div>

        {/* Target group - kompakt */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Målgruppe
          </label>
          <div className="flex gap-2">
            {[
              { key: 'standard', icon: '📄' },
              { key: 'family', icon: '👨‍👩‍👧‍👦' },
              { key: 'firstTime', icon: '🔑' },
              { key: 'investor', icon: '📈' },
              { key: 'senior', icon: '🏡' }
            ].map(group => (
              <button
                key={group.key}
                onClick={() => updateData('targetGroup', group.key)}
                disabled={isProcessing}
                className={`flex-1 py-2 rounded-lg ${
                  wizardData.targetGroup === group.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {group.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Manual analyze button hvis auto er av */}
        {!autoAnalyzeEnabled && previewImages.length > 0 && !isProcessing && (
          <button
            onClick={() => runCompleteAnalysis()}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            🤖 Kjør komplett analyse
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}
      </div>
    );
  };

  // STEP 2: Review All Results
  const Step2ReviewAll = () => {
    const [editIndex, setEditIndex] = useState(null);
    const [editText, setEditText] = useState('');
    const [activeTab, setActiveTab] = useState('descriptions');
    const [showCompetitors, setShowCompetitors] = useState(false);

    const startEdit = (index) => {
      setEditIndex(index);
      setEditText(wizardData.results[index].description);
    };

    const saveEdit = () => {
      const newResults = [...wizardData.results];
      newResults[editIndex].description = editText;
      updateData('results', newResults);
      setEditIndex(null);
    };

    const regenerate = async (index) => {
      const result = wizardData.results[index];
      try {
        const response = await fetch('/api/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: result.imageUrl,
            imageType: result.imageType,
            targetGroup: wizardData.targetGroup
          })
        });

        if (response.ok) {
          const { description } = await response.json();
          const newResults = [...wizardData.results];
          newResults[index].description = description;
          updateData('results', newResults);
        }
      } catch (err) {
        console.error('Regenerate failed:', err);
      }
    };

    // Tab navigation
    const tabs = [
      { id: 'descriptions', name: 'Bildebeskrivelser', icon: '📸' },
      { id: 'property', name: 'Boliginfo', icon: '🏠' },
      { id: 'market', name: 'Marked', icon: '📊' },
      { id: 'location', name: 'Område', icon: '🗺️' }
    ];

    return (
      <div className="space-y-6">
        {/* Header med adresse */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-xl font-bold text-white mb-2">
            {wizardData.address}
          </h3>
          {wizardData.propertyType && (
            <p className="text-sm text-gray-300">
              {wizardData.propertyType.typeName} • {Math.round(wizardData.propertyType.confidence * 100)}% sikker
            </p>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 border-b border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[400px]">
          {/* Bildebeskrivelser */}
          {activeTab === 'descriptions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wizardData.results.map((result, index) => (
                <div key={index} className="bg-gray-700/30 rounded-lg overflow-hidden">
                  <img
                    src={result.imageUrl}
                    alt={result.imageType}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-300">
                        {result.imageType}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(index)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => regenerate(index)}
                          className="text-purple-400 hover:text-purple-300 text-sm"
                        >
                          🔄
                        </button>
                      </div>
                    </div>
                    
                    {editIndex === index ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 rounded text-white text-sm"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="flex-1 bg-green-600 text-white py-1 rounded text-sm"
                          >
                            Lagre
                          </button>
                          <button
                            onClick={() => setEditIndex(null)}
                            className="flex-1 bg-gray-600 text-white py-1 rounded text-sm"
                          >
                            Avbryt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-300 text-sm">{result.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Boliginfo */}
          {activeTab === 'property' && (
            <div className="space-y-4">
              {/* Intro */}
              {wizardData.intro && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Om boligen</h4>
                  <p className="text-gray-300">{wizardData.intro}</p>
                </div>
              )}

              {/* Property info */}
              {wizardData.propertyInfo && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Boliginformasjon</h4>
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap">
                    {wizardData.propertyInfo}
                  </pre>
                </div>
              )}

              {/* Tilstandsrapport */}
              {wizardData.conditionReport && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <h4 className="font-medium text-orange-300 mb-2">📋 Tilstandsrapport</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>Byggeår: {wizardData.conditionReport.findings.buildingYear}</p>
                    <p>Tilstand: {wizardData.conditionReport.findings.generalCondition}</p>
                    {wizardData.conditionReport.findings.totalCost && (
                      <p>Kostnader: kr {wizardData.conditionReport.findings.totalCost.toLocaleString('nb-NO')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Marked */}
          {activeTab === 'market' && (
            <div className="space-y-4">
              {/* Markedsdata */}
              {wizardData.marketData?.analysis && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="font-medium text-green-300 mb-3">📊 Markedsanalyse</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Snitt m²-pris</p>
                      <p className="text-white font-medium">
                        {wizardData.marketData.analysis.avgPricePerSqm?.toLocaleString('nb-NO')} kr
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Prisvekst</p>
                      <p className="text-white font-medium">
                        {wizardData.marketData.analysis.priceGrowthPercent}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Liggetid</p>
                      <p className="text-white font-medium">
                        {wizardData.marketData.marketIndicators?.avgDaysOnMarket} dager
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Antall salg</p>
                      <p className="text-white font-medium">
                        {wizardData.marketData.analysis.relevantSales}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Konkurranseanalyse */}
              {wizardData.competitorAnalysis && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-amber-300">🔍 Konkurranseanalyse</h4>
                    <button
                      onClick={() => setShowCompetitors(!showCompetitors)}
                      className="text-sm text-amber-300 hover:text-amber-200"
                    >
                      {showCompetitors ? 'Skjul' : 'Vis detaljer'}
                    </button>
                  </div>
                  {showCompetitors && (
                    <CompetitorDashboard
                      analysis={wizardData.competitorAnalysis}
                      onClose={() => setShowCompetitors(false)}
                    />
                  )}
                  {!showCompetitors && (
                    <p className="text-sm text-gray-300">
                      {wizardData.competitorAnalysis.totalListings} konkurrerende boliger • 
                      {wizardData.competitorAnalysis.advantages?.length || 0} konkurransefortrinn
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Område */}
          {activeTab === 'location' && wizardData.locationInfo && (
            <div className="space-y-4">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Områdebeskrivelse</h4>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {wizardData.locationInfo.areaDescription}
                </p>
              </div>
              
              {wizardData.locationInfo.sunConditions && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-300 mb-2">☀️ Solforhold</h4>
                  <div className="text-sm text-gray-300">
                    <p>Soltimer {wizardData.locationInfo.season}: {
                      wizardData.locationInfo.sunConditions.dailySunHours?.[wizardData.locationInfo.season]
                    } timer/dag</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            ← Tilbake
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            ✓ Gå til eksport
          </button>
        </div>
      </div>
    );
  };

  // STEP 3: Export med alle data
  const Step3Export = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState('');

    const handleExport = async () => {
      setIsExporting(true);
      setExportStatus('');

      try {
        const exportData = {
          address: wizardData.address,
          propertyInfo: wizardData.propertyInfo,
          propertyIntro: wizardData.intro,
          results: wizardData.results,
          
          // Inkluder alle analyser hvis tilgjengelig
          conditionReport: wizardData.includeAllAnalyses ? wizardData.conditionReport : null,
          marketData: wizardData.includeAllAnalyses ? wizardData.marketData : null,
          locationInfo: wizardData.includeAllAnalyses ? wizardData.locationInfo : null,
          competitorAnalysis: wizardData.includeAllAnalyses ? wizardData.competitorAnalysis : null,
          propertyType: wizardData.propertyType
        };

        let blob;
        let filename;
        const date = new Date().toISOString().split('T')[0];
        const addressStr = (wizardData.address || 'eiendom').replace(/[^a-z0-9]/gi, '-').toLowerCase();
        
        if (wizardData.exportFormat === 'word') {
          blob = await exportToWord(exportData);
          filename = `${addressStr}-${date}.docx`;
        } else {
          blob = await exportToPDF(exportData);
          filename = `${addressStr}-${date}.pdf`;
        }

        downloadFile(blob, filename);
        setExportStatus('✓ Lastet ned!');
      } catch (err) {
        setExportStatus('❌ Eksport feilet');
        console.error('Export error:', err);
      } finally {
        setIsExporting(false);
      }
    };

    const copyAllDescriptions = () => {
      const allText = wizardData.results
        .map(r => `${r.imageType}: ${r.description}`)
        .join('\n\n');
      navigator.clipboard.writeText(allText);
      setExportStatus('✓ Kopiert til utklippstavle!');
    };

    // Beregn statistikk
    const stats = {
      images: wizardData.results.length,
      words: wizardData.results.reduce((acc, r) => acc + r.description.split(' ').length, 0),
      analyses: [
        wizardData.marketData && 'Markedsdata',
        wizardData.locationInfo && 'Områdeinfo', 
        wizardData.competitorAnalysis && 'Konkurrenter',
        wizardData.conditionReport && 'Tilstandsrapport'
      ].filter(Boolean).length
    };

    return (
      <div className="space-y-6">
        {/* Success summary */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">
            🎉 Alt er klart!
          </h3>
          <p className="text-gray-300 mb-4">
            {stats.images} bilder analysert • {stats.words} ord generert • {stats.analyses} tilleggsanalyser
          </p>
          
          {/* Quick copy button */}
          <button
            onClick={copyAllDescriptions}
            className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            📋 Kopier alle beskrivelser
          </button>
        </div>

        {/* Export options */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Velg eksportformat
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => updateData('exportFormat', 'word')}
              className={`p-6 rounded-lg border-2 transition-all ${
                wizardData.exportFormat === 'word'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="font-medium text-white">Word</div>
              <div className="text-xs text-gray-400 mt-1">Redigerbart dokument</div>
            </button>
            <button
              onClick={() => updateData('exportFormat', 'pdf')}
              className={`p-6 rounded-lg border-2 transition-all ${
                wizardData.exportFormat === 'pdf'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="text-3xl mb-2">📑</div>
              <div className="font-medium text-white">PDF</div>
              <div className="text-xs text-gray-400 mt-1">Ferdig formatert</div>
            </button>
          </div>
        </div>

        {/* Export settings */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={wizardData.includeAllAnalyses}
              onChange={(e) => updateData('includeAllAnalyses', e.target.checked)}
              className="rounded border-gray-500 text-blue-600"
            />
            <span className="text-gray-300">
              Inkluder alle analyser (marked, område, konkurrenter, tilstand)
            </span>
          </label>
        </div>

        {/* Export status */}
        {exportStatus && (
          <div className={`p-4 rounded-lg text-center ${
            exportStatus.includes('✓') 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <p className={exportStatus.includes('✓') ? 'text-green-300' : 'text-red-300'}>
              {exportStatus}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {isExporting ? '⏳ Eksporterer...' : '💾 Last ned komplett rapport'}
          </button>

          <button
            onClick={() => {
              // Reset wizard
              setWizardData({
                galleryUrl: '',
                imageUrls: [],
                propertyInfo: '',
                targetGroup: 'standard',
                results: [],
                address: '',
                propertyType: null,
                intro: '',
                conditionReport: null,
                marketData: null,
                competitorAnalysis: null,
                locationInfo: null,
                exportFormat: 'word',
                includeAllAnalyses: true
              });
              setCurrentStep(1);
            }}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            🔄 Start på nytt
          </button>
        </div>

        {/* Preview of what will be exported */}
        <details className="bg-gray-700/30 rounded-lg p-4">
          <summary className="cursor-pointer text-gray-300 font-medium">
            👁️ Forhåndsvisning av innhold
          </summary>
          <div className="mt-4 space-y-2 text-sm text-gray-400">
            <p>✓ {wizardData.address}</p>
            <p>✓ {stats.images} bildebeskrivelser</p>
            {wizardData.intro && <p>✓ Introduksjonstekst</p>}
            {wizardData.propertyType && <p>✓ Boligtype: {wizardData.propertyType.typeName}</p>}
            {wizardData.marketData && wizardData.includeAllAnalyses && <p>✓ Markedsanalyse</p>}
            {wizardData.locationInfo && wizardData.includeAllAnalyses && <p>✓ Områdeinformasjon</p>}
            {wizardData.competitorAnalysis && wizardData.includeAllAnalyses && <p>✓ Konkurranseanalyse</p>}
            {wizardData.conditionReport && wizardData.includeAllAnalyses && <p>✓ Tilstandsrapport</p>}
          </div>
        </details>
      </div>
    );
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1InputAndAnalyze />;
      case 2:
        return <Step2ReviewAll />;
      case 3:
        return <Step3Export />;
      default:
        return <Step1InputAndAnalyze />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            ✨ A7 Generate Pro - Forenklet
          </h1>
          <p className="text-gray-400">
            Alt-i-ett løsning for eiendomsbeskrivelser
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {['1. Input & Analyse', '2. Gjennomgang', '3. Eksport'].map((label, idx) => (
              <span
                key={idx}
                className={`text-sm ${
                  idx + 1 <= currentStep ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-gray-800/50 rounded-xl p-6 md:p-8 backdrop-blur-sm">
          {renderStep()}
        </div>

        {/* Quick stats */}
        {currentStep === 2 && wizardData.results.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{wizardData.results.length}</div>
              <div className="text-xs text-gray-400">Bilder analysert</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {wizardData.marketData ? '✓' : '-'}
              </div>
              <div className="text-xs text-gray-400">Markedsdata</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {wizardData.competitorAnalysis ? '✓' : '-'}
              </div>
              <div className="text-xs text-gray-400">Konkurrenter</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {wizardData.locationInfo ? '✓' : '-'}
              </div>
              <div className="text-xs text-gray-400">Områdeinfo</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {wizardData.conditionReport ? '✓' : '-'}
              </div>
              <div className="text-xs text-gray-400">Tilstandsrapport</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}