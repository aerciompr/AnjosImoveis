
import React, { useState, useEffect } from 'react';
import { PropertyData } from '../types';
import { Sparkles, Loader2, ArrowLeft, ArrowRight, ClipboardPaste, Wand2 } from 'lucide-react';
import { generatePDFContent, parseRawListing } from '../services/geminiService';
import { resizeImageForAI } from '../utils/imageProcessing';

interface StepDetailsProps {
  data: PropertyData;
  setData: (data: PropertyData) => void;
  onBack: () => void;
  onNext: () => void;
  photos: File[]; // Received photos
  importedText?: string; // New prop for PDF/Text import
}

const StepDetails: React.FC<StepDetailsProps> = ({ data, setData, onBack, onNext, photos, importedText }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [showImporter, setShowImporter] = useState(true);

  // Auto-fill raw input if extracted text is passed
  useEffect(() => {
    if (importedText && importedText.trim().length > 0) {
        setRawInput(importedText);
        // Optional: Auto trigger analysis if text is present
        // handleSmartImport(); 
    }
  }, [importedText]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  const handleSmartImport = async () => {
    if (!rawInput.trim()) return;
    setIsImporting(true);
    
    try {
      // Call the new service that parses raw text
      const extractedData = await parseRawListing(rawInput);
      
      if (extractedData) {
        setData(extractedData);
        // If units are found, we don't hide the importer yet so the user can see the table
        if (!extractedData.units || extractedData.units.length === 0) {
          setShowImporter(false); 
        }
      } else {
        alert("Não foi possível extrair dados. Tente preencher manualmente.");
      }
    } catch (error) {
      console.error("Smart Import Error:", error);
      alert("Ocorreu um erro ao processar os dados. Tente novamente.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!data.title) {
      alert("Preencha o título para ajudar a IA.");
      return;
    }
    
    setIsEnhancing(true);

    try {
        // Convert first 3 photos to optimized base64 to send to AI
        const photoPreviews: string[] = [];
        const limit = Math.min(photos.length, 3);
        for(let i=0; i<limit; i++) {
            // Resize image to max 800px and compress to avoid "Rpc failed due to xhr error" (Payload too large)
            const base64 = await resizeImageForAI(photos[i]);
            photoPreviews.push(base64);
        }

        const aiContent = await generatePDFContent(
            data.title || "", 
            data.location || "", 
            data.features || "", 
            data.description || "",
            photoPreviews // Pass images
        );
        
        if (aiContent) {
          setData({
            ...data,
            aiContent: aiContent
          });
        }
    } catch (e) {
        console.error(e);
        alert("Erro ao gerar conteúdo. Tente novamente ou reduza o número de fotos.");
    } finally {
        setIsEnhancing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Smart Import Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <Wand2 className="text-indigo-600" size={20}/>
                Importação Inteligente (PDF/WhatsApp)
            </h2>
            <button 
                onClick={() => setShowImporter(!showImporter)}
                className="text-xs text-indigo-600 font-medium hover:underline"
            >
                {showImporter ? 'Esconder' : 'Mostrar'}
            </button>
        </div>
        
        {showImporter && (
            <div className="space-y-3">
                <p className="text-sm text-indigo-800">
                    {importedText ? 'Texto extraído do PDF abaixo. Clique em "Organizar Dados".' : 'Cole o texto do anúncio ou faça upload de um PDF na etapa anterior.'}
                </p>
                <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Cole aqui o texto bagunçado..."
                    className="w-full h-32 p-3 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex justify-end">
                    <button
                        onClick={handleSmartImport}
                        disabled={isImporting || !rawInput.trim()}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isImporting ? <Loader2 className="animate-spin" size={16}/> : <ClipboardPaste size={16}/>}
                        {isImporting ? 'Analisando...' : 'Organizar Dados'}
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Manual Editing Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input
                type="text"
                name="title"
                value={data.title}
                onChange={handleChange}
                className="w-full p-3 border border-slate-300 rounded-lg"
            />
            </div>
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preço</label>
            <input
                type="text"
                name="price"
                value={data.price}
                onChange={handleChange}
                className="w-full p-3 border border-slate-300 rounded-lg"
            />
            </div>
        </div>
        
        {/* We keep location and features inputs for manual override, but mostly rely on AI Content */}
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Localização</label>
            <input type="text" name="location" value={data.location} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg"/>
        </div>

        {/* AI Content Status Preview */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-800 text-sm mb-3">Conteúdo Organizado para o PDF</h4>
            {data.aiContent ? (
                <div className="space-y-2">
                    <p className="text-xs text-green-700 font-medium">✅ Conteúdo gerado com sucesso!</p>
                    <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 max-h-40 overflow-y-auto">
                        <strong>Título:</strong> {data.aiContent.marketingTitle}<br/>
                        <strong>Seções:</strong> {data.aiContent.sections.map(s => s.title).join(', ')}
                    </div>
                </div>
            ) : (
                 <div className="text-center py-4">
                     <p className="text-xs text-slate-500 mb-3">
                        {photos.length > 0 ? `A IA analisará suas ${photos.length} fotos e o texto.` : 'O conteúdo ainda não foi gerado.'}
                     </p>
                     <button
                        onClick={handleGenerateContent}
                        disabled={isEnhancing}
                        className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded text-xs font-semibold shadow-sm inline-flex items-center gap-2"
                        >
                        {isEnhancing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                        {photos.length > 0 ? 'Analisar Fotos e Gerar PDF' : 'Gerar Estrutura do PDF'}
                    </button>
                 </div>
            )}
        </div>

        <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
            onClick={onBack}
            className="px-6 py-3 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition flex items-center gap-2"
            >
            <ArrowLeft size={18} /> Voltar
            </button>
            <button
            onClick={onNext}
            disabled={!data.aiContent}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition shadow-lg flex items-center gap-2 ${
                !data.aiContent ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
            }`}
            >
            Visualizar <ArrowRight size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default StepDetails;
