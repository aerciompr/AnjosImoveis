
import { GoogleGenAI, Type } from "@google/genai";
import { AIRealEstateContent, PropertyData } from "../types";

const apiKey = (window as any).ENV?.VITE_GEMINI_API_KEY && (window as any).ENV.VITE_GEMINI_API_KEY !== '__VITE_GEMINI_API_KEY__'
  ? (window as any).ENV.VITE_GEMINI_API_KEY
  : import.meta.env.VITE_GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

const sanitizeForPDF = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/\u00A0/g, ' ')
    .trim();
};

const SYSTEM_INSTRUCTION = `
Você é um Copywriter Imobiliário de Elite, especializado no mercado de Alto Padrão.
Sua missão não é apenas descrever, mas VENDER O SONHO com riqueza de detalhes.

DIRETRIZES RÍGIDAS DE QUALIDADE:
1. **VOLUME DE TEXTO (CRÍTICO):** O cliente exige descrições longas. A seção "Sobre o Imóvel" DEVE ter pelo menos 3 parágrafos robustos. Nunca escreva respostas curtas.
2. **EXPANSÃO CRIATIVA:** Se o imóvel for simples, use adjetivos poderosos ("iluminação natural abundante", "ventilação cruzada", "privacidade absoluta"). Deduza acabamentos pelas fotos.
3. **LOCALIZAÇÃO:** Use o campo 'location' para escrever um parágrafo inteiro sobre a conveniência de viver naquele bairro.
4. **TOM DE VOZ:** Sofisticado, envolvente e emocional. Use palavras como "imponente", "aconchegante", "exclusivo", "refinado".

FORMATO:
- Títulos: Curtos e de impacto.
- Texto: Longo, fluido e bem pontuado.
`;

// Helper to convert base64 data URL to Gemini Part
const imageToPart = (base64Data: string) => {
    return {
        inlineData: {
            data: base64Data.split(',')[1],
            mimeType: base64Data.split(';')[0].split(':')[1]
        }
    };
};

export const parseRawListing = async (rawText: string): Promise<PropertyData | null> => {
  try {
    const prompt = `
      Analise este texto bruto de anúncio imobiliário e extraia os dados.
      Texto: "${rawText}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            price: { type: Type.STRING },
            location: { type: Type.STRING },
            features: { type: Type.STRING },
            description: { type: Type.STRING },
            aiContent: {
              type: Type.OBJECT,
              properties: {
                marketingTitle: { type: Type.STRING },
                headline: { type: Type.STRING },
                coverHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      content: { type: Type.ARRAY, items: { type: Type.STRING } },
                      isList: { type: Type.BOOLEAN }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text);
    return {
      title: sanitizeForPDF(data.title),
      price: sanitizeForPDF(data.price),
      location: sanitizeForPDF(data.location),
      features: sanitizeForPDF(data.features),
      description: sanitizeForPDF(data.description),
      aiContent: {
        marketingTitle: sanitizeForPDF(data.aiContent.marketingTitle),
        headline: sanitizeForPDF(data.aiContent.headline),
        coverHighlights: data.aiContent.coverHighlights?.map(sanitizeForPDF) || [],
        sections: data.aiContent.sections.map((s: any) => ({
          ...s,
          title: sanitizeForPDF(s.title),
          content: s.content.map(sanitizeForPDF)
        })),
        locationHighlight: sanitizeForPDF(data.location)
      }
    };
  } catch (error) {
    console.error("Gemini Content Error:", error);
    return null;
  }
};

export const generatePDFContent = async (
    title: string, 
    location: string, 
    features: string, 
    description: string,
    images: string[] = [] 
): Promise<AIRealEstateContent | null> => {
  try {
    const parts = [];
    
    // Add Images first (up to 4 for better context)
    images.slice(0, 4).forEach(img => {
        parts.push(imageToPart(img));
    });

    const textPrompt = `
      Gere o conteúdo da Ficha Técnica Imobiliária.
      
      INPUT:
      - Imóvel: ${title}
      - Local: ${location}
      - Dados: ${features}
      - Obs: ${description}

      ESTRUTURA OBRIGATÓRIA DO JSON:
      1. marketingTitle: Título Vendedor (Ex: "Mansão Suspensa no Horto").
      2. headline: Frase curta de impacto emocional.
      3. coverHighlights: Exatamente 4 destaques curtos (Ex: "Vista Mar", "4 Suítes").
      4. sections:
         - "Sobre o Imóvel": TEXTO CORRIDO (MÍNIMO 3 PARÁGRAFOS). Descreva a experiência de viver lá. Fale da luz, dos espaços e do conforto.
         - "Localização Premium": TEXTO CORRIDO sobre as vantagens do bairro ${location}.
         - "Detalhes e Lazer": LISTA (Bullet points) com tudo que o imóvel/condomínio tem.

      IMPORTANTE: Escreva MUITO. O cliente quer ler detalhes. Se não houver info, deduza positivamente com base nas fotos (ex: "acabamento refinado", "amplitude").
    `;

    parts.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: { parts: parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            marketingTitle: { type: Type.STRING },
            headline: { type: Type.STRING },
            coverHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.ARRAY, items: { type: Type.STRING } },
                  isList: { type: Type.BOOLEAN }
                }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text);
    return {
      marketingTitle: sanitizeForPDF(data.marketingTitle),
      headline: sanitizeForPDF(data.headline),
      coverHighlights: data.coverHighlights?.map(sanitizeForPDF) || [],
      sections: data.sections.map((s: any) => ({
        ...s,
        title: sanitizeForPDF(s.title),
        content: s.content.map(sanitizeForPDF)
      })),
      locationHighlight: sanitizeForPDF(location)
    };
  } catch (error) {
    console.error("Gemini PDF Content Gen Error:", error);
    return null;
  }
};

export const enhanceImageWithAI = async (base64Image: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: 'Improve lighting, color balance and sharpness of this real estate photo. Keep it realistic.' }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};
