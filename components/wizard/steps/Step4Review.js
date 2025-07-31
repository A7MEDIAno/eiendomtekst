// components/wizard/steps/Step4Review.js - KOMPLETT MED FEILHÅNDTERING
import { useState, useEffect } from 'react';
import { useWizard } from '../../../contexts/WizardContext';
import SideBySideEditor from '../SideBySideEditor';

export default function Step4Review() {
  const wizardContext = useWizard();
  const data = wizardContext.data || {};
  const { updateData, validateStep } = wizardContext;
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSideBySide, setShowSideBySide] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [analysisStarted, setAnalysisStarted] = useState(false);

  useEffect(() => {
    // Sjekk at vi har nødvendig data før auto-start
    if (!data.results || data.results.length === 0) {
      if (!isAnalyzing && !analysisStarted) {
        // Valider at vi har det vi trenger før auto-start
        if (data.mode === 'gallery' && data.galleryUrl) {
          console.log('🚀 Auto-starting analysis with URL:', data.galleryUrl);
          startAnalysis();
        } else if (data.mode === 'direct' && data.imageUrls?.some(url => url?.trim())) {
          console.log('🚀 Auto-starting analysis with direct URLs');
          startAnalysis();
        } else {
          console.log('⚠️ Cannot auto-start: missing required data', {
            mode: data.mode,
            galleryUrl: data.galleryUrl,
            imageUrls: data.imageUrls
          });
          setError('Mangler nødvendig data. Gå tilbake til steg 1.');
        }
      }
    }
    if (validateStep) {
      validateStep(4);
    }
  }, []);

  const startAnalysis = async () => {
    // Ekstra validering før vi starter
    if (data.mode === 'gallery') {
      if (!data.galleryUrl || data.galleryUrl.trim() === '') {
        console.error('❌ Missing gallery URL:', data);
        setError('Mangler galleri URL. Gå tilbake til steg 1 og legg inn URL på nytt.');
        return;
      }
      
      // Valider URL format
      try {
        new URL(data.galleryUrl);
      } catch (e) {
        console.error('❌ Invalid URL:', data.galleryUrl);
        setError('Ugyldig URL format. Sjekk at URL starter med http:// eller https://');
        return;
      }
    } else if (data.mode === 'direct') {
      const validUrls = (data.imageUrls || []).filter(url => url && url.trim());
      if (validUrls.length === 0) {
        setError('Ingen gyldige bilde-URLer. Gå tilbake til steg 1.');
        return;
      }
    }

    setIsAnalyzing(true);
    setAnalysisStarted(true);
    setError('');
    setProgress({ current: 0, total: 0 });

    try {
      // Debug log
      console.log('🔍 Starting analysis with data:', {
        mode: data.mode,
        galleryUrl: data.galleryUrl,
        imageUrls: data.imageUrls,
        targetGroup: data.targetGroup,
        previewImages: data.previewImages?.length || 0,
        propertyInfo: !!data.propertyInfo,
        propertyAddress: data.propertyAddress
      });

      const endpoint = data.mode === 'gallery' ? '/api/analyze' : '/api/analyze-simple';
      
      // Prepare request body
      let body;
      if (data.mode === 'gallery') {
        body = {
          galleryUrl: data.galleryUrl,
          targetGroup: data.targetGroup || 'standard',
          inspirationText: data.useInspiration ? data.inspirationText : '',
          propertyInfo: data.propertyInfo || '',
          propertyAddress: data.propertyAddress || ''
        };
      } else {
        // Direct URL mode
        const validUrls = (data.imageUrls || []).filter(url => url && url.trim());
        
        body = {
          imageUrls: validUrls,
          targetGroup: data.targetGroup || 'standard',
          propertyInfo: data.propertyInfo || ''
        };
      }

      console.log('📡 Sending request to:', endpoint);
      console.log('📦 Request body:', JSON.stringify(body, null, 2));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);
        
        // Gi mer spesifikk feilmelding basert på responsen
        if (errorData.details) {
          // Zod validation errors
          const fieldErrors = errorData.details.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          throw new Error(`Valideringsfeil: ${fieldErrors}`);
        } else {
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
      }

      if (data.mode === 'gallery') {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let results = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                console.log('📦 Received:', parsed.type);
                
                switch (parsed.type) {
                  case 'metadata':
                    if (parsed.address && !data.propertyAddress) {
                      updateData('propertyAddress', parsed.address);
                    }
                    setProgress({ current: 0, total: parsed.totalImages });
                    console.log(`📊 Total images to analyze: ${parsed.totalImages}`);
                    break;
                  
                  case 'progress':
                    setProgress({ current: parsed.current, total: parsed.total });
                    break;
                  
                  case 'result':
                    results.push(parsed.result);
                    // Update results immediately
                    updateData('results', [...results]);
                    console.log(`✅ Analyzed image ${results.length}`);
                    break;
                  
                  case 'complete':
                    results = parsed.results || results;
                    updateData('results', results);
                    console.log(`🎉 Analysis complete! ${results.length} images analyzed`);
                    break;
                  
                  case 'error':
                    console.error('❌ Stream error:', parsed.error);
                    setError(parsed.error);
                    break;
                }
              } catch (e) {
                console.error('Failed to parse line:', line, e);
              }
            }
          }
        }
        
        // Final check
        if (results.length === 0) {
          throw new Error('Ingen bilder ble analysert. Sjekk at galleriet inneholder bilder.');
        }
      } else {
        // Simple response for direct URLs
        const result = await response.json();
        
        if (!result.results || result.results.length === 0) {
          throw new Error('Ingen resultater fra analysen');
        }
        
        updateData('results', result.results);
        console.log(`🎉 Analysis complete! ${result.results.length} images analyzed`);
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setError(error.message || 'Analyse feilet');
      
      // Reset analysis started flag so user can retry
      setAnalysisStarted(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditDescription = (index, newDescription) => {
    const updatedResults = [...(data.results || [])];
    updatedResults[index].description = newDescription;
    updateData('results', updatedResults);
    
    // Track edits
    updateData('editedResults', {
      ...(data.editedResults || {}),
      [index]: newDescription
    });
  };

  const regenerateDescription = async (index) => {
    const result = data.results[index];
    if (!result) return;
    
    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: result.imageUrl,
          imageType: result.imageType,
          targetGroup: data.targetGroup || 'standard'
        })
      });

      if (response.ok) {
        const { description } = await response.json();
        handleEditDescription(index, description);
        
        // Track regenerations
        updateData('regeneratedCount', {
          ...(data.regeneratedCount || {}),
          [index]: ((data.regeneratedCount || {})[index] || 0) + 1
        });
      }
    } catch (error) {
      console.error('Regeneration failed:', error);
    }
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

  // Loading state
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
        </div>
        <p className="text-xl text-white mb-4">
          {progress.total > 0 
            ? `Analyserer bilde ${progress.current} av ${progress.total}...`
            : 'Forbereder analyse...'}
        </p>
        {progress.total > 0 && (
          <div className="w-full max-w-md">
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 transition-all duration-500"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        <p className="text-sm text-gray-400 mt-4">
          Dette kan ta opptil 30 sekunder...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-400 mb-4">
          <p className="text-xl mb-2">❌ Analyse feilet</p>
          <p className="text-sm mb-4">{error}</p>
        </div>
        
        {/* Debug info */}
        <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto mb-6 text-left">
          <p className="text-sm text-gray-300 mb-2">🐛 Debug info:</p>
          <pre className="text-xs text-gray-400 overflow-auto">
            {JSON.stringify({
              mode: data.mode,
              galleryUrl: data.galleryUrl,
              hasGalleryUrl: !!data.galleryUrl,
              galleryUrlLength: data.galleryUrl?.length,
              imageUrls: data.imageUrls?.filter(url => url?.trim()),
              targetGroup: data.targetGroup
            }, null, 2)}
          </pre>
        </div>
        
        {/* Helpful tips */}
        <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto mb-6 text-left">
          <p className="text-sm text-gray-300 mb-2">🔍 Mulige løsninger:</p>
          <ul className="text-sm text-gray-400 space-y-1">
            {data.mode === 'gallery' && (
              <>
                <li>• Sjekk at galleri-URL er riktig og komplett</li>
                <li>• Gå tilbake til Steg 1 og kjør forhåndsvisning først</li>
                <li>• Sørg for at URL starter med http:// eller https://</li>
                <li>• Prøv en annen galleri-URL</li>
              </>
            )}
            {data.mode === 'direct' && (
              <>
                <li>• Sjekk at alle bilde-URLer er gyldige</li>
                <li>• Sørg for at bildene er tilgjengelige</li>
                <li>• Prøv med færre bilder</li>
              </>
            )}
          </ul>
        </div>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg"
          >
            🏠 Start på nytt
          </button>
          <button
            onClick={startAnalysis}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            🔄 Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  // No results state
  if (!data.results || data.results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">Ingen resultater ennå</p>
        <p className="text-sm text-gray-500 mb-6">
          {data.mode === 'gallery' 
            ? `Gallery URL: ${data.galleryUrl || 'Ikke satt'}`
            : `Antall bilde-URLer: ${data.imageUrls?.filter(url => url?.trim()).length || 0}`}
        </p>
        <button
          onClick={startAnalysis}
          disabled={!data.galleryUrl && data.mode === 'gallery'}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg"
        >
          🚀 Start analyse
        </button>
      </div>
    );
  }

  // Results view
  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium text-white">
            {data.results.length} bilder analysert
          </h3>
          <button
            onClick={() => setShowSideBySide(!showSideBySide)}
            className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg transition-all"
          >
            {showSideBySide ? '📋 Listevisning' : '👁️ Side-by-side'}
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              const allDescriptions = data.results
                .map((r, i) => `${imageTypeTranslations[r.imageType] || r.imageType}: ${r.description}`)
                .join('\n\n');
              navigator.clipboard.writeText(allDescriptions);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            📋 Kopier alle
          </button>
        </div>
      </div>

      {/* Content */}
      {showSideBySide ? (
        <SideBySideEditor
          results={data.results}
          currentIndex={currentImageIndex}
          onNavigate={setCurrentImageIndex}
          onEdit={handleEditDescription}
          onRegenerate={regenerateDescription}
          imageTypeTranslations={imageTypeTranslations}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.results.map((result, index) => (
            <ResultCard
              key={index}
              result={result}
              index={index}
              onEdit={(desc) => handleEditDescription(index, desc)}
              onRegenerate={() => regenerateDescription(index)}
              imageTypeTranslations={imageTypeTranslations}
              isEdited={!!(data.editedResults || {})[index]}
              regenerateCount={(data.regeneratedCount || {})[index] || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Result Card Component
function ResultCard({ result, index, onEdit, onRegenerate, imageTypeTranslations, isEdited, regenerateCount }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(result.description);

  const handleSave = () => {
    onEdit(editedDescription);
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-700/30 rounded-xl overflow-hidden">
      <div className="relative h-48">
        <img
          src={result.imageUrl}
          alt={`Bilde ${index + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23374151"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EBilde kunne ikke lastes%3C/text%3E%3C/svg%3E';
          }}
        />
        <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
          {imageTypeTranslations[result.imageType] || result.imageType}
        </span>
        {isEdited && (
          <span className="absolute top-3 right-3 bg-green-600/80 text-white text-xs px-2 py-1 rounded-full">
            ✓ Redigert
          </span>
        )}
      </div>
      
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm"
              >
                💾 Lagre
              </button>
              <button
                onClick={() => {
                  setEditedDescription(result.description);
                  setIsEditing(false);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm"
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-300 text-sm mb-4">
              {result.description}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm"
              >
                ✏️ Rediger
              </button>
              <button
                onClick={onRegenerate}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm"
              >
                🔄 Ny ({regenerateCount})
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(result.description)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                📋
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}