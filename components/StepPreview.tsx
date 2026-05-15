
import React, { useState } from 'react';
import { PropertyData, PrintableImage } from '../types';
import { ArrowLeft, CheckCircle2, X, Eye, Printer, Download, Loader2 } from 'lucide-react';
import PrintLayout from './PrintLayout';

interface StepPreviewProps {
  processedImages: PrintableImage[]; 
  logo: File | null;
  data: PropertyData;
  onBack: () => void;
}

const StepPreview: React.FC<StepPreviewProps> = ({ processedImages, logo, data, onBack }) => {
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (logo) setLogoUrl(URL.createObjectURL(logo));
    
    // Set document title cleanly for PDF saving without encoding issues
    const originalTitle = document.title;
    if (data.title || data.aiContent?.marketingTitle) {
      const safeTitle = (data.aiContent?.marketingTitle || data.title || "Ficha_Imovel")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z0-9 ]/g, " ") // Remove special chars
        .replace(/\s+/g, "_")
        .substring(0, 50);
      document.title = safeTitle;
    }
    
    return () => {
        document.title = originalTitle;
    };
  }, [logo, data]);

  const handlePrint = () => {
    // Check if running inside AI Studio iframe
    if (window.self !== window.top) {
        alert("O navegador bloqueia o download de arquivos dentro desta pré-visualização.\n\nPara baixar seu PDF:\n1. Clique no ícone 'Open in New Tab' (↗️) no canto superior direito do painel ao lado.\n2. Na nova aba, conclua a geração normalmente!");
        return;
    }

    alert("Para garantir a ALTA QUALIDADE das imagens e textos, vamos usar a função nativa do seu navegador.\n\nNa próxima tela, selecione a opção 'Salvar como PDF' para baixar, ou escolha sua impressora.\n\nIMPORTANTE: Ative a opção 'Gráficos de plano de fundo' ou 'Background graphics' para exibir as cores corretas.");
    window.print();
  };

  return (
    <>
      {/* 
        === VERSÃO DE IMPRESSÃO (INVISÍVEL NA TELA) === 
        Esta div só aparece quando window.print() é chamado.
        Ela está fora de qualquer modal/scroll, garantindo impressão perfeita.
      */}
      <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:z-[9999] print-only-container">
          <PrintLayout data={data} images={processedImages} logoUrl={logoUrl} />
      </div>

      {/* 
        === INTERFACE DO USUÁRIO (VISÍVEL NA TELA) === 
        Tudo aqui tem a classe 'print:hidden' para sumir na impressão.
      */}
      <div className="space-y-6 animate-fade-in pb-20 print:hidden">
        
        {/* MODAL DE VISUALIZAÇÃO */}
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/95 overflow-y-auto animate-fade-in flex flex-col items-center">
              
              {/* Toolbar */}
              <div className="sticky top-0 w-full bg-slate-800 text-white p-4 shadow-lg flex justify-between items-center z-50 border-b border-slate-700">
                  <div className="flex items-center gap-4">
                      <button 
                          onClick={() => setShowPreviewModal(false)}
                          className="p-2 hover:bg-slate-700 rounded-full transition text-slate-400 hover:text-white"
                          title="Fechar"
                      >
                          <X size={24}/>
                      </button>
                      <div>
                          <h3 className="font-bold text-lg">Visualização Final</h3>
                          <p className="text-xs text-slate-400">
                              Salve como PDF ou Imprima diretamente na impressora.
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button
                          onClick={handlePrint}
                          className="px-6 py-2 rounded-lg font-bold shadow-lg transition flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                          <Download size={20} />
                          SALVAR PDF / IMPRIMIR
                      </button>
                  </div>
              </div>

              {/* Área de Visualização (Scrollável) */}
              <div className="w-full flex justify-center py-8 px-4">
                  <div className="bg-slate-200 p-8 shadow-inner flex flex-col items-center gap-8 min-h-screen origin-top transform scale-[0.8] md:scale-100">
                      <PrintLayout data={data} images={processedImages} logoUrl={logoUrl} />
                  </div>
              </div>
          </div>
        )}


        {/* DASHBOARD PRINCIPAL */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              
              {/* Header */}
              <div className="bg-slate-900 p-8 text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-900 shadow-xl">
                      <CheckCircle2 size={32} strokeWidth={3}/>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Pronto para Gerar!</h2>
                  <p className="text-slate-400">Suas imagens e textos foram processados com sucesso.</p>
              </div>

              {/* Actions */}
              <div className="p-8 space-y-6">
                  
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-900 mb-4 text-center">
                      <strong>Aviso de Qualidade:</strong> O modo mais perfeito de salvar este arquivo é visualizando e usando a função "Salvar como PDF" do sistema.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                          onClick={() => setShowPreviewModal(true)}
                          className="w-full bg-slate-900 text-white text-lg font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition flex items-center justify-center gap-3 transform hover:scale-[1.01]"
                      >
                          <Eye size={24} className="text-amber-500"/>
                          VISUALIZAR
                      </button>
                      
                      <button
                          onClick={handlePrint}
                          className="w-full bg-blue-600 text-white text-lg font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-3 transform hover:scale-[1.01]"
                      >
                          <Printer size={24} className="text-white"/>
                          IMPRIMIR / BAIXAR PDF
                      </button>
                  </div>

                  <div className="text-center pt-4">
                      <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-2 mx-auto">
                          <ArrowLeft size={16}/> Voltar para ajustes
                      </button>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StepPreview;
