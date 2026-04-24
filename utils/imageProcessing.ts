
import { WatermarkSettings, ImageDimensions } from '../types';
import JSZip from 'jszip';
import heic2any from 'heic2any';

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const loadImage = (src: string | File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve(img);
      // It's safer to avoid immediate revoke if canvas draw needs it in some engines
      // but usually it's fine. We'll leave it to GC or keep it simpler.
      if (typeof src !== 'string' || src.startsWith('blob:')) {
         // Optionally revoke after a delay to ensure drawImage completes
         setTimeout(() => URL.revokeObjectURL(img.src), 100);
      }
    };
    img.onerror = (err) => {
        const typeInfo = typeof src === 'string' ? `string (len: ${src.length})` : 'File';
        console.error(`loadImage failed explicitly for type: ${typeInfo}`, err);
        reject(err);
    };
    
    if (typeof src === 'string') {
        if (src.startsWith('http')) {
            img.crossOrigin = "anonymous";
        }
        img.src = src;
    } else {
        try {
            img.src = URL.createObjectURL(src);
        } catch (e) {
            reject(e);
        }
    }
  });
};

export const getImageDimensions = (src: string): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        ratio: img.width / img.height
      });
    };
    img.onerror = reject;
    img.src = src;
  });
};

// NEW: Optimized resizing for AI Analysis to prevent 500 Payload Errors
export const resizeImageForAI = async (file: File, maxDimension: number = 800): Promise<string> => {
  const img = await loadImage(file);
  
  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;

  // Resize logic to maintain aspect ratio
  if (width > height) {
    if (width > maxDimension) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    }
  } else {
    if (height > maxDimension) {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  ctx.drawImage(img, 0, 0, width, height);
  
  // Compress to 60% quality JPEG to drastically reduce payload size for API
  return canvas.toDataURL('image/jpeg', 0.6);
};

export const applyWatermark = async (
  imageFile: File | string,
  logoFile: File | null,
  settings: WatermarkSettings,
  preloadedLogo?: HTMLImageElement | null
): Promise<{ base64: string, width: number, height: number }> => {
  const baseImage = await loadImage(imageFile);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  // STRICT RESIZE: Keep exact aspect ratio. Max 1024px to prevent memory crashes.
  const MAX_DIMENSION = 1024;
  let newWidth = baseImage.width;
  let newHeight = baseImage.height;

  if (newWidth > MAX_DIMENSION || newHeight > MAX_DIMENSION) {
    if (newWidth > newHeight) {
        // Landscape
        const ratio = newHeight / newWidth;
        newWidth = MAX_DIMENSION;
        newHeight = Math.round(MAX_DIMENSION * ratio);
    } else {
        // Portrait
        const ratio = newWidth / newHeight;
        newHeight = MAX_DIMENSION;
        newWidth = Math.round(MAX_DIMENSION * ratio);
    }
  }

  // Set canvas to EXACT dimensions of the resized image
  canvas.width = newWidth;
  canvas.height = newHeight;

  // Draw original image exactly filling the canvas
  ctx.drawImage(baseImage, 0, 0, newWidth, newHeight);

  if (logoFile || preloadedLogo) {
    const logoImage = preloadedLogo ? preloadedLogo : await loadImage(logoFile!);

    // Calculate logo size relative to canvas
    const logoWidth = newWidth * settings.scale;
    const aspectRatio = logoImage.height / logoImage.width;
    const logoHeight = logoWidth * aspectRatio;

    let x = 0;
    let y = 0;
    const padding = newWidth * 0.05; // 5% padding based on width

    switch (settings.position) {
        case 'center':
            x = (newWidth - logoWidth) / 2;
            y = (newHeight - logoHeight) / 2;
            break;
        case 'bottom-right':
            x = newWidth - logoWidth - padding;
            y = newHeight - logoHeight - padding;
            break;
        case 'bottom-left':
            x = padding;
            y = newHeight - logoHeight - padding;
            break;
        case 'top-right':
            x = newWidth - logoWidth - padding;
            y = padding;
            break;
        case 'top-left':
            x = padding;
            y = padding;
            break;
    }

    ctx.globalAlpha = settings.opacity;
    ctx.drawImage(logoImage, x, y, logoWidth, logoHeight);
    ctx.globalAlpha = 1.0;
  }

  const base64 = canvas.toDataURL('image/jpeg', 0.85);

  // Free memory
  canvas.width = 0;
  canvas.height = 0;

  return { base64, width: newWidth, height: newHeight };
};

// --- ZIP UTILS ---

export const extractFilesFromZip = async (zipFile: File): Promise<File[]> => {
    const zip = new JSZip();
    const validFiles: File[] = [];

    try {
        const content = await zip.loadAsync(zipFile);
        
        // Filter out directories and hidden files/folders
        const entries = Object.values(content.files).filter((entry: any) => {
            if (entry.dir) return false;
            const pathParts = entry.name.split('/');
            // Ignore if any part of the path starts with . or __MACOSX
            return !pathParts.some((part: string) => part.startsWith('.') || part.startsWith('__MACOSX'));
        });
        
        const promises = entries.map(async (entry: any) => {
            const name = entry.name.toLowerCase();
            const isImage = /\.(jpg|jpeg|png|webp|gif|heic|heif|bmp|tiff)$/.test(name);
            const isVideo = /\.(mp4|mov|webm|m4v|avi|mkv|wmv|flv)$/.test(name);
            const isPdf = /\.pdf$/.test(name);
            const isText = /\.(txt|rtf|doc|docx)$/.test(name);
            const isZip = /\.zip$/.test(name);

            if (isImage || isVideo || isPdf || isText || isZip) {
                let blob = await entry.async('blob');
                let type = 'application/octet-stream';
                let fileName = entry.name.split('/').pop() || entry.name;
                
                if (isImage) {
                    // ... (existing image logic)
                    if (name.endsWith('heic') || name.endsWith('heif')) {
                        try {
                            const convertedBlob = await heic2any({
                                blob,
                                toType: "image/jpeg",
                                quality: 0.7
                            });
                            blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                            type = 'image/jpeg';
                            fileName = fileName.replace(/\.(heic|heif)$/i, '.jpg');
                        } catch (e) {
                            console.warn("HEIC conversion failed", e);
                            type = 'image/jpeg'; // Fallback
                        }
                    } else if (name.endsWith('png')) type = 'image/png';
                    else if (name.endsWith('webp')) type = 'image/webp';
                    else if (name.endsWith('gif')) type = 'image/gif';
                    else type = 'image/jpeg';
                } else if (isVideo) {
                    type = 'video/mp4'; 
                } else if (isPdf) {
                    type = 'application/pdf';
                } else if (isText) {
                    if (name.endsWith('txt')) type = 'text/plain';
                    else if (name.endsWith('rtf')) type = 'application/rtf';
                    else type = 'application/msword';
                } else if (isZip) {
                    type = 'application/zip';
                }
                
                validFiles.push(new File([blob], fileName, { type }));
            }
        });

        // Process in chunks of 5 to avoid overwhelming memory/CPU (especially for HEIC)
        const chunkSize = 5;
        for (let i = 0; i < promises.length; i += chunkSize) {
            await Promise.all(promises.slice(i, i + chunkSize));
        }

        return validFiles;
    } catch (error) {
        console.error("ZIP Error", error);
        throw new Error("Não foi possível ler o arquivo ZIP.");
    }
};

// --- VIDEO & SIMILARITY UTILS ---

// Helper: Resize image to small thumbnail for fast comparison (32x32 grayscale)
const getThumbData = async (imgSrc: string): Promise<Uint8ClampedArray> => {
    const img = await loadImage(imgSrc);
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No context');
    
    ctx.drawImage(img, 0, 0, 32, 32);
    const imageData = ctx.getImageData(0, 0, 32, 32);
    const data = imageData.data;
    
    // Convert to simple grayscale array
    const gray = new Uint8ClampedArray(32 * 32);
    for (let i = 0; i < data.length; i += 4) {
        // Luminance formula
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return gray;
};

// Calculate Mean Squared Error between two image thumbs
const calculateMSE = (pixels1: Uint8ClampedArray, pixels2: Uint8ClampedArray) => {
    let sum = 0;
    for (let i = 0; i < pixels1.length; i++) {
        const error = pixels1[i] - pixels2[i];
        sum += error * error;
    }
    return sum / pixels1.length;
};

// Extracts frames from video and filters out duplicates against existing photos
export const extractUniqueFramesFromVideo = async (
    videoFile: File, 
    existingPhotos: File[]
): Promise<File[]> => {
    return new Promise(async (resolve, reject) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        video.playsInline = true;
        
        // Wait for metadata to know duration
        await new Promise((r) => { 
            video.onloadedmetadata = r; 
            // Fallback if metadata fails to load
            setTimeout(r, 5000);
        });
        
        const duration = video.duration;
        if (!duration || isNaN(duration)) {
            resolve([]);
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) { reject('Canvas error'); return; }

        const extractedFiles: File[] = [];
        const existingThumbs: Uint8ClampedArray[] = [];

        // Pre-calculate thumbs for existing photos to compare against
        for (const photo of existingPhotos) {
            const url = await readFileAsDataURL(photo);
            existingThumbs.push(await getThumbData(url));
        }

        // Interval strategy: Capture every 2 seconds, max 10 photos per video
        const interval = Math.max(2, duration / 10); 
        let currentTime = 0.5; // Start a bit in

        const seekAndCapture = async () => {
            if (currentTime >= duration) {
                resolve(extractedFiles);
                return;
            }

            video.currentTime = currentTime;
            
            // Wait for seek
            await new Promise(r => { video.onseeked = r; });

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            // 1. Check similarity against existing photos AND newly extracted ones
            const currentThumb = await getThumbData(dataUrl);
            let isDuplicate = false;
            const SIMILARITY_THRESHOLD = 300; // Higher means more lenient (less similar to be called duplicate)

            // Check against existing user photos
            for (const thumb of existingThumbs) {
                if (calculateMSE(currentThumb, thumb) < SIMILARITY_THRESHOLD) {
                    isDuplicate = true;
                    break;
                }
            }

            // Check against photos extracted in this session
            if (!isDuplicate) {
                 // Optimization: We could store thumbs of extractedFiles, but simply checking last one is often enough for video
                 // let's check the last extracted one to avoid burst repetition
                 if (extractedFiles.length > 0) {
                     const lastFile = extractedFiles[extractedFiles.length - 1];
                     const lastUrl = await readFileAsDataURL(lastFile);
                     const lastThumb = await getThumbData(lastUrl);
                     if (calculateMSE(currentThumb, lastThumb) < SIMILARITY_THRESHOLD) {
                         isDuplicate = true;
                     }
                 }
            }

            if (!isDuplicate) {
                // Convert to File
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], `frame_${Math.floor(currentTime)}.jpg`, { type: 'image/jpeg' });
                extractedFiles.push(file);
                
                // Add to thumbs for future comparison
                existingThumbs.push(currentThumb);
            }

            currentTime += interval;
            seekAndCapture();
        };

        seekAndCapture();
    });
};
