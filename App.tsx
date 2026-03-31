
import React, { useState, useEffect } from 'react';
import { Step, PropertyData, PrintableImage } from './types';
import StepUpload from './components/StepUpload';
import StepDetails from './components/StepDetails';
import StepWatermark from './components/StepWatermark'; // New Component
import StepPreview from './components/StepPreview';
import { CheckCircle, Image as ImageIcon, FileText, Stamp, Printer } from 'lucide-react';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.UPLOAD);
  
  // State for Steps
  const [photos, setPhotos] = useState<File[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  
  // Stores text extracted from PDF to pre-fill Step 2
  const [pdfExtractedText, setPdfExtractedText] = useState<string>('');

  // Custom End Card State (User uploaded)
  const [endCard, setEndCard] = useState<File | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // NEW: Store the final processed images as structured objects
  const [finalImages, setFinalImages] = useState<PrintableImage[]>([]);

  const [propertyData, setPropertyData] = useState<PropertyData>({
    title: '',
    price: '',
    location: '',
    features: '',
    description: ''
  });

  // AUTOMATION: Fetch specific assets on load
  useEffect(() => {
    const loadAssets = async () => {
        try {
            // 1. Load Fixed Logo
            const logoRes = await fetch('/logob.png');
            if (logoRes.ok) {
                const logoBlob = await logoRes.blob();
                const logoFile = new File([logoBlob], "logob.png", { type: "image/png" });
                setLogo(logoFile);
                console.log("Logo carregada automaticamente.");
            } else {
                console.warn("Logo automática não encontrada (404).");
            }
        } catch (error) {
            console.error("Erro ao carregar assets:", error);
        } finally {
            setAssetsLoaded(true);
        }
    };

    loadAssets();
  }, []);

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  // Handler specifically for finishing the watermark step
  const handleWatermarkComplete = (images: PrintableImage[]) => {
      setFinalImages(images);
      nextStep();
  };

  // Stepper Config
  const steps = [
      { id: Step.UPLOAD, label: 'Fotos', icon: ImageIcon },
      { id: Step.DETAILS, label: 'Dados', icon: FileText },
      { id: Step.WATERMARK, label: 'Marca D\'água', icon: Stamp },
      { id: Step.PREVIEW, label: 'PDF Final', icon: Printer },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold">
              IA
            </div>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Marcelo dos Anjos <span className="text-slate-400 font-normal">| Creator</span></h1>
          </div>
          <div className="flex items-center gap-2">
              {!assetsLoaded && <span className="text-xs text-amber-600 animate-pulse">Carregando assets...</span>}
              <div className="text-xs text-amber-700 font-bold bg-amber-100 px-2 py-1 rounded">
                 CRECI 1089
              </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Progress Bar */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center w-full max-w-2xl relative">
            <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 -z-10 rounded"></div>
            <div 
              className="absolute left-0 top-1/2 h-1 bg-amber-500 -z-10 rounded transition-all duration-500 ease-out"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            ></div>

            <div className="flex justify-between w-full">
              {steps.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep >= step.id;
                  const isCompleted = currentStep > step.id;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${
                        isActive ? 'bg-amber-500 border-amber-500 text-white scale-110 shadow-lg' : 'bg-white border-slate-300 text-slate-400'
                        }`}>
                        {isCompleted ? <CheckCircle size={20} /> : <Icon size={18} />}
                        </div>
                        <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                            {step.label}
                        </span>
                    </div>
                  );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="transition-all duration-300">
          {currentStep === Step.UPLOAD && (
            <StepUpload 
              photos={photos} 
              setPhotos={setPhotos} 
              logo={logo} 
              setLogo={setLogo}
              onNext={nextStep}
              onPdfTextExtracted={setPdfExtractedText}
            />
          )}
          
          {currentStep === Step.DETAILS && (
            <StepDetails 
              data={propertyData} 
              setData={setPropertyData} 
              onBack={prevStep} 
              onNext={nextStep}
              photos={photos}
              importedText={pdfExtractedText} 
            />
          )}

          {currentStep === Step.WATERMARK && (
            <StepWatermark 
              photos={photos}
              logo={logo}
              endCard={endCard}
              setEndCard={setEndCard}
              onBack={prevStep}
              onComplete={handleWatermarkComplete}
            />
          )}

          {currentStep === Step.PREVIEW && (
            <StepPreview 
              processedImages={finalImages} // Receives Structured PrintableImage[]
              logo={logo} 
              data={propertyData} 
              onBack={prevStep}
            />
          )}
        </div>

      </main>
    </div>
  );
};

export default App;
