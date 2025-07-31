// ===== FILE: components/wizard/steps/Step5Export.js - KOMPLETT =====
import { useState } from 'react';
import { useWizard } from '../../../contexts/WizardContext';
import { exportToWord, exportToPDF, downloadFile } from '../../../lib/exportUtils';

export default function Step5Export() {
  const { data, updateData } = useWizard();
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [previewMode, setPreviewMode] = useState('formatted');
  const [shareLink, setShareLink] = useState('');

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

  const handleExport = async (format) => {
    setIsExporting(true);
    setExportStatus({ type: 'info', message: 'Forbereder eksport...' });

    try {
      const exportData = {
        address: data.propertyAddress || data.manualAddress || 'Ukjent adresse',
        propertyInfo: data.propertyInfo,
        propertyIntro: data.usePropertyIntro ? data.propertyIntro : null,
        conditionReport: data.conditionReport,
        competitorAnalysis: data.competitorAnalysis,
        results: data.results.map(r => ({
          ...r,
          imageTypeNorwegian: imageTypeTranslations[r.imageType] || r.imageType
        }))
      };

      let blob;
      let filename;
      const dateStr = new Date().toISOString().split('T')[0];
      const addressStr = exportData.address.replace(/[^a-z0-9]/gi, '-').toLowerCase();

      switch (format) {
        case 'word':
          blob = await exportToWord(exportData);
          filename = `a7-generate-${addressStr}-${dateStr}.docx`;
          break;
          
        case 'pdf':
          blob = await exportToPDF(exportData);
          filename = `a7-generate-${addressStr}-${dateStr}.pdf`;
          break;
          
        case 'text':
          const textContent = generateTextExport(exportData);
          blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
          filename = `a7-generate-${addressStr}-${dateStr}.txt`;
          break;
          
        case 'json':
          blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          filename = `a7-generate-${addressStr}-${dateStr}.json`;
          break;
      }

      downloadFile(blob, filename);
      setExportStatus({ 
        type: 'success', 
        message: `✓ Eksportert som ${format.toUpperCase()}` 
      });

      // Update export settings
      updateData('exportSettings', { ...data.exportSettings, lastFormat: format });

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus({ 
        type: 'error', 
        message: 'Eksport feilet. Prøv igjen.' 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generateTextExport = (exportData) => {
    let fullText = '';
    
    // Header
    fullText += `EIENDOMSBESKRIVELSER\n`;
    fullText += `${exportData.address}\n`;
    fullText += `Generert: ${new Date().toLocaleDateString('nb-NO')}\n`;
    fullText += `${'='.repeat(60)}\n\n`;
    
    // Property intro
    if (exportData.propertyIntro && data.exportSettings.includeIntro) {
      fullText += `OM BOLIGEN\n`;
      fullText += `${'-'.repeat(40)}\n`;
      fullText += `${exportData.propertyIntro}\n\n`;
    }
    
    // Property info
    if (exportData.propertyInfo && data.exportSettings.includePropertyInfo) {
      fullText += `BOLIGINFORMASJON\n`;
      fullText += `${'-'.repeat(40)}\n`;
      fullText += `${exportData.propertyInfo}\n\n`;
    }
    
    // Condition report summary
    if (exportData.conditionReport) {
      fullText += `TILSTANDSRAPPORT\n`;
      fullText += `${'-'.repeat(40)}\n`;
      fullText += `Byggeår: ${exportData.conditionReport.findings.buildingYear || 'Ukjent'}\n`;
      fullText += `Tilstand: ${exportData.conditionReport.findings.generalCondition}\n`;
      if (exportData.conditionReport.findings.totalCost) {
        fullText += `Estimerte kostnader: kr ${exportData.conditionReport.findings.totalCost.toLocaleString('nb-NO')}\n`;
      }
      fullText += '\n';
    }
    
    // Image descriptions
    fullText += `BILDEBESKRIVELSER\n`;
    fullText += `${'-'.repeat(40)}\n\n`;
    
    exportData.results.forEach((result, index) => {
      fullText += `${result.imageTypeNorwegian} (Bilde ${index + 1}):\n`;
      fullText += `${result.description}\n\n`;
    });
    
    // Footer
    fullText += `\n${'='.repeat(60)}\n`;
    fullText += `Generert med A7 Generate Pro\n`;
    fullText += `© ${new Date().getFullYear()} A7 Generate - AI-drevne eiendomsbeskrivelser\n`;
    
    return fullText;
  };

  const generateShareLink = async () => {
    // Simuler generering av delbar lenke
    const id = Math.random().toString(36).substring(7);
    const link = `https://a7generate.no/share/${id}`;
    setShareLink(link);
    
    // Kopier til clipboard
    navigator.clipboard.writeText(link);
    
    // I produksjon ville dette lagret dataene på server
    console.log('Share link generated:', link);
  };

  const getPreviewContent = () => {
    if (previewMode === 'formatted') {
      return generateTextExport({
        address: data.propertyAddress || data.manualAddress || 'Ukjent adresse',
        propertyInfo: data.propertyInfo,
        propertyIntro: data.propertyIntro,
        conditionReport: data.conditionReport,
        results: data.results.map(r => ({
          ...r,
          imageTypeNorwegian: imageTypeTranslations[r.imageType] || r.imageType
        }))
      });
    } else {
      // Raw JSON preview
      return JSON.stringify(data, null, 2);
    }
  };

  const saveAsTemplate = () => {
    const template = {
      name: prompt('Navn på mal:'),
      targetGroup: data.targetGroup,
      introStyle: data.introStyle,
      exportSettings: data.exportSettings,
      createdAt: new Date().toISOString()
    };
    
    // Save to localStorage (in production, save to database)
    const templates = JSON.parse(localStorage.getItem('a7_templates') || '[]');
    templates.push(template);
    localStorage.setItem('a7_templates', JSON.stringify(templates));
    
    alert('Mal lagret!');
  };

  return (
    <div className="space-y-8">
      {/* Export Options */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Velg eksportformat</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleExport('word')}
            disabled={isExporting}
            className="p-6 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all disabled:opacity-50"
          >
            <div className="text-3xl mb-2">📄</div>
            <div className="text-white font-medium">Word</div>
            <div className="text-xs text-gray-400 mt-1">.docx</div>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="p-6 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl transition-all disabled:opacity-50"
          >
            <div className="text-3xl mb-2">📑</div>
            <div className="text-white font-medium">PDF</div>
            <div className="text-xs text-gray-400 mt-1">.pdf</div>
          </button>

          <button
            onClick={() => handleExport('text')}
            disabled={isExporting}
            className="p-6 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 rounded-xl transition-all disabled:opacity-50"
          >
            <div className="text-3xl mb-2">📝</div>
            <div className="text-white font-medium">Tekst</div>
            <div className="text-xs text-gray-400 mt-1">.txt</div>
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="p-6 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl transition-all disabled:opacity-50"
          >
            <div className="text-3xl mb-2">{ }</div>
            <div className="text-white font-medium">JSON</div>
            <div className="text-xs text-gray-400 mt-1">.json</div>
          </button>
        </div>

        {/* Export Status */}
        {exportStatus && (
          <div className={`mt-4 p-4 rounded-lg ${
            exportStatus.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-300' :
            exportStatus.type === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-300' :
            'bg-blue-500/20 border border-blue-500/30 text-blue-300'
          }`}>
            {exportStatus.message}
          </div>
        )}
      </div>

      {/* Export Settings */}
      <div className="bg-gray-700/30 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4">Eksportinnstillinger</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.exportSettings?.includeIntro ?? true}
              onChange={(e) => updateData('exportSettings', {
                ...data.exportSettings,
                includeIntro: e.target.checked
              })}
              className="rounded border-gray-500 text-blue-600"
            />
            <span className="text-gray-300">Inkluder "Om boligen" introduksjon</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.exportSettings?.includePropertyInfo ?? true}
              onChange={(e) => updateData('exportSettings', {
                ...data.exportSettings,
                includePropertyInfo: e.target.checked
              })}
              className="rounded border-gray-500 text-blue-600"
            />
            <span className="text-gray-300">Inkluder boliginformasjon</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.exportSettings?.includeImages ?? false}
              onChange={(e) => updateData('exportSettings', {
                ...data.exportSettings,
                includeImages: e.target.checked
              })}
              className="rounded border-gray-500 text-blue-600"
            />
            <span className="text-gray-300">Inkluder bilder (kun Word/PDF)</span>
          </label>
        </div>
      </div>

      {/* Preview */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Forhåndsvisning</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewMode('formatted')}
              className={`px-4 py-2 rounded-lg text-sm ${
                previewMode === 'formatted' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-700/50 text-gray-400'
              }`}
            >
              Formatert
            </button>
            <button
              onClick={() => setPreviewMode('raw')}
              className={`px-4 py-2 rounded-lg text-sm ${
                previewMode === 'raw' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-700/50 text-gray-400'
              }`}
            >
              Rådata
            </button>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-6 max-h-96 overflow-y-auto">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
            {getPreviewContent()}
          </pre>
        </div>
      </div>

      {/* Share & Save */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <h4 className="text-lg font-medium text-green-300 mb-3">Del resultater</h4>
          <p className="text-sm text-gray-300 mb-4">
            Generer en lenke for å dele resultatene med kolleger eller kunder.
          </p>
          {shareLink ? (
            <div className="space-y-3">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <code className="text-xs text-green-400 break-all">{shareLink}</code>
              </div>
              <p className="text-xs text-green-300">✓ Kopiert til utklippstavle</p>
            </div>
          ) : (
            <button
              onClick={generateShareLink}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
            >
              🔗 Generer delbar lenke
            </button>
          )}
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
          <h4 className="text-lg font-medium text-purple-300 mb-3">Lagre som mal</h4>
          <p className="text-sm text-gray-300 mb-4">
            Lagre innstillinger og stil for gjenbruk på fremtidige prosjekter.
          </p>
          <button
            onClick={saveAsTemplate}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg"
          >
            💾 Lagre mal
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-700/30 rounded-xl p-6">
        <h4 className="text-lg font-medium text-white mb-4">Prosjektsammendrag</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{data.results?.length || 0}</div>
            <div className="text-sm text-gray-400">Bilder analysert</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {data.results?.reduce((acc, r) => acc + r.description.split(' ').length, 0) || 0}
            </div>
            <div className="text-sm text-gray-400">Totalt ord</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {Object.keys(data.editedResults || {}).length}
            </div>
            <div className="text-sm text-gray-400">Redigeringer</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              ~{Math.round((data.results?.length || 0) * 0.5)}s
            </div>
            <div className="text-sm text-gray-400">Spart tid</div>
          </div>
        </div>
      </div>
    </div>
  );
}