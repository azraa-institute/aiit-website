import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage, type Color } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';

const FONTS_DIR = join(__dirname, 'assets', 'fonts');
const TEMPLATE_PATH = join(__dirname, 'assets', 'template', 'certificate-bg.jpg');

// Sampled directly from the gold/ivory reference design.
const INK = rgb(0, 0, 0);
const INK_CRED = rgb(0x1d / 255, 0x15 / 255, 0x0e / 255);
const BRASS = rgb(0x9a / 255, 0x7b / 255, 0x4f / 255);

export interface CertificatePdfInput {
  holderName: string;
  courseTitle: string;
  credentialId: string;
  issuedAt: Date;
}

/**
 * Renders a certificate as a real PDF, server-side. Pure JS (no headless
 * browser, unlike scripts/build-docs-pdf.mjs's local Chrome dependency --
 * that approach doesn't work on Render's containers, and pdf-lib has no
 * native binary to install/deploy).
 *
 * The decorative design (ivory/gold ribbons, charcoal corner panels,
 * ornamental frame, the gold gradient "Certificate of Completion" heading,
 * the laurel-wreath seal, every static label) is 100% identical on every
 * certificate, so it's a single pre-built background image --
 * assets/template/certificate-bg.jpg, generated once from the approved
 * reference design with its 4 dynamic regions (recipient name, course
 * title, issue date, credential ID) and the QR code's white box cleanly
 * erased back to bare background. Only those 4 strings plus the QR code
 * are drawn per-certificate, as real vector PDF text/graphics -- selectable,
 * dynamic, and positioned to match the reference's exact layout (measured
 * directly off the reference image and converted to this page's point
 * space). This is NOT "flattening the reference into a static image": the
 * recipient name, course title, date, credential id and QR code are never
 * part of that background bitmap, only the parts of the design that are
 * genuinely identical across every certificate are.
 *
 * Custom display faces (Playfair Display Bold/Italic) are embedded via
 * @pdf-lib/fontkit from TTF files bundled at assets/fonts/ (copied into
 * dist by nest-cli.json's `assets` config) and subsetted at embed time so
 * only the glyphs actually drawn ship in the PDF.
 */
@Injectable()
export class CertificatePdfService {
  private readonly logger = new Logger(CertificatePdfService.name);
  private templateBytesPromise: Promise<Buffer | null> | null = null;

  async render(input: CertificatePdfInput): Promise<Buffer> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    doc.setTitle(`AIIT Certificate — ${input.courseTitle}`);
    doc.setAuthor('AIIT — Azraa Institute of Information Technology');

    const page = doc.addPage([792, 612]); // US Letter, landscape -- matches the reference's ~1.29:1 aspect ratio
    const { width, height } = page.getSize();
    const cx = width / 2;

    const serifBold = await this.embed(doc, 'PlayfairDisplay-Bold.ttf');
    const serifItalic = await this.embed(doc, 'PlayfairDisplay-Italic.ttf');
    const sans = await doc.embedFont(StandardFonts.Helvetica);

    // ---- Background: the full static design, the one piece of this
    // certificate that's a bitmap -- everything below is real vector text
    // drawn on top of it. ----
    const templateBytes = await this.getTemplateBytes();
    if (templateBytes) {
      const bg = await doc.embedJpg(templateBytes).catch((error: unknown) => {
        this.logger.warn(`Could not embed certificate background template: ${String(error)}`);
        return null;
      });
      if (bg) page.drawImage(bg, { x: 0, y: 0, width, height });
    } else {
      this.logger.warn('Certificate background template unavailable -- rendering on a blank page.');
    }

    // ---- Recipient name, centered, with a divider sized to the name (the
    // reference's own divider is exactly as wide as the sample name, so it
    // has to be redrawn here rather than kept in the background). ----
    const nameSize = fitSize(serifBold, input.holderName, 42, 22, 640);
    centerText(page, input.holderName, { cx, y: 289.7, font: serifBold, size: nameSize, color: INK });
    const nameWidth = serifBold.widthOfTextAtSize(input.holderName, nameSize);
    const dividerY = 276.6;
    const dividerHalf = nameWidth / 2 + 22;
    page.drawLine({ start: { x: cx - dividerHalf, y: dividerY }, end: { x: cx - 8, y: dividerY }, thickness: 0.75, color: BRASS });
    page.drawLine({ start: { x: cx + 8, y: dividerY }, end: { x: cx + dividerHalf, y: dividerY }, thickness: 0.75, color: BRASS });
    drawDiamond(page, { x: cx, y: dividerY, size: 6.5, color: BRASS });

    // ---- Course title, centered, italic ----
    const courseSize = fitSize(serifItalic, input.courseTitle, 26, 15, 600);
    centerText(page, input.courseTitle, { cx, y: 212, font: serifItalic, size: courseSize, color: INK });

    // ---- Date issued, left-aligned in its column ----
    const dateLabel = input.issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    page.drawText(dateLabel, { x: 148, y: 123, font: sans, size: 11, color: INK });

    // ---- Credential ID, left-aligned, lower-left ----
    page.drawText(`Credential ID: ${input.credentialId}`, { x: 53, y: 52, font: sans, size: 9, color: INK_CRED });

    // ---- QR verification, square, sitting inside the background's blank white box ----
    const verifyUrl = `${(process.env.APP_URL ?? 'https://aiit.network').replace(/\/$/, '')}/verify/${input.credentialId}`;
    try {
      const qrPng = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 200, color: { dark: '#14110f', light: '#00000000' } });
      const qrImage = await doc.embedPng(qrPng);
      const qrSize = 46;
      const qrX = 748.1 - qrSize / 2;
      const qrY = 60.9 - qrSize / 2;
      page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    } catch (error) {
      this.logger.warn(`Could not render verification QR code: ${String(error)}`);
      const fallback = `Verify at ${verifyUrl}`;
      const fw = sans.widthOfTextAtSize(fallback, 7);
      page.drawText(fallback, { x: 725 - fw / 2, y: 60, font: sans, size: 7, color: INK });
    }

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  private async embed(doc: PDFDocument, fileName: string): Promise<PDFFont> {
    const bytes = await readFile(join(FONTS_DIR, fileName));
    return doc.embedFont(bytes, { subset: true });
  }

  /** Read once per process and reused -- the template is static, no reason to re-read it for every certificate rendered. */
  private getTemplateBytes(): Promise<Buffer | null> {
    if (!this.templateBytesPromise) {
      this.templateBytesPromise = readFile(TEMPLATE_PATH).catch((error: unknown) => {
        this.logger.warn(`Could not read certificate background template: ${String(error)}`);
        return null;
      });
    }
    return this.templateBytesPromise;
  }
}

interface CenterTextOptions {
  cx: number;
  y: number;
  font: PDFFont;
  size: number;
  color: Color;
}

function centerText(page: PDFPage, text: string, opts: CenterTextOptions): void {
  const { font, size, color, cx, y } = opts;
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx - textWidth / 2, y, font, size, color });
}

/** Shrinks from `max` towards `min` until `text` fits `maxWidth` at this font -- a long recipient name or course title shouldn't overrun the frame. */
function fitSize(font: PDFFont, text: string, max: number, min: number, maxWidth: number): number {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

function drawDiamond(page: PDFPage, opts: { x: number; y: number; size: number; color: Color }): void {
  const { x, y, size, color } = opts;
  page.drawRectangle({
    x: x - size / 2,
    y: y - size / 2,
    width: size,
    height: size,
    rotate: degrees(45),
    color,
  });
}
