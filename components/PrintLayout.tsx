import React from 'react';
import { PropertyData, PrintableImage } from '../types';

interface PrintLayoutProps {
  data: PropertyData;
  images: PrintableImage[];
  logoUrl: string | null;
}

// A4 Page Component
const A4Page: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div 
      className={`
          relative bg-white overflow-hidden mx-auto my-8 shadow-2xl 
          w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm]
          print:w-[210mm] print:h-[297mm] print:shadow-none print:m-0 print:my-0 print:break-after-page
          ${className}
      `}
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
  >
      {children}
  </div>
);

// Footer Component
const Footer = ({ pageNum, logoUrl }: { pageNum?: number; logoUrl: string | null }) => (
  <div 
    className="absolute bottom-0 left-0 right-0 h-[35mm] bg-[#fbbf24] !bg-[#fbbf24] text-slate-900 flex items-center justify-between px-[10mm] border-t-4 border-slate-900 print:h-[35mm]"
    style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
  >
      <div className="flex items-center h-full w-1/4">
          {logoUrl && <img src={logoUrl} className="h-24 w-auto object-contain" alt="Logo" loading="eager" />}
      </div>
      <div className="flex flex-col justify-center items-center text-center h-full flex-1 px-2">
          <p className="font-bold text-[10px] uppercase tracking-widest mb-1">Entre em contato e agende sua visita</p>
          <h3 className="font-serif font-black text-xl uppercase leading-none mb-0.5">MARCELO DOS ANJOS</h3>
          <p className="text-[11px] font-bold uppercase leading-tight">CORRETOR DE IMÓVEIS</p>
          <p className="text-[11px] font-bold uppercase mb-2">CRECI 1089</p>
          <div className="w-full h-px bg-slate-900/20 mb-2"></div>
          <div className="flex gap-4 text-[11px] font-bold">
               <span>marcelodosanjosimoveis@hotmail.com</span>
               <span>•</span>
               <span>www.anjosimoveis.net</span>
          </div>
      </div>
      <div className="text-right flex flex-col justify-center h-full w-1/4">
          <p className="text-[9px] font-bold uppercase mb-1">PARA MAIORES INFORMAÇÕES:</p>
          <p className="font-black text-lg leading-tight tracking-tight">(82) 9 9901-8701</p>
          <p className="font-black text-lg leading-tight tracking-tight">(82) 9 8879-3479</p>
      </div>
      {pageNum && (
          <div className="absolute bottom-1 right-[50%] translate-x-[50%] text-[8px] font-bold text-slate-700 opacity-60">
              Página {pageNum}
          </div>
      )}
  </div>
);

const PrintLayout: React.FC<PrintLayoutProps> = ({ data, images = [], logoUrl }) => {
  const ai = data.aiContent || {
    marketingTitle: data.title || "Imóvel Sem Título",
    headline: "Oportunidade Exclusiva",
    coverHighlights: [],
    sections: [],
    locationHighlight: data.location || ""
  };

  const formattedPrice = data.price || "Sob Consulta";
  
  const highlights = ai.coverHighlights && ai.coverHighlights.length > 0 
    ? ai.coverHighlights.slice(0, 4) 
    : ["Localização Privilegiada", "Acabamento de Alto Padrão", "Documentação Regularizada", "Excelente Oportunidade"];

  // --- SMART PAGINATION LOGIC FOR TEXT ---
  // We need to split sections and their content across pages
  const textPages: { title: string; content: string[]; isList: boolean }[][] = [];
  let currentPageSections: { title: string; content: string[]; isList: boolean }[] = [];
  let currentSpaceUsed = 0;
  
  // Use a conservative estimate for available space
  // 1 unit = roughly 1 line of text + margin
  const PAGE_1_MAX_UNITS = 20; 
  const PAGE_N_MAX_UNITS = 42;

  ai.sections.forEach((section) => {
      let sectionTitleAdded = false;
      let currentSectionContent: string[] = [];
      
      const addSectionToPage = () => {
          if (currentSectionContent.length > 0) {
              currentPageSections.push({
                  title: sectionTitleAdded ? `${section.title} (Cont.)` : section.title,
                  content: currentSectionContent,
                  isList: section.isList
              });
              sectionTitleAdded = true;
              currentSectionContent = [];
          }
      };

      const titleUnits = 3; // Title takes about 3 lines of space
      
      const maxAllowed = textPages.length === 0 ? PAGE_1_MAX_UNITS : PAGE_N_MAX_UNITS;
      
      if (currentSpaceUsed + titleUnits > maxAllowed && currentPageSections.length > 0) {
          textPages.push(currentPageSections);
          currentPageSections = [];
          currentSpaceUsed = 0;
      }
      
      currentSpaceUsed += titleUnits;

      section.content.forEach((item) => {
          // Estimate lines this item will take. 
          // A typical line might hold 60-70 characters in this layout.
          const lines = Math.ceil(item.length / 60); 
          const itemUnits = section.isList ? lines : lines + 1; // Add 1 for paragraph spacing
          
          const currentMaxAllowed = textPages.length === 0 ? PAGE_1_MAX_UNITS : PAGE_N_MAX_UNITS;

          if (currentSpaceUsed + itemUnits > currentMaxAllowed && (currentPageSections.length > 0 || currentSectionContent.length > 0)) {
              addSectionToPage();
              if (currentPageSections.length > 0) {
                  textPages.push(currentPageSections);
                  currentPageSections = [];
              }
              currentSpaceUsed = titleUnits; // Account for title on new page
          }
          
          currentSectionContent.push(item);
          currentSpaceUsed += itemUnits;
      });
      
      addSectionToPage();
      currentSpaceUsed += 2; // Bottom margin after section
  });

  if (currentPageSections.length > 0) {
      textPages.push(currentPageSections);
  }

  // --- SMART PAGINATION LOGIC FOR IMAGES ---
  const galleryPages: PrintableImage[][] = [];
  let i = 0;

  while (i < images.length) {
    const current = images[i];
    
    if (current.isPortrait) {
        galleryPages.push([current]);
        i++;
    } else {
        const next = images[i + 1];
        if (next && !next.isPortrait) {
            galleryPages.push([current, next]);
            i += 2;
        } else {
            galleryPages.push([current]);
            i++;
        }
    }
  }

  return (
    <div className="w-full flex flex-col items-center py-8 print:bg-white print:block print:p-0">
      
      {/* ================= TEXT PAGES ================= */}
      {textPages.map((pageSections, pIdx) => (
        <A4Page key={`text-${pIdx}`} className="px-[15mm] pt-[10mm] pb-[40mm]">
          {/* Barra superior amarela */}
          <div 
              className="absolute top-0 left-0 w-full h-4 bg-[#fbbf24] !bg-[#fbbf24]" 
              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
          ></div>

          {pIdx === 0 && (
            <div className="mt-4 mb-6 border-b-2 border-[#fbbf24] pb-6">
                 <div className="flex justify-between items-start mb-4 gap-6">
                     <div className="w-[65%]">
                        <h1 className="font-serif text-[26pt] font-black text-[#0f172a] uppercase leading-[1] mb-2">{ai.marketingTitle}</h1>
                        <h2 className="text-[#d97706] text-xl font-bold leading-tight uppercase tracking-wide">{ai.headline}</h2>
                     </div>
                     <div className="w-[35%] text-right flex flex-col items-end">
                        {(() => {
                            const match = formattedPrice.match(/^(a\s*partir\s*de)\s*:?\s*(.*)$/i);
                            if (match) {
                                return (
                                    <div className="flex flex-col items-end">
                                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">A partir de:</span>
                                        <span className="font-serif font-bold text-2xl text-[#0f172a] leading-none whitespace-nowrap">{match[2]}</span>
                                    </div>
                                );
                            }
                            return (
                                <div className="font-serif font-bold text-2xl text-[#0f172a] text-right leading-tight">
                                    {formattedPrice}
                                </div>
                            );
                        })()}
                        <div 
                            className="text-slate-900 text-[11px] font-bold uppercase tracking-widest mt-2 bg-[#fbbf24] !bg-[#fbbf24] inline-block px-3 py-1 rounded"
                            style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                        >
                            📍 {data.location}
                        </div>
                     </div>
                 </div>
                 
                 {/* REFACTORED HIGHLIGHTS SECTION */}
                 <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-slate-50 p-5 rounded-xl border-l-8 border-[#fbbf24]">
                    {highlights.map((highlight, idx) => {
                        const firstSpaceIndex = highlight.indexOf(' ');
                        let first = highlight;
                        let rest = "";
                        
                        if (firstSpaceIndex !== -1) {
                            first = highlight.substring(0, firstSpaceIndex);
                            rest = highlight.substring(firstSpaceIndex + 1);
                        }

                        return (
                            <div key={idx} className="flex flex-row items-baseline gap-2">
                                <span className="font-serif font-black text-2xl text-[#d97706] tracking-tighter leading-none">
                                    {first}
                                </span>
                                <span className="text-xs text-slate-800 font-bold uppercase tracking-wide leading-tight">
                                    {rest}
                                </span>
                            </div>
                        );
                    })}
                 </div>
            </div>
          )}

          <div className={`flex flex-col gap-6 ${pIdx > 0 ? 'mt-4' : ''}`}>
              {pageSections.map((section, idx) => (
                  <div key={idx}>
                      <h3 className="font-serif text-lg font-bold text-[#0f172a] mb-2 flex items-center gap-2 uppercase border-b border-slate-200 pb-1">
                          <span 
                              className="w-3 h-3 bg-[#fbbf24] !bg-[#fbbf24] inline-block"
                              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                          ></span>
                          {section.title}
                      </h3>
                      {section.isList ? (
                          <ul className="space-y-1 mt-2">
                              {section.content.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-800 text-justify leading-relaxed font-medium">
                                      <span className="text-[#d97706] font-bold">✓</span><span>{item}</span>
                                  </li>
                              ))}
                          </ul>
                      ) : (
                          <div className="space-y-3 mt-2">
                               {section.content.map((item, i) => (
                                  <p key={i} className="text-sm text-slate-700 text-justify leading-relaxed indent-4">{item}</p>
                               ))}
                          </div>
                      )}
                  </div>
              ))}
          </div>
          <Footer pageNum={pIdx + 1} logoUrl={logoUrl} />
        </A4Page>
      ))}

      {/* ================= GALLERY PAGES ================= */}
      {galleryPages.map((pageImages, pIdx) => (
         <A4Page key={pIdx} className="p-[15mm] pt-[15mm]">
             <div className="flex flex-col gap-6 h-[240mm] items-center justify-center">
                 {pageImages.map((img, i) => {
                     let heightClass = "h-[110mm]"; 
                     if (img.isPortrait) heightClass = "h-[220mm]"; 
                     else if (pageImages.length === 1) heightClass = "h-[160mm]"; 

                     return (
                        <div key={i} className={`relative w-full ${heightClass} bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center`}>
                            <img 
                                src={img.url} 
                                className="w-full h-full object-contain" 
                                alt={`Galeria ${pIdx}-${i}`} 
                                loading="eager"
                            />
                        </div>
                     );
                 })}
             </div>

             <Footer pageNum={textPages.length + pIdx + 1} logoUrl={logoUrl} />
         </A4Page>
      ))}

    </div>
  );
};

export default PrintLayout;