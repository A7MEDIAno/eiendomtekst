// ===== FILE: components/wizard/TemplateSelector.js - MAL-BIBLIOTEK =====
import { useState, useEffect } from 'react';

export default function TemplateSelector({ currentTemplate, onSelectTemplate, targetGroup }) {
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock templates - skulle hentes fra database
  const mockTemplates = [
    {
      id: 1,
      name: 'Moderne Minimal',
      description: 'Ren og minimalistisk stil med fokus på funksjon',
      targetGroup: 'standard',
      lastUsed: '2024-01-15',
      usage: 45,
      preview: 'Stue med hvite vegger og eikeparkett. Store vinduer gir godt lysinnslipp.',
      tags: ['moderne', 'minimal', 'standard']
    },
    {
      id: 2,
      name: 'Familie-vennlig',
      description: 'Vektlegger sikkerhet og praktiske løsninger',
      targetGroup: 'family',
      lastUsed: '2024-01-20',
      usage: 32,
      preview: 'Romslig stue med slitesterkt laminat. God plass til lek og familieaktiviteter.',
      tags: ['familie', 'praktisk', 'romslig']
    },
    {
      id: 3,
      name: 'Luxury Estate',
      description: 'Eksklusiv stil for høystandard eiendommer',
      targetGroup: 'investor',
      lastUsed: '2024-01-10',
      usage: 18,
      preview: 'Eksklusiv stue med designparkett og høy takhøyde. Premium materialer throughout.',
      tags: ['luksus', 'eksklusiv', 'premium']
    }
  ];

  useEffect(() => {
    // Her ville vi hentet maler fra API/database
    setTemplates(mockTemplates);
  }, []);

  const filteredTemplates = filter === 'all' 
    ? templates 
    : templates.filter(t => t.targetGroup === filter);

  const saveAsTemplate = () => {
    // Implementer lagring av mal
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'all' 
              ? 'bg-gray-600 text-white' 
              : 'bg-gray-700/50 text-gray-400 hover:text-white'
          }`}
        >
          Alle maler
        </button>
        <button
          onClick={() => setFilter('standard')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'standard' 
              ? 'bg-gray-600 text-white' 
              : 'bg-gray-700/50 text-gray-400 hover:text-white'
          }`}
        >
          Standard
        </button>
        <button
          onClick={() => setFilter('family')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'family' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700/50 text-gray-400 hover:text-white'
          }`}
        >
          Familie
        </button>
        <button
          onClick={() => setFilter(targetGroup)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === targetGroup 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700/50 text-gray-400 hover:text-white'
          }`}
        >
          Din målgruppe
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`bg-gray-700/30 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-700/50 ${
              currentTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium text-white">{template.name}</h4>
              <span className="text-xs text-gray-400">
                {template.usage} bruk
              </span>
            </div>
            
            <p className="text-sm text-gray-400 mb-3">
              {template.description}
            </p>
            
            <div className="bg-gray-800/50 rounded p-3 mb-3">
              <p className="text-xs text-gray-300 italic">
                "{template.preview}"
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {template.tags.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="text-xs bg-gray-600/50 text-gray-300 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(template.lastUsed).toLocaleDateString('nb-NO')}
              </span>
            </div>
          </div>
        ))}

        {/* Create New Template Card */}
        <div
          className="bg-gray-700/30 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-700/50 border-2 border-dashed border-gray-600 flex items-center justify-center min-h-[200px]"
          onClick={() => setShowCreateModal(true)}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">+</div>
            <p className="text-gray-400">Opprett ny mal</p>
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Opprett ny mal
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Navn på mal"
                className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
              />
              <textarea
                placeholder="Beskrivelse"
                className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveAsTemplate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                >
                  Lagre mal
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}