
import React, { useEffect, useState, useRef } from 'react';
import { WatermarkSettings, PrintableImage } from '../types';
import { applyWatermark, readFileAsDataURL, loadImage } from '../utils/imageProcessing';
import { LayoutTemplate, CheckCircle2, ArrowLeft, ArrowRight, Loader2, RefreshCw, ImagePlus, Trash2 } from 'lucide-react';

interface StepWatermarkProps {
  photos: File[];
  logo: File | null;
  endCard: File | null;
  setEndCard: (file: File | null) => void;
  onBack: () => void;
  onComplete: (images: PrintableImage[]) => void;
}

const StepWatermark: React.FC<StepWatermarkProps> = ({ photos, logo, endCard, setEndCard, onBack, onComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const endCardInputRef = useRef<HTMLInputElement>(null);
  
  // Default Settings
  const [wmSettings, setWmSettings] = useState<WatermarkSettings>({
    opacity: 1.0,
    scale: 0.25,
    position: 'bottom-right'
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Debounced processing for the PREVIEW only
  useEffect(() => {
    if (photos.length === 0) return;

    const updatePreview = async () => {
        try {
            const res = await applyWatermark(photos[0], logo, wmSettings);
            setPreviewUrl(res);
        } catch (e) {
            console.error(e);
        }
    };

    const timer = setTimeout(updatePreview, 300);
    return () => clearTimeout(timer);
  }, [photos, logo, wmSettings]);

  const handleEndCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEndCard(e.target.files[0]);
    }
  };


  // THE MAIN ACTION: Process, Classify, Sort and Save
  const handleProcessAll = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    // Changed: Maintain original order instead of sorting by orientation
    const processedList: PrintableImage[] = [];
    
    try {
        // 1. Process User Photos
        const total = photos.length + (endCard ? 1 : 0);
        let current = 0;

        for (const file of photos) {
            // Update UI
            current++;
            setProgress(Math.round((current / total) * 100));

            // Apply watermark
            const markedBase64 = await applyWatermark(file, logo, wmSettings);
            
            // Check orientation
            const img = await loadImage(markedBase64);
            const isPortrait = img.height > img.width;

            const printableObj: PrintableImage = {
                url: markedBase64,
                isPortrait: isPortrait
            };

            processedList.push(printableObj);

            // Tiny yield to keep UI responsive
            await new Promise(r => setTimeout(r, 10));
        }

        // 2. Process End Card (if exists)
        if (endCard) {
            current++;
            setProgress(Math.round((current / total) * 100));
            
            // End card gets NO watermark (pass null for logo)
            const endUrl = await applyWatermark(endCard, null, wmSettings);
            
            // Assume End Card is always landscape/special (safe default)
            const endCardObj: PrintableImage = {
                url: endUrl,
                isPortrait: false 
            };
            
            processedList.push(endCardObj);
        }
        
        setProgress(100);
        
        // Pass the final structured array to the parent app
        onComplete(processedList);

    } catch (e) {
        console.error("Batch processing error", e);
        alert("Erro ao processar imagens. Tente recarregar a página.");
        setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
        
        {/* Left: Configuration Controls */}
        <div className="lg:col-span-1 space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24 space-y-6">
                
                {/* 1. Watermark Settings */}
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <LayoutTemplate size={20} className="text-amber-500"/> Personalizar Logo
                    </h2>

                    {logo ? (
                        <div className="space-y-5">
                            <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded border border-green-100 text-xs font-bold">
                                <CheckCircle2 size={16}/> Logo ativa
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Posição</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'].map((pos) => (
                                        <button
                                            key={pos}
                                            onClick={() => setWmSettings({...wmSettings, position: pos as any})}
                                            className={`p-2 rounded border text-[10px] font-medium transition ${
                                                wmSettings.position === pos 
                                                ? 'bg-amber-500 text-white border-amber-600' 
                                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {pos.replace('-', ' ').toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 block mb-1">Tamanho da Logo</label>
                                    <input 
                                        type="range" min="0.1" max="1.0" step="0.05" 
                                        value={wmSettings.scale}
                                        onChange={(e) => setWmSettings({...wmSettings, scale: parseFloat(e.target.value)})}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        title={`Escala: ${Math.round(wmSettings.scale * 100)}%`}
                                    />
                                    <div className="text-[10px] text-right text-slate-400 mt-1">{Math.round(wmSettings.scale * 100)}%</div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 block mb-1">Opacidade</label>
                                    <input 
                                        type="range" min="0.2" max="1" step="0.1" 
                                        value={wmSettings.opacity}
                                        onChange={(e) => setWmSettings({...wmSettings, opacity: parseFloat(e.target.value)})}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-red-50 text-red-600 p-4 rounded text-sm font-bold">
                            Logo não encontrada. Volte e faça o upload.
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-100 pt-4"></div>

                {/* 2. End Card Section */}
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <ImagePlus size={20} className="text-blue-500"/> Card Final (Opcional)
                    </h2>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                        Adicione uma imagem de fechamento (ex: seus contatos, logo grande) para ser a <strong>última página</strong> do PDF.
                    </p>

                    <div 
                        onClick={() => !endCard && endCardInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition relative overflow-hidden h-32
                            ${endCard ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50 cursor-pointer'}
                        `}
                    >
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={endCardInputRef} 
                            onChange={handleEndCardUpload}
                        />

                        {endCard ? (
                            <div className="w-full h-full flex items-center justify-center relative">
                                <img 
                                    src={URL.createObjectURL(endCard)} 
                                    className="max-h-full max-w-full object-contain shadow-sm" 
                                    alt="End Card"
                                />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEndCard(null); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                                    title="Remover"
                                >
                                    <Trash2 size={14}/>
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-[9px] font-bold py-1">
                                    CARD SELECIONADO
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-400">
                                <ImagePlus size={24} className="mx-auto mb-1 opacity-50"/>
                                <span className="text-xs font-bold">Clique para adicionar</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                    {isProcessing ? (
                         <div className="bg-slate-900 text-white p-4 rounded-lg text-center">
                            <Loader2 className="animate-spin mx-auto mb-2 text-amber-500" size={24}/>
                            <p className="text-sm font-bold">Processando Fotos...</p>
                            <p className="text-xs text-slate-400 mt-1">Aplicando marcas d'água...</p>
                            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-amber-500 h-full transition-all duration-200" style={{width: `${progress}%`}}></div>
                            </div>
                         </div>
                    ) : (
                        <button
                            onClick={handleProcessAll}
                            className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 text-lg group"
                        >
                            Aplicar e Gerar PDF <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                    )}

                    <button
                        onClick={onBack}
                        disabled={isProcessing}
                        className="w-full py-3 text-slate-500 font-medium hover:text-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
                </div>
             </div>
        </div>

        {/* Right: Preview Area */}
        <div className="lg:col-span-2 space-y-4">
             <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm min-h-[500px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-700">Pré-visualização (Amostra)</h3>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold">
                        Total: {photos.length} fotos {endCard && '+ 1 Card Final'}
                    </span>
                </div>

                <div className="bg-slate-100 rounded-lg p-1 border border-slate-200 overflow-hidden relative group flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                    {previewUrl ? (
                        <img src={previewUrl} className="max-h-[500px] w-auto h-auto rounded shadow-sm object-contain" alt="Preview"/>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400 gap-2">
                             <Loader2 className="animate-spin"/> Carregando Preview...
                        </div>
                    )}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 flex gap-3">
                    <RefreshCw className="shrink-0 mt-0.5" size={18}/>
                    <div>
                        <p className="font-bold">Resumo da Ordem</p>
                        <ul className="list-disc list-inside opacity-90 text-xs mt-1 space-y-1">
                            <li>Suas {photos.length} fotos aparecerão na ordem de upload.</li>
                            {endCard ? (
                                <li className="font-bold text-green-700">O Card Final será adicionado na última página.</li>
                            ) : (
                                <li className="text-slate-500 italic">Nenhum Card Final selecionado.</li>
                            )}
                        </ul>
                    </div>
                </div>
             </div>
        </div>

    </div>
  );
};

export default StepWatermark;
