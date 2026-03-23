import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

export function createObjectURLFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getFileDimensions(file: File, fileType: 'pdf' | 'jpg'): Promise<{ width: number; height: number }> {
  const arrayBuffer = await file.arrayBuffer();

  if (fileType === 'jpg') {
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedJpg(arrayBuffer);
    const { width, height } = image.size();
    return { width, height };
  } else {
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const firstPage = pdfDoc.getPages()[0];
    const { width, height } = firstPage.getSize();
    return { width, height };
  }
}

export async function embedOrderNumberInJPG(
  jpgFile: File,
  orderNumber: string,
  tabNumber: number,
  position: { x: number; y: number; fontSize: number; rotation: number }
): Promise<Uint8Array> {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await jpgFile.arrayBuffer();
      const pdfDoc = await PDFDocument.create();
      const image = await pdfDoc.embedJpg(arrayBuffer);

      const { width, height } = image.size();
      const page = pdfDoc.addPage([width, height]);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });

      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const yPosition = height - position.y;
      const textToEmbed = `${orderNumber}-${tabNumber}`;

      page.drawText(textToEmbed, {
        x: position.x,
        y: yPosition,
        size: position.fontSize,
        font: font,
        color: rgb(0, 0, 0),
        rotate: degrees(position.rotation),
      });

      const pdfBytes = await pdfDoc.save();
      resolve(pdfBytes);
    } catch (error) {
      reject(error);
    }
  });
}

export async function embedOrderNumberInPDF(
  pdfFile: File,
  orderNumber: string,
  tabNumber: number,
  position: { x: number; y: number; fontSize: number; rotation: number }
): Promise<Uint8Array> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = firstPage.getSize();
  const yPosition = height - position.y;

  const textToEmbed = `${orderNumber}-${tabNumber}`;

  firstPage.drawText(textToEmbed, {
    x: position.x,
    y: yPosition,
    size: position.fontSize,
    font: font,
    color: rgb(0, 0, 0),
    rotate: degrees(position.rotation),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export async function convertPDFToImageDataURL(pdfFile: File | Blob): Promise<string> {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    throw new Error(`Failed to convert PDF to image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function convertPDFToJPG(pdfBytes: Uint8Array): Promise<Uint8Array> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);

    const scale = 300 / 72;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert canvas to blob'));
            return;
          }
          const arrayBuffer = await blob.arrayBuffer();
          resolve(new Uint8Array(arrayBuffer));
        },
        'image/jpeg',
        0.98
      );
    });
  } catch (error) {
    console.error('Error converting PDF to JPG:', error);
    throw new Error(`Failed to convert PDF to JPG: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function convertJPGToPDF(jpgBytes: Uint8Array): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedJpg(jpgBytes);
    const { width, height } = image.size();

    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error converting JPG to PDF:', error);
    throw new Error(`Failed to convert JPG to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

