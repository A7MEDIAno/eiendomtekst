// ===== FILE: components/wizard/steps/Step3StyleTarget.js - KOMPLETT =====
import { useState, useEffect } from 'react';
import { useWizard } from '../../../contexts/WizardContext';
import TemplateSelector from '../TemplateSelector';

export default function Step3StyleTarget() {
  const { data, updateData, updateMultipleData } = useWizard();
  const [showTemplates, setShowTemplates] = useState(false);
  const [isGeneratingIntro, setIsGeneratingIntro] = useState(false);

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
    professional: { 
      name: 'Profesjonell', 
      icon: '💼',
      description: 'Faktabasert med bullet points'
    },
    narrative: { 
      name: 'Fortellende', 
      icon: '📖',
      description: 'Engasjerende og beskrivende'
    },
    compact: { 
      name: 'Kompakt', 
      icon: '📋',
      description: 'Kort og konsis, kun hovedpunkter'
    }
  };

  // Auto-generate intro when property info changes
  useEffect(() => {
    if (data.usePropertyIntro && data.propertyInfo && !data.propertyIntro) {
      generatePropertyIntro();
    }
  }, [data.propertyInfo, data.usePropertyIntro]);

  const generatePropertyIntro = async () => {
    if (!data.propertyInfo && !data.propertyAddress) return;

    setIsGeneratingIntro(true);
    try {
      const response = await fetch('/api/generate-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyInfo: data.propertyInfo,
          address: data.propertyAddress || data.manualAddress,
          style: data.introStyle,
          meglerInfo: data.meglerInfo
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        updateData('propertyIntro', result.intro);
        
        // Handle target group suggestion
        if (result.targetGroupSuggestion && data.targetGroup === 'standard') {
          updateData('targetGroupSuggestion', result.targetGroupSuggestion);
        }
      }
    } catch (error) {
      console.error('Failed to generate intro:', error);
    } finally {
      setIsGeneratingIntro(false);
    }
  };

  const applyTemplate = (template) => {
    updateMultipleData({
      selectedTemplate: template,
      targetGroup: template.targetGroup || data.targetGroup,
      introStyle: template.introStyle || data.introStyle
    });
    setShowTemplates(false);
  };

  return (
    <div className="space-y-8">
      {/* Target Group Selection */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Velg målgruppe</h3>
        
        {/* Target group suggestion */}
        {data.targetGroupSuggestion && data.targetGroup === 'standard' && (
          <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300 mb-2">
              <strong>Foreslått målgruppe:</strong> {targetGroups[data.targetGroupSuggestion.group].name}
            </p>
            <p className="text-xs text-blue-200 mb-3">
              {data.targetGroupSuggestion.reason}
            </p>
            <button
              onClick={() => {
                updateData('targetGroup', data.targetGroupSuggestion.group);
                updateData('targetGroupSuggestion', null);
              }}
              className="text-sm bg-blue-600/80 hover:bg-blue-700/80 text-white px-4 py-2 rounded-lg transition-all"
            >
              Bruk foreslått målgruppe
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(targetGroups).map(([key, group]) => (
            <button
              key={key}
              onClick={() => updateData('targetGroup', key)}
              className={`relative p-4 rounded-xl backdrop-blur-md transition-all duration-300 ${
                data.targetGroup === key
                  ? 'bg-gradient-to-br ' + group.color + ' text-white shadow-xl scale-105'
                  : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-600'
              }`}
              title={group.description}
            >
              <div className="text-2xl mb-1">{group.icon}</div>
              <div className="text-sm font-medium">{group.name}</div>
            </button>
          ))}
        </div>
        {data.targetGroup && (
          <p className="text-center text-sm text-gray-400 mt-3">
            {targetGroups[data.targetGroup].description}
          </p>
        )}
      </div>

      {/* Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Mal-bibliotek</h3>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg transition-all"
          >
            {showTemplates ? 'Skjul maler' : '📚 Vis maler'}
          </button>
        </div>
        
        {showTemplates && (
          <TemplateSelector
            currentTemplate={data.selectedTemplate}
            onSelectTemplate={applyTemplate}
            targetGroup={data.targetGroup}
          />
        )}
      </div>

      {/* Inspiration Text */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
          <input
            type="checkbox"
            checked={data.useInspiration}
            onChange={(e) => updateData('useInspiration', e.target.checked)}
            className="rounded border-gray-500 text-blue-600 focus:ring-blue-500"
          />
          Bruk eksisterende tekst som inspirasjon
        </label>
        
        {data.useInspiration && (
          <textarea
            value={data.inspirationText}
            onChange={(e) => updateData('inspirationText', e.target.value)}
            placeholder="Lim inn eksisterende beskrivelser som AI kan lære av..."
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm"
            rows={4}
          />
        )}
      </div>

      {/* Property Intro Generator */}
      <div>
        <div className="backdrop-blur-sm bg-green-500/10 border border-green-400/30 rounded-xl p-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-4">
            <input
              type="checkbox"
              checked={data.usePropertyIntro}
              onChange={(e) => updateData('usePropertyIntro', e.target.checked)}
              className="rounded border-gray-500 text-green-600 focus:ring-green-500"
            />
            Generer "Om boligen" introduksjon
          </label>
          
          {data.usePropertyIntro && (
            <div className="space-y-4">
              <input
                type="text"
                value={data.meglerInfo}
                onChange={(e) => updateData('meglerInfo', e.target.value)}
                placeholder="Meglerfirma/navn (valgfritt)"
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
              
              <div className="flex gap-2">
                {Object.entries(introStyles).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => updateData('introStyle', key)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      data.introStyle === key
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {style.icon} {style.name}
                  </button>
                ))}
              </div>
              
              {data.propertyIntro && (
                <textarea
                  value={data.propertyIntro}
                  onChange={(e) => updateData('propertyIntro', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
                  rows={8}
                />
              )}
              
              <button
                onClick={generatePropertyIntro}
                disabled={isGeneratingIntro || (!data.propertyInfo && !data.propertyAddress)}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-all"
              >
                {isGeneratingIntro ? '⏳ Genererer...' : '✨ Generer introduksjon'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Learning */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
        <h4 className="text-sm font-medium text-purple-300 mb-2">🤖 AI-læring aktivert</h4>
        <p className="text-xs text-purple-200">
          AI-en vil analysere og lære fra dine valg for å forbedre fremtidige beskrivelser.
          Jo mer du bruker systemet, jo bedre blir det tilpasset din stil.
        </p>
      </div>
    </div>
  );
}