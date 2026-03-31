
import { WatermarkSettings, ImageDimensions } from '../types';
import JSZip from 'jszip';

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
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
  const imageUrl = await readFileAsDataURL(file);
  const img = await loadImage(imageUrl);
  
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
  imageFile: File,
  logoFile: File | null,
  settings: WatermarkSettings
): Promise<string> => {
  const imageUrl = await readFileAsDataURL(imageFile);
  const baseImage = await loadImage(imageUrl);
  
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

  if (logoFile) {
    const logoUrl = await readFileAsDataURL(logoFile);
    const logoImage = await loadImage(logoUrl);

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

  return canvas.toDataURL('image/jpeg', 0.8);
};

// --- ZIP UTILS ---

export const extractFilesFromZip = async (zipFile: File): Promise<File[]> => {
    const zip = new JSZip();
    const validFiles: File[] = [];

    try {
        const content = await zip.loadAsync(zipFile);
        
        // Filter out directories and hidden files
        const entries = Object.values(content.files).filter((entry: any) => !entry.dir && !entry.name.startsWith('__MACOSX') && !entry.name.startsWith('.'));
        
        const promises = entries.map(async (entry: any) => {
            const name = entry.name.toLowerCase();
            const isImage = /\.(jpg|jpeg|png|webp|gif)$/.test(name);
            const isVideo = /\.(mp4|mov|webm|m4v)$/.test(name);

            if (isImage || isVideo) {
                const blob = await entry.async('blob');
                // Reconstruct mime type roughly
                let type = 'application/octet-stream';
                if (isImage) type = name.endsWith('png') ? 'image/png' : 'image/jpeg';
                if (isVideo) type = 'video/mp4'; 
                
                // Use the base filename (remove paths if zip has folders)
                const fileName = entry.name.split('/').pop() || entry.name;
                validFiles.push(new File([blob], fileName, { type }));
            }
        });

        await Promise.all(promises);
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
        await new Promise((r) => { video.onloadedmetadata = r; });
        
        const duration = video.duration;
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
            const SIMILARITY_THRESHOLD = 150; // Lower means stricter (more similar)

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
