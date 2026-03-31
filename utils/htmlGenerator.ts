
import { PropertyData } from "../types";

export const generatePrintableHTML = (data: PropertyData, images: string[], logoUrl: string | null) => {
  const ai = data.aiContent!;
  
  // Format price helper
  const formattedPrice = data.price || "Sob Consulta";

  // HTML Structure
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
            @page {
                size: A4;
                margin: 0;
            }
            body {
                font-family: 'Inter', sans-serif;
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .font-serif { font-family: 'Playfair Display', serif; }
            
            /* Page Logic */
            .page {
                width: 210mm;
                height: 297mm;
                position: relative;
                overflow: hidden;
                page-break-after: always;
                background-color: white;
            }
            
            /* Cover Page Styles */
            .cover-image {
                height: 60%;
                width: 100%;
                object-fit: cover;
                mask-image: linear-gradient(to bottom, black 85%, transparent 100%);
            }
            
            /* Typography */
            h1, h2, h3 { color: #1e293b; }
            p { color: #334155; line-height: 1.6; text-align: justify; }
            
            /* Modern ChatGPT-style List Styles */
            ul.feature-list {
                list-style: none;
                padding: 0;
            }
            ul.feature-list li {
                padding-left: 0;
                margin-bottom: 0.6rem;
                color: #475569;
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
                line-height: 1.5;
            }
            
            /* Only add bullet if it DOES NOT start with an emoji-like character range */
            /* Assuming standard text starts with alphanumeric */
            /* We handle this in JS rendering below generally, but here's a fallback */
            
            .gallery-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                padding: 20px;
                height: 85%;
                align-content: start;
            }
            .gallery-item {
                width: 100%;
                aspect-ratio: 4/3;
                object-fit: cover;
                border-radius: 6px;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            }
            
            /* Footer */
            .footer {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 25mm;
                background: #0f172a;
                color: white;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 15mm;
            }

            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>

        <!-- PAGE 1: COVER & INTRO -->
        <div class="page">
            <!-- Header Bar -->
            <div class="absolute top-0 w-full h-3 bg-amber-600 z-10"></div>
            
            <!-- Hero Image (First Image) -->
            ${images[0] ? `<img src="${images[0]}" class="cover-image" alt="Capa" />` : '<div class="h-[60%] bg-slate-100 flex items-center justify-center text-slate-400">Sem Foto de Capa</div>'}
            
            <!-- Floating Title Card -->
            <div class="absolute top-[52%] left-[10mm] right-[10mm] bg-white shadow-2xl p-8 rounded-lg border-l-8 border-amber-600">
                <h1 class="font-serif text-3xl font-bold text-slate-900 uppercase tracking-wide mb-3 leading-tight">
                    ${ai.marketingTitle}
                </h1>
                <p class="text-amber-700 font-medium text-lg mb-5 flex items-center gap-2">
                    ${ai.headline}
                </p>
                <div class="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                    <span class="text-slate-500 font-semibold text-xs uppercase tracking-widest flex items-center gap-1">
                        📍 ${data.location}
                    </span>
                    <span class="text-2xl font-bold text-slate-900 font-serif">
                        ${formattedPrice}
                    </span>
                </div>
            </div>

            <!-- Intro Text (Bottom Section) -->
            <div class="absolute bottom-[28mm] left-[15mm] right-[15mm] h-[20%] overflow-hidden">
                <div class="text-sm text-slate-700 leading-relaxed columns-2 gap-10" style="column-rule: 1px solid #e2e8f0;">
                     ${ai.sections[0]?.content.map(p => `<p class="mb-4 first-letter:text-3xl first-letter:font-bold first-letter:text-amber-600 first-letter:mr-1 first-letter:float-left">${p}</p>`).join('')}
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <div class="flex items-center gap-5">
                    ${logoUrl ? `<img src="${logoUrl}" class="h-14 w-auto brightness-0 invert" />` : ''}
                    <div class="border-l border-slate-600 pl-4">
                        <p class="font-bold text-sm tracking-wider text-white">MARCELO DOS ANJOS</p>
                        <p class="text-[10px] text-slate-400 uppercase">Corretor de Imóveis • CRECI 1089</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-amber-500 text-xl flex items-center gap-2 justify-end font-serif">
                        <span class="bg-green-500 w-2 h-2 rounded-full inline-block animate-pulse"></span>
                        (82) 9 9901-8701
                    </p>
                    <p class="text-xs text-slate-300 tracking-wide">www.anjosimoveis.net</p>
                </div>
            </div>
        </div>

        <!-- PAGE 2: DETAILS -->
        <div class="page p-[15mm] pt-[20mm]">
             <div class="absolute top-0 left-0 w-full h-3 bg-slate-900"></div>

            <div class="grid grid-cols-2 gap-x-16 gap-y-10 h-full content-start">
                ${ai.sections.slice(1).map(section => `
                    <div class="break-inside-avoid">
                        <h3 class="font-serif text-lg font-bold text-slate-800 mb-5 border-b-2 border-amber-100 pb-2 flex items-center gap-2">
                            ${section.title}
                        </h3>
                        <ul class="feature-list text-sm">
                            ${section.content.map(item => {
                                // Logic: If item starts with an emoji or special char, don't add dot.
                                // Otherwise, add a subtle dot.
                                const cleanItem = item.trim();
                                const hasEmoji = /^\p{Emoji}/u.test(cleanItem) || /^[✅📍💎🚀🛋️✨🏊]/.test(cleanItem);
                                
                                if (hasEmoji) {
                                    return `<li>${cleanItem}</li>`;
                                } else {
                                    return `<li><span class="text-amber-500 font-bold mr-1">•</span> ${cleanItem}</li>`;
                                }
                            }).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>

            <div class="footer">
                <div class="text-xs text-slate-400">Ficha Técnica Inteligente</div>
                <div class="text-xs text-slate-500 font-medium">ImobiAuto Creator</div>
            </div>
        </div>

        <!-- GALLERY PAGES -->
        ${generateGalleryHTML(images, logoUrl)}

        <script>
            // Auto trigger print when loaded
            window.onload = () => {
                setTimeout(() => {
                    window.print();
                }, 1000); // Wait for images to render
            };
        </script>
    </body>
    </html>
  `;

  return html;
};

const generateGalleryHTML = (images: string[], logoUrl: string | null) => {
    // Start from index 1 (0 is cover)
    const galleryImages = images.slice(1);
    const imagesPerPage = 4;
    let pagesHtml = '';

    for (let i = 0; i < galleryImages.length; i += imagesPerPage) {
        const chunk = galleryImages.slice(i, i + imagesPerPage);
        
        pagesHtml += `
        <div class="page">
             <div class="absolute top-0 left-0 w-full h-3 bg-slate-900"></div>
             
             <div class="pt-[15mm] px-[15mm]">
                <h2 class="font-serif text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3 border-b border-slate-200 pb-4">
                    <span class="text-amber-600">GALERIA</span> DE IMAGENS
                </h2>
                
                <div class="gallery-grid">
                    ${chunk.map(img => `<img src="${img}" class="gallery-item" />`).join('')}
                </div>
             </div>

             <div class="footer">
                <div class="flex items-center gap-4">
                     ${logoUrl ? `<img src="${logoUrl}" class="h-8 w-auto brightness-0 invert opacity-70" />` : ''}
                </div>
                <div class="text-xs text-slate-400">www.anjosimoveis.net</div>
            </div>
        </div>
        `;
    }
    
    return pagesHtml;
}
