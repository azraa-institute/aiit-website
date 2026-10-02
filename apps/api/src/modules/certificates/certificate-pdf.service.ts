import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage, type Color } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';

const LOGO_URL =
  'https://www.aiit.network/assets/brand/azraa-institute-of-information-technology-official-logo-black.png';

const FONTS_DIR = join(__dirname, 'assets', 'fonts');
const SEAL_PATH = join(__dirname, 'assets', 'seal', 'az-seal-brass.png');

const INK = rgb(0x14 / 255, 0x11 / 255, 0x0f / 255);
const INK_SOFT = rgb(0x55 / 255, 0x50 / 255, 0x4a / 255);
const BRASS = rgb(0x9a / 255, 0x7b / 255, 0x4f / 255);
const BRASS_DEEP = rgb(0x7a / 255, 0x5c / 255, 0x34 / 255);
const PAPER = rgb(0xf4 / 255, 0xef / 255, 0xe7 / 255);

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
 * native binary to install/deploy). Custom display faces (Dancing Script
 * for the cursive title/faux-signature, Playfair Display for the editorial
 * serif body) are embedded via @pdf-lib/fontkit from TTF files bundled at
 * assets/fonts/ (copied into dist by nest-cli.json's `assets` config --
 * see that file's comment) and subsetted at embed time so only the glyphs
 * actually drawn ship in the PDF, not the full font. Helvetica is kept for
 * small meta/label text where a script or display face would be unreadable
 * at that size.
 */
@Injectable()
export class CertificatePdfService {
  private readonly logger = new Logger(CertificatePdfService.name);
  private logoBytesPromise: Promise<ArrayBuffer | null> | null = null;

  async render(input: CertificatePdfInput): Promise<Buffer> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    doc.setTitle(`AIIT Certificate — ${input.courseTitle}`);
    doc.setAuthor('AIIT — Azraa Institute of Information Technology');

    const page = doc.addPage([792, 612]); // US Letter, landscape
    const { width, height } = page.getSize();
    const cx = width / 2;

    const script = await this.embed(doc, 'DancingScript-Bold.ttf');
    const scriptSoft = await this.embed(doc, 'DancingScript-Medium.ttf');
    const serifBold = await this.embed(doc, 'PlayfairDisplay-Bold.ttf');
    const serifItalic = await this.embed(doc, 'PlayfairDisplay-Italic.ttf');
    const sans = await doc.embedFont(StandardFonts.Helvetica);
    const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // ---- Paper + a faint oversized monogram watermark, behind everything ----
    page.drawRectangle({ x: 0, y: 0, width, height, color: PAPER });
    const wmSize = 270;
    page.drawText('AZ', {
      x: cx - serifBold.widthOfTextAtSize('AZ', wmSize) / 2,
      y: height / 2 - wmSize * 0.37,
      font: serifBold,
      size: wmSize,
      color: BRASS,
      opacity: 0.035,
    });

    // ---- Frame: outer + inner rule, a small diamond accent at each corner ----
    const outerMargin = 26;
    const innerMargin = 40;
    page.drawRectangle({
      x: outerMargin,
      y: outerMargin,
      width: width - outerMargin * 2,
      height: height - outerMargin * 2,
      borderColor: BRASS_DEEP,
      borderWidth: 1.75,
    });
    page.drawRectangle({
      x: innerMargin,
      y: innerMargin,
      width: width - innerMargin * 2,
      height: height - innerMargin * 2,
      borderColor: BRASS,
      borderWidth: 0.6,
    });
    const cornerInset = (outerMargin + innerMargin) / 2;
    for (const [fx, fy] of [
      [cornerInset, height - cornerInset],
      [width - cornerInset, height - cornerInset],
      [cornerInset, cornerInset],
      [width - cornerInset, cornerInset],
    ]) {
      drawDiamond(page, { x: fx, y: fy, size: 13, border: BRASS_DEEP, fill: PAPER, borderWidth: 1 });
      page.drawCircle({ x: fx, y: fy, size: 1.6, color: BRASS_DEEP });
    }

    // ---- Logo ----
    const logoBytes = await this.getLogoBytes();
    if (logoBytes) {
      try {
        const logo = await doc.embedPng(logoBytes);
        const logoW = 104;
        const logoH = (logo.height / logo.width) * logoW;
        page.drawImage(logo, { x: cx - logoW / 2, y: height - 98, width: logoW, height: logoH });
      } catch (error) {
        this.logger.warn(`Could not embed logo in certificate PDF: ${String(error)}`);
      }
    }

    // ---- Title ----
    centerText(page, 'Certificate of Completion', { y: height - 168, font: script, size: 46, color: BRASS_DEEP });
    drawFlourishDivider(page, { cx, y: height - 190, halfWidth: 70, color: BRASS });

    centerText(page, 'THIS CERTIFIES THAT', {
      y: height - 222,
      font: sans,
      size: 10.5,
      color: INK_SOFT,
      charSpacing: 2.5,
    });

    // ---- Recipient ----
    const nameSize = fitSize(serifBold, input.holderName, 34, 22, width - innerMargin * 2 - 120);
    centerText(page, input.holderName, { y: height - 268, font: serifBold, size: nameSize, color: INK });
    const nameWidth = serifBold.widthOfTextAtSize(input.holderName, nameSize);
    page.drawLine({
      start: { x: cx - nameWidth / 2 - 24, y: height - 282 },
      end: { x: cx + nameWidth / 2 + 24, y: height - 282 },
      thickness: 0.75,
      color: BRASS,
    });

    centerText(page, 'has successfully completed the course', {
      y: height - 312,
      font: serifItalic,
      size: 12.5,
      color: INK_SOFT,
    });

    const courseSize = fitSize(serifItalic, input.courseTitle, 21, 14, width - innerMargin * 2 - 140);
    centerText(page, input.courseTitle, { y: height - 345, font: serifItalic, size: courseSize, color: INK });

    drawFlourishDivider(page, { cx, y: height - 368, halfWidth: 46, color: BRASS });

    // ---- Seal, overlapping the footer rule like a stamp ----
    const sealY = 162;
    const footerRuleY = 128;
    const sealHalfGap = 64;

    const leftSeg = { x1: innerMargin + 52, x2: cx - sealHalfGap };
    const rightSeg = { x1: cx + sealHalfGap, x2: width - innerMargin - 52 };
    page.drawLine({ start: { x: leftSeg.x1, y: footerRuleY }, end: { x: leftSeg.x2, y: footerRuleY }, thickness: 0.75, color: BRASS });
    page.drawLine({ start: { x: rightSeg.x1, y: footerRuleY }, end: { x: rightSeg.x2, y: footerRuleY }, thickness: 0.75, color: BRASS });

    const dateLabel = input.issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    centerText(page, dateLabel, { y: footerRuleY + 9, font: sans, size: 11, color: INK_SOFT, x: (leftSeg.x1 + leftSeg.x2) / 2 });
    centerText(page, 'DATE ISSUED', { y: footerRuleY - 13, font: sansBold, size: 7.5, color: BRASS_DEEP, charSpacing: 1.6, x: (leftSeg.x1 + leftSeg.x2) / 2 });

    centerText(page, 'AIIT', { y: footerRuleY + 4, font: scriptSoft, size: 22, color: INK, x: (rightSeg.x1 + rightSeg.x2) / 2 });
    centerText(page, 'AUTHORIZED SIGNATURE', { y: footerRuleY - 13, font: sansBold, size: 7.5, color: BRASS_DEEP, charSpacing: 1.6, x: (rightSeg.x1 + rightSeg.x2) / 2 });

    // The site's own brass seal mark (legal pages, verify page) rather than
    // a hand-drawn one -- one seal design everywhere a credential is shown.
    try {
      const sealBytes = await readFile(SEAL_PATH);
      const seal = await doc.embedPng(sealBytes);
      const sealW = 72;
      const sealH = (seal.height / seal.width) * sealW;
      page.drawImage(seal, { x: cx - sealW / 2, y: sealY - sealH / 2, width: sealW, height: sealH });
    } catch (error) {
      this.logger.warn(`Could not embed seal in certificate PDF: ${String(error)}`);
    }

    // ---- Credential + QR verification ----
    const verifyUrl = `${(process.env.APP_URL ?? 'https://aiit.network').replace(/\/$/, '')}/verify/${input.credentialId}`;
    page.drawText(`Credential ID: ${input.credentialId}`, {
      x: innerMargin + 16,
      y: 66,
      font: sans,
      size: 9,
      color: INK_SOFT,
    });

    try {
      const qrPng = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 160, color: { dark: '#14110f', light: '#00000000' } });
      const qrImage = await doc.embedPng(qrPng);
      const qrSize = 46;
      const qrX = width - innerMargin - 16 - qrSize;
      const qrY = 52;
      page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
      centerText(page, 'SCAN TO VERIFY', { y: qrY + qrSize + 6, font: sansBold, size: 6.5, color: BRASS_DEEP, charSpacing: 1.2, x: qrX + qrSize / 2 });
    } catch (error) {
      this.logger.warn(`Could not render verification QR code: ${String(error)}`);
      const fallback = `Verify at ${verifyUrl}`;
      const fw = sans.widthOfTextAtSize(fallback, 9);
      page.drawText(fallback, { x: width - innerMargin - 16 - fw, y: 66, font: sans, size: 9, color: INK_SOFT });
    }

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  private async embed(doc: PDFDocument, fileName: string): Promise<PDFFont> {
    const bytes = await readFile(join(FONTS_DIR, fileName));
    return doc.embedFont(bytes, { subset: true });
  }

  /** Fetched once per process and reused -- the logo is static, no reason to refetch it for every certificate rendered. */
  private getLogoBytes(): Promise<ArrayBuffer | null> {
    if (!this.logoBytesPromise) {
      this.logoBytesPromise = fetch(LOGO_URL)
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .catch((error: unknown) => {
          this.logger.warn(`Could not fetch logo for certificate PDF: ${String(error)}`);
          return null;
        });
    }
    return this.logoBytesPromise;
  }
}

interface CenterTextOptions {
  y: number;
  font: PDFFont;
  size: number;
  color: Color;
  /** Extra points between letters, drawn one glyph at a time -- pdf-lib's drawText has no native letter-spacing option. Omitted, the string draws in one call. */
  charSpacing?: number;
  /** Center on this x instead of the page's horizontal center -- used for the two footer columns either side of the seal. */
  x?: number;
}

function centerText(page: PDFPage, text: string, opts: CenterTextOptions): void {
  const { font, size, color, charSpacing = 0 } = opts;
  const center = opts.x ?? page.getSize().width / 2;

  const textWidth = font.widthOfTextAtSize(text, size) + charSpacing * (text.length - 1);
  let x = center - textWidth / 2;

  if (!charSpacing) {
    page.drawText(text, { x, y: opts.y, font, size, color });
    return;
  }
  for (const ch of text) {
    page.drawText(ch, { x, y: opts.y, font, size, color });
    x += font.widthOfTextAtSize(ch, size) + charSpacing;
  }
}

/** Shrinks from `max` towards `min` until `text` fits `maxWidth` at this font -- a long recipient name or course title shouldn't overrun the frame. */
function fitSize(font: PDFFont, text: string, max: number, min: number, maxWidth: number): number {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

function drawDiamond(page: PDFPage, opts: { x: number; y: number; size: number; border: Color; fill: Color; borderWidth: number }): void {
  const { x, y, size, border, fill, borderWidth } = opts;
  page.drawRectangle({
    x: x - size / 2,
    y: y - size / 2,
    width: size,
    height: size,
    rotate: degrees(45),
    color: fill,
    borderColor: border,
    borderWidth,
  });
}

/** A short rule — gap — diamond — gap — rule, the recurring section-break motif. */
function drawFlourishDivider(page: PDFPage, opts: { cx: number; y: number; halfWidth: number; color: Color }): void {
  const { cx, y, halfWidth, color } = opts;
  page.drawLine({ start: { x: cx - halfWidth, y }, end: { x: cx - 10, y }, thickness: 0.75, color });
  page.drawLine({ start: { x: cx + 10, y }, end: { x: cx + halfWidth, y }, thickness: 0.75, color });
  drawDiamond(page, { x: cx, y, size: 7, border: color, fill: color, borderWidth: 0.75 });
}

