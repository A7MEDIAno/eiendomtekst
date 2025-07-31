// ===== FILE: components/wizard/ProgressBar.js - ENKEL VERSJON =====
export default function ProgressBar({ currentStep, totalSteps }) {
  const steps = [
    { number: 1, name: 'Bilder', icon: '📸' },
    { number: 2, name: 'Info', icon: '📝' },
    { number: 3, name: 'Stil', icon: '🎨' },
    { number: 4, name: 'Gjennomgang', icon: '👁️' },
    { number: 5, name: 'Eksport', icon: '💾' }
  ];

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center flex-1">
          {/* Step circle */}
          <div
            className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
              step.number === currentStep
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : step.number < currentStep
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {step.number < currentStep ? (
              <span className="text-xl">✓</span>
            ) : (
              <span className="text-xl">{step.icon}</span>
            )}
            
            {/* Step name */}
            <span className="absolute -bottom-6 text-xs text-gray-400 whitespace-nowrap">
              {step.name}
            </span>
          </div>

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className="flex-1 h-1 mx-4">
              <div className="h-full bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    step.number < currentStep ? 'bg-green-600' : 'bg-transparent'
                  }`}
                  style={{
                    width: step.number < currentStep ? '100%' : '0%'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}