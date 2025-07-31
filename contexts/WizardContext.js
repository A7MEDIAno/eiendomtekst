// ===== FILE: contexts/WizardContext.js - FORBEDRET VALIDERING =====
import { createContext, useContext, useState, useEffect, useRef } from 'react';

const WizardContext = createContext();

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
};

const STORAGE_KEY = 'a7_generate_wizard_state';

export const WizardProvider = ({ children }) => {
  // Initial state
  const initialState = {
    currentStep: 1,
    completedSteps: [],
    data: {
      // Step 1: Bilder
      mode: 'gallery', // VIKTIG: Default mode må være 'gallery'
      galleryUrl: '',
      imageUrls: [''],
      uploadedImages: [],
      previewImages: [], // For lagring av preview-bilder
      totalImagesFound: 0,
      
      // Step 2: Eiendomsinfo
      propertyAddress: '',
      manualAddress: '',
      propertyInfo: '',
      conditionReport: null,
      competitorAnalysis: null,
      areaInfo: '',
      
      // Step 3: Stil & Målgruppe
      targetGroup: 'standard',
      useInspiration: false,
      inspirationText: '',
      usePropertyIntro: true,
      introStyle: 'professional',
      meglerInfo: '',
      selectedTemplate: null,
      propertyIntro: '',
      targetGroupSuggestion: null,
      
      // Step 4: Resultater
      results: [],
      editedResults: {},
      regeneratedCount: {},
      
      // Step 5: Eksport
      exportSettings: {
        format: 'word',
        includeIntro: true,
        includePropertyInfo: true,
        includeImages: false
      }
    },
    validation: {
      step1: false,
      step2: false,
      step3: true,
      step4: false,
      step5: true
    }
  };

  const [state, setState] = useState(initialState);
  const isInitialMount = useRef(true);

  // Load from localStorage only on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          // Don't restore preview images or results as they might be stale
          const cleanedData = {
            ...parsed.data,
            previewImages: [],
            results: []
          };
          setState(prev => ({
            ...prev,
            ...parsed,
            data: cleanedData,
            currentStep: 1 // Always start at step 1
          }));
        } catch (e) {
          console.error('Failed to load saved wizard state:', e);
        }
      }
      isInitialMount.current = false;
    }
  }, []);

  // Save to localStorage with debounce
  useEffect(() => {
    if (!isInitialMount.current) {
      const timeoutId = setTimeout(() => {
        try {
          // Don't save large data like preview images
          const dataToSave = {
            ...state,
            data: {
              ...state.data,
              previewImages: [], // Don't save preview images
              results: [] // Don't save results
            }
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
          console.error('Failed to save wizard state:', e);
        }
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [state]);

  // Navigation
  const goToStep = (step) => {
    if (step >= 1 && step <= 5) {
      setState(prev => ({ ...prev, currentStep: step }));
    }
  };

  const nextStep = () => {
    if (state.currentStep < 5) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])]
      }));
    }
  };

  const prevStep = () => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  // Data updates
  const updateData = (key, value) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [key]: value
      }
    }));
  };

  const updateMultipleData = (updates) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        ...updates
      }
    }));
  };

  // Validation
  const validateStep = (step) => {
    let isValid = false;
    
    switch (step) {
      case 1:
        // Valid if we have gallery URL or at least one image URL
        if (state.data.mode === 'gallery') {
          // For gallery mode, check if we have a URL and preferably preview images
          isValid = !!(state.data.galleryUrl && state.data.galleryUrl.trim());
          // If we have preview images, that's even better
          if (state.data.previewImages && state.data.previewImages.length > 0) {
            isValid = true;
          }
        } else {
          // For direct mode, need at least one valid URL
          isValid = state.data.imageUrls.some(url => url && url.trim());
        }
        break;
      
      case 2:
        // Valid if we have either address or property info
        isValid = !!(state.data.propertyAddress || state.data.manualAddress || state.data.propertyInfo);
        break;
      
      case 3:
        // Always valid (has defaults)
        isValid = true;
        break;
      
      case 4:
        // Valid if we have results
        isValid = state.data.results.length > 0;
        break;
      
      case 5:
        // Always valid
        isValid = true;
        break;
    }
    
    // Only update if validation state changed
    if (state.validation[`step${step}`] !== isValid) {
      setState(prev => ({
        ...prev,
        validation: {
          ...prev.validation,
          [`step${step}`]: isValid
        }
      }));
    }
    
    return isValid;
  };

  // Reset
  const resetWizard = () => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Clear specific step data
  const clearStepData = (step) => {
    const updates = {};
    
    switch (step) {
      case 1:
        updates.galleryUrl = '';
        updates.imageUrls = [''];
        updates.uploadedImages = [];
        updates.previewImages = [];
        updates.results = [];
        break;
      case 2:
        updates.propertyAddress = '';
        updates.manualAddress = '';
        updates.propertyInfo = '';
        updates.conditionReport = null;
        updates.competitorAnalysis = null;
        updates.areaInfo = '';
        break;
      case 3:
        updates.targetGroup = 'standard';
        updates.useInspiration = false;
        updates.inspirationText = '';
        updates.propertyIntro = '';
        break;
      case 4:
        updates.results = [];
        updates.editedResults = {};
        updates.regeneratedCount = {};
        break;
    }
    
    updateMultipleData(updates);
  };

  // Check if can proceed to next step
  const canProceed = () => {
    return validateStep(state.currentStep);
  };

  const value = {
    ...state,
    goToStep,
    nextStep,
    prevStep,
    updateData,
    updateMultipleData,
    validateStep,
    resetWizard,
    clearStepData,
    canProceed
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};