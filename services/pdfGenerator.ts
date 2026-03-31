
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Nova abordagem: Captura o HTML renderizado (que já está perfeito visualmente)
 * e o transforma em imagens para o PDF. Isso evita todos os erros de layout
 * do método "vetorial" anterior.
 * 
 * @param pageIds Array de strings com os IDs dos elementos HTML a serem capturados (ex: ['pdf-page-0', 'pdf-page-1'])
 * @param fileName Nome do arquivo para salvar
 */
export const saveHTMLToPDF = async (pageIds: string[], fileName: string) => {
  // A4 dimensions in mm
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = 210;
  const pdfHeight = 297;

  for (let i = 0; i < pageIds.length; i++) {
    const elementId = pageIds[i];
    const element = document.getElementById(elementId);

    if (!element) {
      console.warn(`Elemento ${elementId} não encontrado.`);
      continue;
    }

    try {
      // Captura o elemento com alta qualidade (scale 2 = Retina)
      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true, // Importante para imagens
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9); // Compressão leve (0.9)

      // Adiciona nova página se não for a primeira
      if (i > 0) {
        pdf.addPage();
      }

      // Adiciona a imagem cobrindo toda a página A4
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    } catch (error) {
      console.error(`Erro ao capturar página ${i + 1}:`, error);
      alert(`Erro ao gerar página ${i + 1}. Verifique se todas as imagens carregaram.`);
    }
  }

  // Sanitiza nome do arquivo
  const safeName = fileName.replace(/[^a-z0-9]/gi, '_').substring(0, 30) || 'Ficha_Imovel';
  pdf.save(`${safeName}.pdf`);
};
