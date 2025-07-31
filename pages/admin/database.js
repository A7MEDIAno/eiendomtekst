// ===== FILE: pages/admin/database.js - ADMIN INTERFACE =====
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function DatabaseAdmin() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('examples');
  const [examples, setExamples] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  
  // Form states
  const [newExample, setNewExample] = useState({
    roomType: 'stue',
    description: '',
    targetGroup: 'standard',
    season: '',
    quality: 'neutral',
    tags: [],
    features: []
  });
  
  const [editingId, setEditingId] = useState(null);
  const [bulkImport, setBulkImport] = useState('');

  const roomTypes = [
    'stue', 'kjøkken', 'bad', 'soverom', 'gang', 'wc', 'vaskerom',
    'spisestue', 'hjemmekontor', 'balkong', 'terrasse', 'hage',
    'utsikt', 'fasade', 'fellesarealer', 'parkering', 'bod',
    'planløsning', 'annet'
  ];

  const targetGroups = {
    standard: 'Standard',
    family: 'Familie',
    firstTime: 'Førstegangskjøper',
    investor: 'Investor',
    senior: 'Senior'
  };

  // Auth check
  useEffect(() => {
    const savedKey = localStorage.getItem('adminKey');
    if (savedKey) {
      setAdminKey(savedKey);
      setIsAuthenticated(true);
      loadData(savedKey);
    }
  }, []);

  const authenticate = () => {
    localStorage.setItem('adminKey', adminKey);
    setIsAuthenticated(true);
    loadData(adminKey);
  };

  const logout = () => {
    localStorage.removeItem('adminKey');
    setIsAuthenticated(false);
    setAdminKey('');
  };

  // API calls
  const apiCall = async (endpoint, options = {}) => {
    const response = await fetch(`/api/database/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  };

  const loadData = async (key) => {
    setLoading(true);
    try {
      // Load examples
      const examplesData = await apiCall('examples', {
        headers: { 'x-admin-key': key || adminKey }
      });
      setExamples(examplesData.examples);
      
      // Load stats
      const statsData = await apiCall('stats', {
        headers: { 'x-admin-key': key || adminKey }
      });
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchExamples = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterRoom) params.append('roomType', filterRoom);
      if (filterTarget) params.append('targetGroup', filterTarget);
      
      const data = await apiCall(`examples?${params}`);
      setExamples(data.examples);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const createExample = async () => {
    try {
      await apiCall('examples', {
        method: 'POST',
        body: JSON.stringify(newExample)
      });
      
      // Reset form
      setNewExample({
        roomType: 'stue',
        description: '',
        targetGroup: 'standard',
        season: '',
        quality: 'neutral',
        tags: [],
        features: []
      });
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('Failed to create example:', error);
      alert('Kunne ikke lagre eksempel');
    }
  };

  const updateExample = async (id, data) => {
    try {
      await apiCall(`examples/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      loadData();
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update example:', error);
    }
  };

  const deleteExample = async (id) => {
    if (!confirm('Er du sikker på at du vil slette dette eksemplet?')) return;
    
    try {
      await apiCall(`examples/${id}`, {
        method: 'DELETE'
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete example:', error);
    }
  };

  const handleBulkImport = async () => {
    try {
      const examples = JSON.parse(bulkImport);
      const result = await apiCall('bulk/import', {
        method: 'POST',
        body: JSON.stringify({ examples })
      });
      
      alert(`Importerte ${result.imported} eksempler`);
      setBulkImport('');
      loadData();
    } catch (error) {
      console.error('Bulk import failed:', error);
      alert('Import feilet - sjekk JSON-format');
    }
  };

  const exportData = async () => {
    try {
      const data = await apiCall('bulk/export', {
        method: 'POST'
      });
      
      const blob = new Blob([JSON.stringify(data.examples, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6">Database Admin</h1>
          <input
            type="password"
            placeholder="Admin nøkkel"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && authenticate()}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded mb-4"
          />
          <button
            onClick={authenticate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            Logg inn
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>A7 Generate - Database Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Database Admin</h1>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
            >
              Logg ut
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-gray-800 mx-6 mt-6 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Statistikk</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-400">Totalt eksempler</div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
                <div className="text-sm text-gray-400">Analyser kjørt</div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-2xl font-bold">{stats.userExamples}</div>
                <div className="text-sm text-gray-400">Bruker-eksempler</div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-2xl font-bold">{stats.cachedLocations}</div>
                <div className="text-sm text-gray-400">Cached lokasjoner</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 mt-6">
          <div className="flex space-x-4 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('examples')}
              className={`pb-2 px-4 ${activeTab === 'examples' ? 'border-b-2 border-blue-500' : ''}`}
            >
              Eksempler
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`pb-2 px-4 ${activeTab === 'add' ? 'border-b-2 border-blue-500' : ''}`}
            >
              Legg til
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`pb-2 px-4 ${activeTab === 'import' ? 'border-b-2 border-blue-500' : ''}`}
            >
              Import/Export
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Examples tab */}
          {activeTab === 'examples' && (
            <div>
              {/* Search and filters */}
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="text"
                    placeholder="Søk i beskrivelser..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 bg-gray-700 rounded"
                  />
                  <select
                    value={filterRoom}
                    onChange={(e) => setFilterRoom(e.target.value)}
                    className="px-4 py-2 bg-gray-700 rounded"
                  >
                    <option value="">Alle rom</option>
                    {roomTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <select
                    value={filterTarget}
                    onChange={(e) => setFilterTarget(e.target.value)}
                    className="px-4 py-2 bg-gray-700 rounded"
                  >
                    <option value="">Alle målgrupper</option>
                    {Object.entries(targetGroups).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                  <button
                    onClick={searchExamples}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                  >
                    Søk
                  </button>
                </div>
              </div>

              {/* Examples list */}
              <div className="space-y-2">
                {examples.map((example) => (
                  <div key={example.id} className="bg-gray-800 p-4 rounded-lg">
                    {editingId === example.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={example.description}
                          onChange={(e) => {
                            const updated = examples.map(ex => 
                              ex.id === example.id 
                                ? { ...ex, description: e.target.value }
                                : ex
                            );
                            setExamples(updated);
                          }}
                          className="w-full px-3 py-2 bg-gray-700 rounded"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateExample(example.id, {
                              description: example.description,
                              targetGroup: example.targetGroup,
                              season: example.season,
                              quality: example.quality
                            })}
                            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                          >
                            Lagre
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
                          >
                            Avbryt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm text-gray-400 mb-1">
                              {example.roomType} • {targetGroups[example.targetGroup]} 
                              {example.season && ` • ${example.season}`}
                              {example.usageCount > 0 && ` • Brukt ${example.usageCount} ganger`}
                            </div>
                            <div>{example.description}</div>
                            {example.tags?.length > 0 && (
                              <div className="mt-2 flex gap-2">
                                {example.tags.map(tag => (
                                  <span key={tag.id} className="text-xs bg-gray-700 px-2 py-1 rounded">
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => setEditingId(example.id)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteExample(example.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add tab */}
          {activeTab === 'add' && (
            <div className="max-w-2xl">
              <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Romtype</label>
                  <select
                    value={newExample.roomType}
                    onChange={(e) => setNewExample({ ...newExample, roomType: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 rounded"
                  >
                    {roomTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Beskrivelse</label>
                  <textarea
                    value={newExample.description}
                    onChange={(e) => setNewExample({ ...newExample, description: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 rounded"
                    rows={4}
                    placeholder="Skriv beskrivelse her..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Målgruppe</label>
                  <select
                    value={newExample.targetGroup}
                    onChange={(e) => setNewExample({ ...newExample, targetGroup: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 rounded"
                  >
                    {Object.entries(targetGroups).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sesong (valgfritt)</label>
                  <select
                    value={newExample.season}
                    onChange={(e) => setNewExample({ ...newExample, season: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 rounded"
                  >
                    <option value="">Ingen</option>
                    <option value="spring">Vår</option>
                    <option value="summer">Sommer</option>
                    <option value="autumn">Høst</option>
                    <option value="winter">Vinter</option>
                  </select>
                </div>

                <button
                  onClick={createExample}
                  disabled={!newExample.description}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 rounded"
                >
                  Legg til eksempel
                </button>
              </div>
            </div>
          )}

          {/* Import/Export tab */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Eksporter database</h3>
                <button
                  onClick={exportData}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded"
                >
                  Last ned alle eksempler (JSON)
                </button>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Bulk import</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Lim inn JSON-array med eksempler. Format: 
                  {` [{roomType: "stue", description: "...", targetGroup: "standard"}]`}
                </p>
                <textarea
                  value={bulkImport}
                  onChange={(e) => setBulkImport(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded font-mono text-sm"
                  rows={10}
                  placeholder='[{"roomType": "stue", "description": "...", "targetGroup": "standard"}]'
                />
                <button
                  onClick={handleBulkImport}
                  disabled={!bulkImport}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded"
                >
                  Importer eksempler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}