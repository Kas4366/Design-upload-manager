import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function embedOrderNumberInPDF(
  pdfFile: File,
  orderNumber: string,
  position: { x: number; y: number; fontSize: number }
): Promise<Uint8Array> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { height } = firstPage.getSize();
  const yPosition = height - position.y;

  firstPage.drawText(orderNumber, {
    x: position.x,
    y: yPosition,
    size: position.fontSize,
    font: font,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
