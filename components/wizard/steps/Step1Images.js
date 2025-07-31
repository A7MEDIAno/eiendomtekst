// ===== FILE: components/wizard/steps/Step1Images.js - RETTET BILDEHÅNDTERING =====
import { useState, useEffect } from 'react';
import { useWizard } from '../../../contexts/WizardContext';

export default function Step1Images() {
  const wizardContext = useWizard();
  const data = wizardContext.data || {};
  const { updateData, updateMultipleData, validateStep } = wizardContext;
  
  const [previewImages, setPreviewImages] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // Validate only when component mounts and when specific data changes
 useEffect(() => {
  if (validateStep) {
    const timer = setTimeout(() => {
      validateStep(1); // eller 2 for Step2
    }, 0);
    return () => clearTimeout(timer);
  }
}, [/* dependencies */]);
  const handleModeChange = (mode) => {
    if (updateData) {
      updateData('mode', mode);
      
      // Clear data when switching modes
      if (mode === 'gallery') {
        updateMultipleData({
          imageUrls: [''],
          previewImages: []
        });
      } else {
        updateMultipleData({
          galleryUrl: '',
          previewImages: []
        });
      }
      setPreviewImages([]);
      setPreviewError('');
    }
  };

  const fetchGalleryPreview = async (urlToFetch = null) => {
    const galleryUrl = urlToFetch || data.galleryUrl;
    console.log('🔍 Fetching preview for URL:', galleryUrl);
    
    if (!galleryUrl) {
      console.log('❌ No gallery URL to preview');
      return;
    }
    
    setLoadingPreview(true);
    setPreviewError('');
    
    try {
      const response = await fetch('/api/preview-gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryUrl })
      });
      
      console.log('📡 Preview response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Preview response:', {
          imagesCount: result.images?.length,
          address: result.address,
          totalFound: result.totalFound
        });
        
        const images = result.images || [];
        setPreviewImages(images);
        
        // VIKTIG: Lagre preview-bildene i wizard context
        if (updateMultipleData) {
          updateMultipleData({
            previewImages: images,
            totalImagesFound: result.totalFound || images.length
          });
        }
        
        // Update address if found
        if (result.address && updateData) {
          console.log('📍 Updating address to:', result.address);
          updateData('propertyAddress', result.address);
        }
        
        if (images.length === 0) {
          setPreviewError('Fant ingen bilder i galleriet. Sjekk at URL-en er riktig.');
        }
      } else {
        const error = await response.json();
        console.error('❌ Preview error response:', error);
        setPreviewError(error.error || 'Kunne ikke hente forhåndsvisning');
      }
    } catch (error) {
      console.error('❌ Preview failed:', error);
      setPreviewError('Nettverksfeil - prøv igjen');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGalleryUrlChange = (e) => {
    const value = e.target.value.trim();
    console.log('✏️ Gallery URL changed to:', value);
    if (updateData) {
      updateData('galleryUrl', value);
    }
  };

  const handleGalleryUrlPaste = async (e) => {
    const pastedUrl = e.clipboardData.getData('text').trim();
    console.log('📋 Gallery URL pasted:', pastedUrl);
    
    if (updateData) {
      // Update the URL first
      updateData('galleryUrl', pastedUrl);
      
      // Auto-preview if valid URL
      if (pastedUrl && pastedUrl.startsWith('http')) {
        console.log('🚀 Starting auto-preview for pasted URL');
        // Use the pasted URL directly instead of waiting for state
        setTimeout(() => {
          fetchGalleryPreview(pastedUrl);
        }, 100);
      }
    }
  };

  const addImageUrl = () => {
    const currentUrls = data.imageUrls || [''];
    const newUrls = [...currentUrls, ''];
    if (updateData) {
      updateData('imageUrls', newUrls);
    }
  };

  const updateImageUrl = (index, value) => {
    const currentUrls = data.imageUrls || [''];
    const updated = [...currentUrls];
    updated[index] = value.trim();
    if (updateData) {
      updateData('imageUrls', updated);
    }
  };

  const removeImageUrl = (index) => {
    const currentUrls = data.imageUrls || [''];
    const updated = currentUrls.filter((_, i) => i !== index);
    if (updateData) {
      updateData('imageUrls', updated.length > 0 ? updated : ['']);
    }
  };

  // Use data directly from context
  const galleryUrl = data.galleryUrl || '';
  const imageUrls = data.imageUrls || [''];
  const mode = data.mode || 'gallery';

  return (
    <div className="space-y-8">
      {/* Mode selector */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Hvordan vil du laste opp bilder?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleModeChange('gallery')}
            className={`p-6 rounded-xl border-2 transition-all ${
              mode === 'gallery'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="text-4xl mb-3">📸</div>
            <div className="text-lg font-medium text-white mb-1">Galleri URL</div>
            <p className="text-sm text-gray-400">
              Hent automatisk fra Pholio eller lignende
            </p>
          </button>

          <button
            onClick={() => handleModeChange('direct')}
            className={`p-6 rounded-xl border-2 transition-all ${
              mode === 'direct'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="text-4xl mb-3">🔗</div>
            <div className="text-lg font-medium text-white mb-1">Direkte URLer</div>
            <p className="text-sm text-gray-400">
              Legg inn individuelle bilde-URLer
            </p>
          </button>
        </div>
      </div>

      {/* Gallery URL input */}
      {mode === 'gallery' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Galleri URL
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={galleryUrl}
                onChange={handleGalleryUrlChange}
                onPaste={handleGalleryUrlPaste}
                placeholder="https://www.pholio.no/galleri/300781"
                className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              <button
                onClick={() => fetchGalleryPreview()}
                disabled={!galleryUrl || loadingPreview}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-all"
              >
                {loadingPreview ? '⏳ Henter...' : '👁️ Forhåndsvis'}
              </button>
            </div>
            
            {/* Error message */}
            {previewError && (
              <div className="mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300">{previewError}</p>
              </div>
            )}
          </div>

          {/* Preview images */}
          {previewImages.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-3">
                Fant {previewImages.length} bilder i galleriet:
              </p>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {previewImages.slice(0, 12).map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-700">
                    <img
                      src={img}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log(`❌ Failed to load preview image ${idx + 1}`);
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23374151"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                ))}
                {previewImages.length > 12 && (
                  <div className="aspect-square rounded-lg bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400">+{previewImages.length - 12}</span>
                  </div>
                )}
              </div>
              
              {/* Success message */}
              <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-300">
                  ✅ Bildene er klare for analyse. Gå til neste steg for å fortsette.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direct URLs input */}
      {mode === 'direct' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bilde-URLer
            </label>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {imageUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateImageUrl(index, e.target.value)}
                    placeholder="https://eksempel.no/bilde.jpg"
                    className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400"
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
              className="text-blue-400 hover:text-blue-300 text-sm mt-3"
            >
              + Legg til flere bilder
            </button>
          </div>

          {/* URL Preview */}
          {imageUrls.some(url => url.trim()) && (
            <div>
              <p className="text-sm text-gray-400 mb-3">Forhåndsvisning:</p>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {imageUrls.filter(url => url.trim()).map((url, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-700">
                    <img
                      src={url}
                      alt={`URL ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23374151"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-2">💡 Tips for best resultat</h4>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• Bruk høyoppløselige bilder (minst 1024x768)</li>
          <li>• Inkluder bilder av alle rom og fasade</li>
          <li>• Sørg for god belysning i bildene</li>
          <li>• Rydd og gjør rent før fotografering</li>
          {mode === 'gallery' && <li>• Vent til preview er lastet før du går videre</li>}
        </ul>
      </div>
      
      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-800 rounded-lg p-4 text-xs text-gray-400">
          <p>Debug Info:</p>
          <p>Mode: {mode}</p>
          <p>Gallery URL: {galleryUrl}</p>
          <p>Preview Images: {previewImages.length}</p>
          <p>Stored Preview Images: {data.previewImages?.length || 0}</p>
        </div>
      )}
    </div>
  );
}