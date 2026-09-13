import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const LOGO_URL =
  'https://www.aiit.network/assets/brand/azraa-institute-of-information-technology-official-logo-black.png';

const INK = rgb(0x14 / 255, 0x11 / 255, 0x0f / 255);
const INK_SOFT = rgb(0x55 / 255, 0x50 / 255, 0x4a / 255);
const BRASS = rgb(0x9a / 255, 0x7b / 255, 0x4f / 255);
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
 * native binary to install/deploy) and sticks to the two built-in PDF
 * standard fonts (Times-Roman for the display type, Helvetica for meta
 * text) rather than embedding Google Sans/Georgia -- no font files to
 * ship, and both read as a serif/sans pair close enough to the site's own
 * display/UI font pairing for a one-page certificate.
 */
@Injectable()
export class CertificatePdfService {
  private readonly logger = new Logger(CertificatePdfService.name);
  private logoBytesPromise: Promise<ArrayBuffer | null> | null = null;

  async render(input: CertificatePdfInput): Promise<Buffer> {
    const doc = await PDFDocument.create();
    doc.setTitle(`AIIT Certificate — ${input.courseTitle}`);
    doc.setAuthor('AIIT — Azraa Institute of Information Technology');

    const page = doc.addPage([792, 612]); // US Letter, landscape
    const { width, height } = page.getSize();

    const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
    const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const sans = await doc.embedFont(StandardFonts.Helvetica);
    const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

    page.drawRectangle({ x: 0, y: 0, width, height, color: PAPER });

    const margin = 28;
    page.drawRectangle({
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: height - margin * 2,
      borderColor: BRASS,
      borderWidth: 1.5,
    });
    const innerMargin = margin + 10;
    page.drawRectangle({
      x: innerMargin,
      y: innerMargin,
      width: width - innerMargin * 2,
      height: height - innerMargin * 2,
      borderColor: BRASS,
      borderWidth: 0.5,
    });

    const logoBytes = await this.getLogoBytes();
    if (logoBytes) {
      try {
        const logo = await doc.embedPng(logoBytes);
        const logoW = 120;
        const logoH = (logo.height / logo.width) * logoW;
        page.drawImage(logo, { x: (width - logoW) / 2, y: height - 110, width: logoW, height: logoH });
      } catch (error) {
        this.logger.warn(`Could not embed logo in certificate PDF: ${String(error)}`);
      }
    }

    centerText(page, 'CERTIFICATE OF COMPLETION', {
      y: height - 165,
      font: sansBold,
      size: 13,
      color: BRASS,
      charSpacing: 2.5,
    });

    centerText(page, 'This certifies that', {
      y: height - 220,
      font: sans,
      size: 13,
      color: INK_SOFT,
    });

    centerText(page, input.holderName, {
      y: height - 265,
      font: serifBold,
      size: 32,
      color: INK,
    });

    centerText(page, 'has successfully completed the course', {
      y: height - 305,
      font: sans,
      size: 13,
      color: INK_SOFT,
    });

    centerText(page, input.courseTitle, {
      y: height - 345,
      font: serifItalic,
      size: 22,
      color: INK,
    });

    // A plain divider above the footer -- fills what would otherwise be a
    // large empty gap between the course title and the issue/credential
    // row, and reads as the traditional "signature line" certificates use.
    page.drawLine({
      start: { x: width / 2 - 90, y: 105 },
      end: { x: width / 2 + 90, y: 105 },
      thickness: 0.75,
      color: BRASS,
    });

    const dateLabel = `Issued ${input.issuedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
    page.drawText(dateLabel, { x: innerMargin + 30, y: innerMargin + 34, font: sans, size: 10, color: INK_SOFT });

    const credLabel = `Credential ID: ${input.credentialId}`;
    const credWidth = sans.widthOfTextAtSize(credLabel, 10);
    page.drawText(credLabel, {
      x: width - innerMargin - 30 - credWidth,
      y: innerMargin + 34,
      font: sans,
      size: 10,
      color: INK_SOFT,
    });

    const verifyUrl = `${process.env.APP_URL ?? 'https://aiit.network'}/verify/${input.credentialId}`;
    centerText(page, `Verify this credential at ${verifyUrl}`, {
      y: innerMargin + 16,
      font: sans,
      size: 9,
      color: INK_SOFT,
    });

    const bytes = await doc.save();
    return Buffer.from(bytes);
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
  color: ReturnType<typeof rgb>;
  /** Extra points between letters, drawn one glyph at a time -- pdf-lib's drawText has no native letter-spacing option. Omitted, the string draws in one call. */
  charSpacing?: number;
}

function centerText(page: PDFPage, text: string, opts: CenterTextOptions): void {
  const { width } = page.getSize();
  const { font, size, color, charSpacing = 0 } = opts;

  const textWidth = font.widthOfTextAtSize(text, size) + charSpacing * (text.length - 1);
  let x = (width - textWidth) / 2;

  if (!charSpacing) {
    page.drawText(text, { x, y: opts.y, font, size, color });
    return;
  }
  for (const ch of text) {
    page.drawText(ch, { x, y: opts.y, font, size, color });
    x += font.widthOfTextAtSize(ch, size) + charSpacing;
  }
}
