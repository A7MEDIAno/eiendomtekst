// pages/index.js - OPPDATERT MED SIMPLIFIED WIZARD
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { browserCache } from '../lib/cacheUtils';
import { exportToWord, exportToPDF, downloadFile } from '../lib/exportUtils';
import { WizardProvider } from '../contexts/WizardContext';
import WizardContainer from '../components/wizard/WizardContainer';
import SimplifiedWizard from '../components/SimplifiedWizard'; // NY IMPORT

export default function Home() {
  const [wizardMode, setWizardMode] = useState(false);
  
  // Check if user prefers wizard mode
  useEffect(() => {
    const preferWizard = localStorage.getItem('preferWizardMode');
    if (preferWizard === 'true') {
      setWizardMode(true);
    }
  }, []);

  const toggleWizardMode = () => {
    const newMode = !wizardMode;
    setWizardMode(newMode);
    localStorage.setItem('preferWizardMode', newMode.toString());
  };

  if (wizardMode) {
    return (
      <>
        <Head>
          <title>A7 Generate Pro - Forenklet</title>
          <meta name="description" content="Alt-i-ett AI-drevne eiendomsbeskrivelser" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <SimplifiedWizard />
      </>
    );
  }

  // Classic mode continues below...
  return <ClassicMode toggleWizardMode={toggleWizardMode} />;
}

function ClassicMode({ toggleWizardMode }) {
  const [mode, setMode] = useState('gallery');
  const [galleryUrl, setGalleryUrl] = useState('');
  const [imageUrls, setImageUrls] = useState(['']);
  const [targetGroup, setTargetGroup] = useState('standard');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [propertyAddress, setPropertyAddress] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [useInspiration, setUseInspiration] = useState(false);
  const [inspirationText, setInspirationText] = useState('');
  const [propertyInfo, setPropertyInfo] = useState('');
  
  // States for Om boligen
  const [usePropertyIntro, setUsePropertyIntro] = useState(true);
  const [propertyIntro, setPropertyIntro] = useState('');
  const [introStyle, setIntroStyle] = useState('professional');
  const [isGeneratingIntro, setIsGeneratingIntro] = useState(false);
  const [meglerInfo, setMeglerInfo] = useState('');
  const [targetGroupSuggestion, setTargetGroupSuggestion] = useState(null);
  
  // States for eksport
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);
  
  // State for områdeinfo
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  
  // States for tilstandsrapport
  const [conditionReport, setConditionReport] = useState(null);
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const fileInputRef = useRef(null);

  const targetGroups = {
    standard: { 
      name: 'Standard', 
      icon: '📄',
      description: 'Nøytral, faktabasert for bred målgruppe',
      color: 'from-gray-500 to-gray-700'
    },
    family: { 
      name: 'Familie', 
      icon: '👨‍👩‍👧‍👦',
      description: 'Fokus på sikkerhet og praktiske løsninger',
      color: 'from-blue-500 to-blue-700'
    },
    firstTime: { 
      name: 'Førstegangskjøper', 
      icon: '🔑',
      description: 'Vekt på vedlikehold og økonomi',
      color: 'from-green-500 to-green-700'
    },
    investor: { 
      name: 'Investor', 
      icon: '📈',
      description: 'Standard og utleiepotensial',
      color: 'from-purple-500 to-purple-700'
    },
    senior: { 
      name: 'Senior', 
      icon: '🏡',
      description: 'Tilgjengelighet og vedlikehold',
      color: 'from-amber-500 to-amber-700'
    }
  };

  const introStyles = {
    professional: { name: 'Profesjonell', icon: '💼' },
    narrative: { name: 'Fortellende', icon: '📖' },
    compact: { name: 'Kompakt', icon: '📋' }
  };

  const imageTypeTranslations = {
    'stue': 'Stue',
    'kjøkken': 'Kjøkken',
    'bad': 'Bad',
    'soverom': 'Soverom',
    'gang': 'Gang/Entré',
    'wc': 'WC',
    'vaskerom': 'Vaskerom',
    'spisestue': 'Spisestue',
    'hjemmekontor': 'Hjemmekontor',
    'balkong': 'Balkong',
    'terrasse': 'Terrasse',
    'hage': 'Hage',
    'utsikt': 'Utsikt',
    'fasade': 'Fasade',
    'fellesarealer': 'Fellesarealer',
    'parkering': 'Parkering',
    'bod': 'Bod/Kjeller',
    'planløsning': 'Planløsning',
    'annet': 'Annet'
  };

  // Hent områdeinfo basert på adresse (OPPDATERT TIL V2)
  const fetchLocationInfo = async () => {
    const addressToUse = manualAddress || propertyAddress;
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

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Legg til områdeinfo i propertyInfo
        const existingInfo = propertyInfo ? propertyInfo + '\n\n' : '';
        setPropertyInfo(existingInfo + data.generatedInfo);
      } else {
        setError(data.error || 'Kunne ikke hente områdeinformasjon');
      }
    } catch (err) {
      setError('Feil ved henting av områdeinfo');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Analyser tilstandsrapport
  const analyzeConditionReport = async (file) => {
    if (!file) return;

    setIsAnalyzingReport(true);
    setError('');

    const formData = new FormData();
    formData.append('report', file);

    try {
      const response = await fetch('/api/analyze-condition-report', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConditionReport(data);
        
        // Legg til info i propertyInfo
        const existingInfo = propertyInfo ? propertyInfo + '\n\n' : '';
        setPropertyInfo(existingInfo + data.formattedInfo);
        
        // Vis anbefalinger
        if (data.recommendations.targetGroup.includes('investor')) {
          setTargetGroup('investor');
        } else if (data.recommendations.targetGroup.includes('handy')) {
          setTargetGroup('firstTime');
        }
      } else {
        setError(data.error || 'Kunne ikke analysere tilstandsrapport');
      }
    } catch (err) {
      setError('Feil ved analyse av tilstandsrapport');
    } finally {
      setIsAnalyzingReport(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      analyzeConditionReport(file);
    } else {
      setError('Vennligst velg en PDF-fil');
    }
  };

  // Sjekk cache når galleryUrl endres
  useEffect(() => {
    if (mode === 'gallery' && galleryUrl) {
      const cached = browserCache.getResults(galleryUrl);
      if (cached) {
        setPropertyAddress(cached.address || '');
        setPropertyInfo(cached.propertyInfo || '');
      }
    }
  }, [galleryUrl, mode]);

  // Generer Om boligen tekst
  const generatePropertyIntro = async () => {
    if (!propertyInfo && !propertyAddress) {
      setError('Legg inn boliginformasjon først');
      return;
    }

    setIsGeneratingIntro(true);
    try {
      const response = await fetch('/api/generate-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyInfo,
          address: propertyAddress,
          style: introStyle,
          meglerInfo
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setPropertyIntro(data.intro);
        
        if (data.targetGroupSuggestion && targetGroup === 'standard') {
          setTargetGroupSuggestion(data.targetGroupSuggestion);
        }
      } else {
        setError(data.error || 'Kunne ikke generere introduksjon');
      }
    } catch (err) {
      setError('Feil ved generering av introduksjon');
    } finally {
      setIsGeneratingIntro(false);
    }
  };

  const analyzeGallery = async () => {
    // Sjekk cache først
    if (mode === 'gallery' && galleryUrl) {
      const cached = browserCache.getResults(galleryUrl);
      if (cached && cached.results) {
        const useCached = window.confirm(
          'Fant tidligere analyse av dette galleriet. Vil du bruke den?\n\n' +
          'Ja = Bruk tidligere resultater (gratis)\n' +
          'Nei = Kjør ny analyse'
        );
        
        if (useCached) {
          setResults(cached.results);
          setPropertyAddress(cached.address || '');
          setPropertyInfo(cached.propertyInfo || '');
          return;
        }
      }
    }

    setLoading(true);
    setError('');
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setPropertyAddress('');

    try {
      if (mode === 'gallery') {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            galleryUrl, 
            targetGroup,
            inspirationText: useInspiration ? inspirationText : null,
            propertyInfo: propertyInfo
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Noe gikk galt');
        }

        // Read streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                
                switch (data.type) {
                  case 'metadata':
                    setPropertyAddress(data.address);
                    setProgress({ current: 0, total: data.totalImages });
                    break;
                  
                  case 'progress':
                    setProgress({ current: data.current, total: data.total });
                    break;
                  
                  case 'result':
                    setResults(prev => [...prev, { ...data.result, targetGroup }]);
                    break;
                  
                  case 'complete':
                    const finalResults = data.results.map(r => ({ ...r, targetGroup }));
                    setResults(finalResults);
                    
                    // Lagre i cache
                    browserCache.saveResults(
                      galleryUrl, 
                      finalResults, 
                      data.address,
                      propertyInfo
                    );
                    break;
                }
              } catch (e) {
                console.error('Failed to parse line:', line, e);
              }
            }
          }
        }
        
        // Auto-generer intro hvis aktivert
        if (usePropertyIntro && propertyInfo) {
          generatePropertyIntro();
        }
        
      } else {
        // Direct URL mode
        const response = await fetch('/api/analyze-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            imageUrls: imageUrls.filter(url => url.trim()), 
            targetGroup,
            propertyInfo: propertyInfo
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Noe gikk galt');
        }

        setResults(data.results.map(r => ({ ...r, targetGroup })));
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // Eksporter funksjoner
  const handleExport = async (format) => {
    setIsExporting(true);
    setExportFormat(format);
    
    try {
      const exportData = {
        address: propertyAddress,
        propertyInfo,
        propertyIntro: usePropertyIntro ? propertyIntro : null,
        results: results.map(r => ({
          ...r,
          imageTypeNorwegian: imageTypeTranslations[r.imageType] || r.imageType
        }))
      };

      let blob;
      let filename;
      const dateStr = new Date().toISOString().split('T')[0];
      const addressStr = propertyAddress.replace(/[^a-z0-9]/gi, '-').toLowerCase();

      if (format === 'word') {
        blob = await exportToWord(exportData);
        filename = `a7-generate-${addressStr}-${dateStr}.docx`;
      } else if (format === 'pdf') {
        blob = await exportToPDF(exportData);
        filename = `a7-generate-${addressStr}-${dateStr}.pdf`;
      } else {
        let fullText = '';
        
        if (usePropertyIntro && propertyIntro) {
          fullText = propertyIntro + '\n\n';
        }
        
        if (propertyInfo) {
          fullText += `BOLIGINFORMASJON:\n${propertyInfo}\n\n`;
        }
        
        if (propertyAddress) {
          fullText += `ADRESSE: ${propertyAddress}\n\n`;
        }
        
        fullText += 'BILDEBESKRIVELSER:\n\n';
        
        fullText += results
          .map((r, i) => {
            const type = imageTypeTranslations[r.imageType] || r.imageType || 'Bilde';
            return `${type} (Bilde ${i + 1}):\n${r.description}`;
          })
          .join('\n\n');
        
        blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
        filename = `a7-generate-${addressStr}-${dateStr}.txt`;
      }

      downloadFile(blob, filename);
    } catch (err) {
      console.error('Export error:', err);
      setError('Feil ved eksport: ' + err.message);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const addImageUrl = () => setImageUrls([...imageUrls, '']);
  const updateImageUrl = (index, value) => {
    const updated = [...imageUrls];
    updated[index] = value;
    setImageUrls(updated);
  };
  const removeImageUrl = (index) => setImageUrls(imageUrls.filter((_, i) => i !== index));

  const copyDescription = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllDescriptions = () => {
    let fullText = '';
    
    if (usePropertyIntro && propertyIntro) {
      fullText = propertyIntro + '\n\n';
    }
    
    if (propertyInfo) {
      fullText += `BOLIGINFORMASJON:\n${propertyInfo}\n\n`;
    }
    
    if (propertyAddress) {
      fullText += `ADRESSE: ${propertyAddress}\n\n`;
    }
    
    fullText += 'BILDEBESKRIVELSER:\n\n';
    
    fullText += results
      .map((r, i) => {
        const type = imageTypeTranslations[r.imageType] || r.imageType || 'Bilde';
        return `${type} (Bilde ${i + 1}):\n${r.description}`;
      })
      .join('\n\n');
      
    navigator.clipboard.writeText(fullText);
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <>
      <Head>
        <title>A7 Generate - AI-drevne eiendomsbeskrivelser</title>
        <meta name="description" content="Generer profesjonelle bildebeskrivelser for eiendomsprospekter med AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-10 opacity-20">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          {/* Header with mode toggle */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center gap-4 mb-4">
              <h1 className="text-6xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                A7 Generate
              </h1>
              <button
                onClick={toggleWizardMode}
                className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                title="Prøv forenklet versjon"
              >
                <span>✨</span>
                <span className="text-sm">Forenklet versjon</span>
              </button>
            </div>
            <p className="text-xl text-gray-300">
              AI-drevne eiendomsbeskrivelser på sekunder
            </p>
          </div>

          {/* Auto-filled address */}
          {propertyAddress && !loading && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="backdrop-blur-md bg-green-500/20 border border-green-400/30 rounded-xl p-4">
                <p className="text-sm text-green-300">
                  <span className="font-semibold">📍 Eiendom identifisert:</span> {propertyAddress}
                </p>
              </div>
            </div>
          )}

          {/* Target group suggestion */}
          {targetGroupSuggestion && targetGroup === 'standard' && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="backdrop-blur-md bg-blue-500/20 border border-blue-400/30 rounded-xl p-4">
                <p className="text-sm text-blue-300 mb-2">
                  <strong>Foreslått målgruppe:</strong> {targetGroups[targetGroupSuggestion.group].name}
                </p>
                <p className="text-xs text-blue-200 mb-3">
                  {targetGroupSuggestion.reason}
                </p>
                <button
                  onClick={() => {
                    setTargetGroup(targetGroupSuggestion.group);
                    setTargetGroupSuggestion(null);
                  }}
                  className="text-sm bg-blue-600/80 hover:bg-blue-700/80 text-white px-4 py-2 rounded-lg transition-all"
                >
                  Bruk foreslått målgruppe
                </button>
              </div>
            </div>
          )}

          {/* Mode selector */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-1">
              <div className="flex gap-1">
                <button
                  onClick={() => setMode('gallery')}
                  className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                    mode === 'gallery' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg mr-2">📸</span> Galleri URL
                </button>
                <button
                  onClick={() => setMode('direct')}
                  className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                    mode === 'direct' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg mr-2">🔗</span> Direkte URLer
                </button>
              </div>
            </div>
          </div>

          {/* Target groups */}
          <div className="max-w-5xl mx-auto mb-10">
            <h3 className="text-lg font-semibold text-gray-300 mb-4 text-center">Velg målgruppe</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(targetGroups).map(([key, group]) => (
                <button
                  key={key}
                  onClick={() => setTargetGroup(key)}
                  className={`relative p-4 rounded-xl backdrop-blur-md transition-all duration-300 ${
                    targetGroup === key
                      ? 'bg-gradient-to-br ' + group.color + ' text-white shadow-xl scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/20'
                  }`}
                  title={group.description}
                >
                  <div className="text-2xl mb-1">{group.icon}</div>
                  <div className="text-sm font-medium">{group.name}</div>
                </button>
              ))}
            </div>
            {targetGroup && (
              <p className="text-center text-sm text-gray-400 mt-3">
                {targetGroups[targetGroup].description}
              </p>
            )}
          </div>

          {/* Main input section */}
          <div className="max-w-3xl mx-auto mb-10">
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8">
              
              {/* Property info with location fetch */}
              <div className="mb-6">
                <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-400/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-200">
                      📝 Boliginformasjon
                    </label>
                    <button
                      onClick={fetchLocationInfo}
                      disabled={isFetchingLocation || (!propertyAddress && !manualAddress)}
                      className="text-xs bg-blue-600/80 hover:bg-blue-700/80 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-2"
                    >
                      {isFetchingLocation ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Henter...
                        </>
                      ) : (
                        <>
                          <span>🗺️</span>
                          Hent områdeinfo
                        </>
                      )}
                    </button>
                  </div>
                  
                  {!propertyAddress && (
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="Skriv inn adresse for å hente områdeinfo..."
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 mb-3"
                    />
                  )}
                  
                  <textarea
                    value={propertyInfo}
                    onChange={(e) => setPropertyInfo(e.target.value)}
                    placeholder="Legg inn informasjon om boligen..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 font-mono text-sm"
                    rows={8}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Tips: Klikk "Hent områdeinfo" for automatisk info om beliggenhet og solforhold
                  </p>
                </div>
              </div>

              {/* Tilstandsrapport opplasting */}
              <div className="mb-6">
                <div className="backdrop-blur-sm bg-orange-500/10 border border-orange-400/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-200">
                      📋 Tilstandsrapport (PDF)
                    </label>
                    {conditionReport && (
                      <span className="text-xs text-green-400">
                        ✓ Analysert
                      </span>
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
                  
                  {conditionReport && (
                    <div className="mt-4 text-sm text-gray-300 space-y-1">
                      <p>✓ Byggeår: {conditionReport.findings.buildingYear || 'Ukjent'}</p>
                      <p>✓ Tilstand: {conditionReport.findings.generalCondition}</p>
                      {conditionReport.findings.totalCost && (
                        <p>✓ Estimerte kostnader: kr {conditionReport.findings.totalCost.toLocaleString('nb-NO')}</p>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-2">
                    Last opp tilstandsrapport for automatisk analyse og tilpassede beskrivelser
                  </p>
                </div>
              </div>

              {/* Om boligen generator */}
              <div className="mb-6">
                <div className="backdrop-blur-sm bg-green-500/10 border border-green-400/30 rounded-xl p-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-4">
                    <input
                      type="checkbox"
                      checked={usePropertyIntro}
                      onChange={(e) => setUsePropertyIntro(e.target.checked)}
                      className="rounded border-gray-500 text-green-600 focus:ring-green-500"
                    />
                    Generer "Om boligen" introduksjon
                  </label>
                  
                  {usePropertyIntro && (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={meglerInfo}
                        onChange={(e) => setMeglerInfo(e.target.value)}
                        placeholder="Meglerfirma/navn (valgfritt)"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                      />
                      
                      <div className="flex gap-2">
                        {Object.entries(introStyles).map(([key, style]) => (
                          <button
                            key={key}
                            onClick={() => setIntroStyle(key)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                              introStyle === key
                                ? 'bg-green-600 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {style.icon} {style.name}
                          </button>
                        ))}
                      </div>
                      
                      {propertyIntro && (
                        <textarea
                          value={propertyIntro}
                          onChange={(e) => setPropertyIntro(e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                          rows={8}
                        />
                      )}
                      
                      <button
                        onClick={generatePropertyIntro}
                        disabled={isGeneratingIntro || (!propertyInfo && !propertyAddress)}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-all"
                      >
                        {isGeneratingIntro ? '⏳ Genererer...' : '✨ Generer introduksjon'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* URL input */}
              {mode === 'gallery' ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Galleri URL
                    </label>
                    <input
                      type="url"
                      value={galleryUrl}
                      onChange={(e) => setGalleryUrl(e.target.value)}
                      placeholder="https://www.pholio.no/galleri/300781"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                    />
                  </div>
                  
                  {/* Inspiration toggle */}
                  <div className="mb-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <input
                        type="checkbox"
                        checked={useInspiration}
                        onChange={(e) => setUseInspiration(e.target.checked)}
                        className="rounded border-gray-500"
                      />
                      Bruk eksisterende tekst som inspirasjon
                    </label>
                    {useInspiration && (
                      <textarea
                        value={inspirationText}
                        onChange={(e) => setInspirationText(e.target.value)}
                        placeholder="Lim inn eksisterende beskrivelser..."
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm mt-2"
                        rows={4}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Bilde-URLer
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => updateImageUrl(index, e.target.value)}
                          placeholder="https://eksempel.no/bilde.jpg"
                          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm"
                        />
                        {imageUrls.length > 1 && (
                          <button
                            onClick={() => removeImageUrl(index)}
                            className="px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addImageUrl}
                    className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                  >
                    + Legg til flere bilder
                  </button>
                </div>
              )}

              <button
                onClick={analyzeGallery}
                disabled={loading || (mode === 'gallery' ? !galleryUrl : !imageUrls.some(url => url.trim()))}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="animate-spin">⚙️</span>
                    Analyserer bilder...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <span>🚀</span>
                    Start AI-analyse
                  </span>
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-400/30 backdrop-blur-sm rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                  <p className="text-gray-300 font-medium">
                    {progress.total > 0 
                      ? `Analyserer bilde ${progress.current} av ${progress.total}...`
                      : 'Henter bilder fra galleriet...'}
                  </p>
                </div>
                
                {progress.total > 0 && (
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-3xl font-bold text-white">
                  Resultater ({results.length} bilder)
                </h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={copyAllDescriptions}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg"
                  >
                    📋 Kopier
                  </button>
                  <button
                    onClick={() => handleExport('text')}
                    disabled={isExporting}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg"
                  >
                    💾 Tekst
                  </button>
                  <button
                    onClick={() => handleExport('word')}
                    disabled={isExporting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg"
                  >
                    📄 Word
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg"
                  >
                    📑 PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((result, index) => (
                  <ModernResultCard 
                    key={index}
                    result={result}
                    index={index}
                    copiedIndex={copiedIndex}
                    copyDescription={copyDescription}
                    imageTypeTranslations={imageTypeTranslations}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styles for animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  );
}

// Modern result card component
function ModernResultCard({ result, index, copiedIndex, copyDescription, imageTypeTranslations }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(result.description);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [currentDescription, setCurrentDescription] = useState(result.description);

  const handleSave = () => {
    result.description = editedDescription;
    setCurrentDescription(editedDescription);
    setIsEditing(false);
  };

  const regenerateDescription = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: result.imageUrl,
          imageType: result.imageType,
          targetGroup: result.targetGroup || 'standard'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentDescription(data.description);
        setEditedDescription(data.description);
        result.description = data.description;
      }
    } catch (error) {
      console.error('Failed to regenerate:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl overflow-hidden hover:bg-white/15 transition-all duration-300 hover:shadow-2xl">
      <div className="relative h-64 overflow-hidden">
        <img
          src={result.imageUrl}
          alt={`Bilde ${index + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23374151"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EBilde kunne ikke lastes%3C/text%3E%3C/svg%3E';
          }}
        />
        {result.imageType && (
          <span className="absolute top-4 left-4 backdrop-blur-md bg-black/50 text-white text-sm px-4 py-2 rounded-full">
            {imageTypeTranslations[result.imageType] || result.imageType}
          </span>
        )}
        <span className="absolute top-4 right-4 backdrop-blur-md bg-black/50 text-white text-sm px-4 py-2 rounded-full">
          #{index + 1}
        </span>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-white">
            {imageTypeTranslations[result.imageType] || result.imageType}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={regenerateDescription}
              disabled={isRegenerating}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium disabled:opacity-50 transition-all"
              title="Generer ny beskrivelse"
            >
              {isRegenerating ? '⏳' : '🔄'}
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-gray-400 hover:text-gray-300 text-sm font-medium transition-all"
            >
              {isEditing ? '❌' : '✏️'}
            </button>
            <button
              onClick={() => copyDescription(currentDescription, index)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-all"
            >
              {copiedIndex === index ? '✓' : '📋'}
            </button>
          </div>
        </div>
        
        {isEditing ? (
          <div>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
              rows={3}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
              >
                💾 Lagre
              </button>
              <button
                onClick={() => {
                  setEditedDescription(currentDescription);
                  setIsEditing(false);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-300 text-sm leading-relaxed">
            {currentDescription}
          </p>
        )}
      </div>
    </div>
  );
}