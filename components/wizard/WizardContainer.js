// components/wizard/WizardContainer.js - FIXED VERSION
import { useState, useEffect, useCallback } from 'react';
import { useWizard } from '../../contexts/WizardContext';
import ProgressBar from './ProgressBar';
import Step1Images from './steps/Step1Images';
import Step2PropertyInfo from './steps/Step2PropertyInfo';
import Step3StyleTarget from './steps/Step3StyleTarget';
import Step4Review from './steps/Step4Review';
import Step5Export from './steps/Step5Export';

export default function WizardContainer() {
  const { currentStep, goToStep, nextStep, prevStep, resetWizard, canProceed } = useWizard();
  const [isExiting, setIsExiting] = useState(false);
  const [canProceedState, setCanProceedState] = useState(true);

  // Update canProceed state with setTimeout to avoid setState during render
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = canProceed();
      setCanProceedState(result);
    }, 0);
    
    return () => clearTimeout(timer);
  }, [currentStep, canProceed]);

  // Håndter exit med useCallback for å unngå re-renders
  const handleExit = useCallback(() => {
    if (window.confirm('Er du sikker på at du vil avslutte? All fremgang vil gå tapt.')) {
      setIsExiting(true);
      resetWizard();
      
      // Gå tilbake til classic mode
      setTimeout(() => {
        localStorage.setItem('preferWizardMode', 'false');
        window.location.reload();
      }, 300);
    }
  }, [resetWizard]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleExit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleExit]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Images />;
      case 2:
        return <Step2PropertyInfo />;
      case 3:
        return <Step3StyleTarget />;
      case 4:
        return <Step4Review />;
      case 5:
        return <Step5Export />;
      default:
        return <Step1Images />;
    }
  };

  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < 5;

  // Step info for progress and titles
  const stepInfo = {
    1: {
      title: 'Last inn bilder',
      description: 'Start med å legge inn bildene som skal analyseres',
      icon: '📸'
    },
    2: {
      title: 'Boliginformasjon',
      description: 'Legg inn informasjon om boligen',
      icon: '📝'
    },
    3: {
      title: 'Stil og målgruppe',
      description: 'Velg stil og målgruppe for beskrivelsene',
      icon: '🎨'
    },
    4: {
      title: 'Gjennomgang',
      description: 'Se over og rediger resultatene',
      icon: '👁️'
    },
    5: {
      title: 'Eksporter',
      description: 'Last ned beskrivelsene i ønsket format',
      icon: '💾'
    }
  };

  const currentStepInfo = stepInfo[currentStep] || stepInfo[1];

  return (
    <div 
      className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-3xl">🧙‍♂️</span>
                  A7 Generate Wizard
                </h1>
                <span className="text-purple-300 text-sm">
                  Steg {currentStep} av 5
                </span>
              </div>
              
              <button
                onClick={handleExit}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                title="Gå tilbake til klassisk modus (Esc)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <ProgressBar currentStep={currentStep} totalSteps={5} />
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 pb-20">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{currentStepInfo.icon}</span>
              <h2 className="text-2xl font-bold text-white">
                Steg {currentStep}: {currentStepInfo.title}
              </h2>
            </div>
            <p className="text-gray-300 mb-8">
              {currentStepInfo.description}
            </p>
            
            {/* Step content */}
            <div className="step-content">
              {renderStep()}
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-md border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={prevStep}
                disabled={!canGoBack}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  canGoBack
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Tilbake
              </button>

              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <button
                    key={step}
                    onClick={() => goToStep(step)}
                    className={`w-10 h-10 rounded-full transition-all font-medium ${
                      step === currentStep
                        ? 'bg-purple-500 text-white shadow-lg scale-110'
                        : step < currentStep
                        ? 'bg-green-500/30 text-green-300 hover:bg-green-500/40'
                        : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                    title={`Gå til steg ${step}`}
                  >
                    {step < currentStep ? '✓' : step}
                  </button>
                ))}
              </div>

              <button
                onClick={nextStep}
                disabled={!canGoNext || !canProceedState}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  canGoNext && canProceedState
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg'
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
                title={!canProceedState ? 'Fullfør dette steget før du går videre' : ''}
              >
                Neste
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
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
        
        /* Custom scrollbar for step content */
        .step-content {
          max-height: calc(100vh - 400px);
          overflow-y: auto;
          padding-right: 8px;
        }
        
        .step-content::-webkit-scrollbar {
          width: 8px;
        }
        
        .step-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        
        .step-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        
        .step-content::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}