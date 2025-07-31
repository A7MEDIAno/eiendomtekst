// ===== FILE: components/wizard/SideBySideEditor.js - SIDE-BY-SIDE EDITOR =====
import { useState } from 'react';

export default function SideBySideEditor({ 
  results, 
  currentIndex, 
  onNavigate, 
  onEdit, 
  onRegenerate,
  imageTypeTranslations 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [showAiTips, setShowAiTips] = useState(true);

  const current = results[currentIndex];
  if (!current) return null;

  const handleEdit = () => {
    setEditedDescription(current.description);
    setIsEditing(true);
  };

  const handleSave = () => {
    onEdit(current.description, editedDescription);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDescription('');
    setIsEditing(false);
  };

  const navigatePrev = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
      setIsEditing(false);
    }
  };

  const navigateNext = () => {
    if (currentIndex < results.length - 1) {
      onNavigate(currentIndex + 1);
      setIsEditing(false);
    }
  };

  // Generate AI tips based on image type and content
  const getAiTips = () => {
    const tips = [];
    const desc = current.description.toLowerCase();
    
    // General tips
    if (!desc.includes('gulvvarme') && current.imageType === 'bad') {
      tips.push('Vurder å nevne gulvvarme hvis det finnes');
    }
    if (desc.length < 50) {
      tips.push('Beskrivelsen er kort - vurder å legge til mer detaljer');
    }
    if (!desc.match(/\b(hvit|grå|beige|sort|eik|bøk)\b/)) {
      tips.push('Legg til spesifikke farger på gulv/vegger');
    }
    
    // Room-specific tips
    switch(current.imageType) {
      case 'stue':
        if (!desc.includes('vindu')) tips.push('Nevn vinduer og lysforhold');
        if (!desc.includes('størrelse')) tips.push('Kommenter romstørrelse');
        break;
      case 'kjøkken':
        if (!desc.includes('hvitevarer')) tips.push('Nevn om hvitevarer følger med');
        if (!desc.includes('benkeplate')) tips.push('Beskriv benkeplate-materiale');
        break;
      case 'bad':
        if (!desc.includes('dusjhjørne') && !desc.includes('badekar')) {
          tips.push('Spesifiser dusjløsning');
        }
        break;
    }
    
    return tips;
  };

  const aiTips = getAiTips();

  return (
    <div className="bg-gray-800/30 rounded-xl overflow-hidden">
      {/* Navigation Header */}
      <div className="bg-gray-700/50 px-6 py-4 flex items-center justify-between">
        <button
          onClick={navigatePrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-medium text-white">
            {imageTypeTranslations[current.imageType] || current.imageType}
          </h3>
          <p className="text-sm text-gray-400">
            Bilde {currentIndex + 1} av {results.length}
          </p>
        </div>
        
        <button
          onClick={navigateNext}
          disabled={currentIndex === results.length - 1}
          className="p-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-xl">→</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-700">
        {/* Image Side */}
        <div className="p-6">
          <div className="aspect-video rounded-lg overflow-hidden bg-gray-900 mb-4">
            <img
              src={current.imageUrl}
              alt={`${current.imageType} ${currentIndex + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23374151"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EBilde kunne ikke lastes%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
          
          {/* Image Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Type:</span>
              <span className="text-white">{imageTypeTranslations[current.imageType] || current.imageType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Målgruppe:</span>
              <span className="text-white">{current.targetGroup || 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ordtelling:</span>
              <span className="text-white">{current.description.split(' ').length} ord</span>
            </div>
          </div>
        </div>

        {/* Description Side */}
        <div className="p-6 space-y-4">
          {/* Description Box */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            {isEditing ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white resize-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                autoFocus
              />
            ) : (
              <p className="text-white leading-relaxed">
                {current.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium"
                >
                  💾 Lagre
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
                >
                  Avbryt
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
                >
                  ✏️ Rediger
                </button>
                <button
                  onClick={() => onRegenerate(currentIndex)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium"
                >
                  🔄 Regenerer
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(current.description)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  📋
                </button>
              </>
            )}
          </div>

          {/* AI Tips */}
          {showAiTips && aiTips.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-blue-300">💡 AI-tips</h4>
                <button
                  onClick={() => setShowAiTips(false)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ×
                </button>
              </div>
              <ul className="space-y-1">
                {aiTips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-blue-200 flex items-start gap-2">
                    <span>•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-2">Hurtigtaster:</p>
            <div className="flex flex-wrap gap-2">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">←/→</kbd>
              <span className="text-xs text-gray-400">Naviger</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">E</kbd>
              <span className="text-xs text-gray-400">Rediger</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">R</kbd>
              <span className="text-xs text-gray-400">Regenerer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-700/30 px-6 py-3">
        <div className="flex gap-1">
          {results.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(idx)}
              className={`flex-1 h-1 rounded-full transition-colors ${
                idx === currentIndex 
                  ? 'bg-blue-500' 
                  : idx < currentIndex 
                  ? 'bg-green-500' 
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}