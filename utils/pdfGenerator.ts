
import { jsPDF } from "jspdf";
import { PropertyData, AIRealEstateContent } from "../types";
import { getImageDimensions } from "./imageProcessing";

// 1. Emoji Replacement Map: Translates emojis to text/symbols safe for PDF
// Updated to support ChatGPT-style icons
const EMOJI_MAP: Record<string, string> = {
    "📍": "Local:",
    "📐": "Área:",
    "🌊": "Vista:",
    "🌅": "Sol:",
    "🏗️": "Infra:",
    "🏗": "Infra:",
    "🚧": "Obras:",
    "🏨": "Vocação:",
    "✨": ">>",
    "💎": "Destaque:",
    "✅": "OK:",
    "🚀": "Potencial:",
    "🛋️": "Interior:",
    "🛋": "Interior:",
    "🏊": "Lazer:",
    "🍖": "Gourmet:",
    "📞": "Tel:",
    "🟢": "ON:", 
    "🛌": "Quartos:",
    "🚿": "Banheiros:",
    "🚗": "Vagas:"
};

const normalizeText = (text: string) => {
  if (!text) return "";
  
  let processed = text;
  
  // Replace known emojis with text
  Object.keys(EMOJI_MAP).forEach(emoji => {
      processed = processed.replace(new RegExp(emoji, 'g'), EMOJI_MAP[emoji]);
  });

  // Strip remaining non-Latin1 characters to prevent PDF width calculation errors
  // Allowed: ASCII (x20-x7E), Latin1 Supplement (A0-FF), Bullet (2022)
  return processed
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2022\n\r]/g, "") 
    .replace(/\s+/g, " ")
    .trim();
};

export const generateRealEstatePDF = async (data: PropertyData, images: string[], logoUrl: string | null) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // --- CONFIGURATION ---
  const margin = 10; // 10mm margins (Narrow)
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - (margin * 2);

  const COLORS = {
    primary: [15, 23, 42],   // Dark Blue
    accent: [217, 119, 6],   // Gold/Orange
    text: [33, 33, 33],      // Dark Gray
    subtext: [75, 75, 75],   // Medium Gray
    whatsapp: [37, 211, 102] // WhatsApp Green
  };

  const ai = data.aiContent!;

  // --- HELPERS ---

  const drawHeaderBar = () => {
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');
  };

  const drawFooter = (pageNum: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado por ImobiAuto Creator`, margin, pageHeight - 8);
    doc.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  let currentY = 18;
  const checkPageBreak = (heightNeeded: number) => {
    if (currentY + heightNeeded > pageHeight - 15) {
      drawFooter(doc.internal.getNumberOfPages());
      doc.addPage();
      drawHeaderBar();
      currentY = 18;
      return true;
    }
    return false;
  };

  // --- PAGE 1 CONTENT ---
  drawHeaderBar();

  // 1. Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  
  const cleanTitle = normalizeText(ai.marketingTitle.toUpperCase());
  const titleLines = doc.splitTextToSize(cleanTitle, contentWidth);
  doc.text(titleLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += (titleLines.length * 6) + 3;

  // 2. Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin + 10, currentY, pageWidth - (margin + 10), currentY);
  currentY += 6;

  // 3. Headline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.subtext[0], COLORS.subtext[1], COLORS.subtext[2]);
  
  const cleanHeadline = normalizeText(ai.headline);
  const headlineLines = doc.splitTextToSize(cleanHeadline, contentWidth);
  doc.text(headlineLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += (headlineLines.length * 5) + 5;

  // 4. Price
  if (data.price) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    const cleanPrice = normalizeText(`Valor: ${data.price}`);
    doc.text(cleanPrice, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
  }

  // 5. Sections
  for (const section of ai.sections) {
    // Section Title
    checkPageBreak(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    
    const cleanSectionTitle = normalizeText(section.title);
    doc.text(cleanSectionTitle, margin, currentY);
    currentY += 6;

    // Content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    for (const item of section.content) {
      const cleanItem = normalizeText(item);
      if (!cleanItem) continue;

      const isBullet = section.isList || cleanItem.startsWith('•') || cleanItem.startsWith('-');
      const itemText = cleanItem.replace(/^[•-]\s*/, '');

      if (isBullet) {
        // Hanging Indent Logic
        const bulletWidth = 4;
        const textWidth = contentWidth - bulletWidth;
        
        const lines = doc.splitTextToSize(itemText, textWidth);
        const heightNeeded = (lines.length * 4.5) + 2;

        checkPageBreak(heightNeeded);

        doc.text("•", margin, currentY);
        doc.text(lines, margin + bulletWidth, currentY); // Left aligned lists look better
        currentY += heightNeeded;
      } else {
        // Justified Paragraph Logic
        // To justify correctly, we can't let jsPDF handle wrapping entirely on its own 
        // because it doesn't calculate height perfectly for justified text.
        // We use splitTextToSize to get lines, then print them.
        
        const lines = doc.splitTextToSize(itemText, contentWidth);
        const heightNeeded = (lines.length * 5) + 3;
        
        checkPageBreak(heightNeeded);
        
        // Use 'justify' alignment. 
        // Note: jsPDF justifies the last line if not careful, but usually acceptable for blocks.
        doc.text(lines, margin, currentY, { align: 'justify', maxWidth: contentWidth });
        currentY += heightNeeded;
      }
    }
    currentY += 2; // Gap between sections
  }

  // 6. Contact Info (Sticky to bottom if space permits, else next page)
  const contactHeight = 30;
  if (currentY + contactHeight > pageHeight - 15) {
     doc.addPage();
     drawHeaderBar();
     currentY = 20;
  } else {
     currentY += 5; // Little gap
  }

  // Center Contact Info
  const centerX = pageWidth / 2;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("MARCELO DOS ANJOS", centerX, currentY, { align: 'center' });
  currentY += 5;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("CORRETOR DE IMÓVEIS – CRECI 1089", centerX, currentY, { align: 'center' });
  currentY += 5;

  // WhatsApp Line with Manual Icon
  const waText = "WhatsApp: (82) 9 9901-8701";
  const iconSize = 3;
  const waTextWidth = doc.getTextWidth(waText);
  const totalWidth = iconSize + 2 + waTextWidth;
  const startX = centerX - (totalWidth / 2);

  // Draw Green Circle
  doc.setFillColor(COLORS.whatsapp[0], COLORS.whatsapp[1], COLORS.whatsapp[2]);
  doc.circle(startX + (iconSize/2), currentY - 1, iconSize/2, 'F');

  // Draw Text
  doc.text(waText, startX + iconSize + 2, currentY);
  currentY += 5;

  // Website
  doc.setTextColor(30, 64, 175);
  doc.textWithLink("www.anjosimoveis.net", centerX - (doc.getTextWidth("www.anjosimoveis.net")/2), currentY, { url: "http://www.anjosimoveis.net" });

  drawFooter(1);

  // --- GALLERY PAGES ---
  let gIdx = 0;
  let pNum = 2;

  while (gIdx < images.length) {
    doc.addPage();
    drawHeaderBar();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("GALERIA DE IMAGENS", margin, 12);

    const imgStartY = 16;
    const imgAreaHeight = pageHeight - imgStartY - 15;
    
    const img1 = images[gIdx];
    const d1 = await getImageDimensions(img1);
    const isPortrait1 = d1.ratio < 1;

    if (isPortrait1) {
      // Portrait: Max height, Center
      let h = imgAreaHeight;
      let w = h * d1.ratio;
      if (w > contentWidth) { w = contentWidth; h = w / d1.ratio; }
      
      doc.addImage(img1, 'JPEG', (pageWidth - w)/2, imgStartY, w, h);
      gIdx++;
    } else {
      // Landscape: Stack 2
      const gap = 5;
      const slotHeight = (imgAreaHeight - gap) / 2;
      
      // Img 1
      let h1 = slotHeight;
      let w1 = h1 * d1.ratio;
      if (w1 > contentWidth) { w1 = contentWidth; h1 = w1 / d1.ratio; }
      
      doc.addImage(img1, 'JPEG', (pageWidth - w1)/2, imgStartY, w1, h1);
      gIdx++;

      // Img 2
      if (gIdx < images.length) {
         const img2 = images[gIdx];
         const d2 = await getImageDimensions(img2);
         // Check if second image fits well
         let h2 = slotHeight;
         let w2 = h2 * d2.ratio;
         if (w2 > contentWidth) { w2 = contentWidth; h2 = w2 / d2.ratio; }
         
         // Only add if it fits on page
         if (imgStartY + h1 + gap + h2 <= pageHeight - 10) {
            doc.addImage(img2, 'JPEG', (pageWidth - w2)/2, imgStartY + h1 + gap, w2, h2);
            gIdx++;
         }
      }
    }
    drawFooter(pNum++);
  }

  const safeTitle = data.title ? normalizeText(data.title).replace(/[^a-zA-Z0-9]/g, '_') : 'Ficha';
  doc.save(`${safeTitle.substring(0, 30)}.pdf`);
};
