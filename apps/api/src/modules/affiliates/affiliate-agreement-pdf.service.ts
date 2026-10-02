import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type Color } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Affiliate } from '@prisma/client';
import { AFFILIATE_AGREEMENT_SECTIONS, AFFILIATE_AGREEMENT_VERSION } from './affiliate-agreement';

const LOGO_URL =
  'https://www.aiit.network/assets/brand/azraa-institute-of-information-technology-official-logo-black.png';
const FONTS_DIR = join(__dirname, 'assets', 'fonts');
const SEAL_PATH = join(__dirname, 'assets', 'seal', 'az-seal-brass.png');

const PAGE_W = 612; // US Letter, portrait -- a legal document, unlike the certificate's landscape layout
const PAGE_H = 792;
const MARGIN_X = 56;
const MARGIN_TOP = 70;
const MARGIN_BOTTOM = 56;

const INK = rgb(0x14 / 255, 0x11 / 255, 0x0f / 255);
const INK_SOFT = rgb(0x4a / 255, 0x44 / 255, 0x3c / 255);
const BRASS = rgb(0x9a / 255, 0x7b / 255, 0x4f / 255);
const BRASS_DEEP = rgb(0x7a / 255, 0x5c / 255, 0x34 / 255);
const PAPER = rgb(0xfb / 255, 0xf8 / 255, 0xf2 / 255);

const HEADING_SIZE = 11.5;
const BODY_SIZE = 10;
const BODY_LEADING = 13.5;
const HEADING_GAP_BEFORE = 16;
const HEADING_GAP_AFTER = 6;
const PARAGRAPH_GAP = 7;

/**
 * Renders the Affiliate Agreement as a real, multi-page PDF, personalised
 * with the signing Partner's own typed signature -- the generated
 * equivalent of the old static
 * apps/web/public/assets/affiliate/aiit-affiliate-agreement.pdf. Same
 * pdf-lib + fontkit approach as certificate-pdf.service.ts, but genuinely
 * multi-page flowing text rather than one fixed layout, so this owns its
 * own small page-flow helper (see PageFlow below) instead of positioning
 * everything by hand.
 *
 * The legal text itself lives once, in affiliate-agreement.ts, and is
 * identical to what GET /affiliates/agreement serves for the inline
 * on-page review -- see that file's doc comment for why.
 */
@Injectable()
export class AffiliateAgreementPdfService {
  private readonly logger = new Logger(AffiliateAgreementPdfService.name);
  private logoBytesPromise: Promise<ArrayBuffer | null> | null = null;

  async render(affiliate: Affiliate): Promise<Buffer> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    doc.setTitle('AIIT Individual Partner Referral Agreement');
    doc.setAuthor('AIIT — Azraa Institute of Information Technology');

    const serif = await this.embed(doc, 'SourceSerif4-Regular.ttf');
    const serifBold = await this.embed(doc, 'SourceSerif4-Bold.ttf');
    const serifItalic = await this.embed(doc, 'SourceSerif4-Italic.ttf');
    const script = await this.embed(doc, 'DancingScript-Bold.ttf');
    const sans = await doc.embedFont(StandardFonts.Helvetica);

    const logoBytes = await this.getLogoBytes();
    const logo = logoBytes ? await doc.embedPng(logoBytes).catch(() => null) : null;
    const sealBytes = await readFile(SEAL_PATH).catch(() => null);
    const seal = sealBytes ? await doc.embedPng(sealBytes).catch(() => null) : null;

    const fonts = { serif, serifBold, serifItalic, sans, script };
    const flow = new PageFlow(doc, fonts, logo);

    flow.drawLetterhead(affiliate);

    for (const section of AFFILIATE_AGREEMENT_SECTIONS) {
      flow.heading(section.heading);
      for (const paragraph of section.paragraphs) flow.paragraph(paragraph);
    }

    flow.drawSignatureBlock(affiliate, seal);
    flow.finalizePageNumbers();

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  private async embed(doc: PDFDocument, fileName: string): Promise<PDFFont> {
    const bytes = await readFile(join(FONTS_DIR, fileName));
    return doc.embedFont(bytes, { subset: true });
  }

  /** Fetched once per process and reused, same convention as certificate-pdf.service.ts. */
  private getLogoBytes(): Promise<ArrayBuffer | null> {
    if (!this.logoBytesPromise) {
      this.logoBytesPromise = fetch(LOGO_URL)
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .catch((error: unknown) => {
          this.logger.warn(`Could not fetch logo for agreement PDF: ${String(error)}`);
          return null;
        });
    }
    return this.logoBytesPromise;
  }
}

interface AgreementFonts {
  serif: PDFFont;
  serifBold: PDFFont;
  serifItalic: PDFFont;
  sans: PDFFont;
  script: PDFFont;
}

/**
 * Owns the current page + vertical cursor, and creates a new page
 * (repainting the watermark + running header/footer) whenever the next
 * piece of content wouldn't fit. Page numbers are finalised at the end
 * (drawFooter needs the eventual total), so footers are drawn in save()
 * order after every page exists -- see render()'s structure.
 */
class PageFlow {
  private page: PDFPage;
  private y = 0;
  private pages: PDFPage[] = [];

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: AgreementFonts,
    private readonly logo: Awaited<ReturnType<PDFDocument['embedPng']>> | null,
  ) {
    this.page = this.addPage();
  }

  /** Page 1's full letterhead: logo, institute name/address, title, reference line. Sets the cursor below it. */
  drawLetterhead(affiliate: Affiliate): void {
    const { serif, serifBold, sans } = this.fonts;
    const cx = PAGE_W / 2;
    let y = PAGE_H - MARGIN_TOP;

    if (this.logo) {
      const logoW = 110;
      const logoH = (this.logo.height / this.logo.width) * logoW;
      this.page.drawImage(this.logo, { x: cx - logoW / 2, y: y - logoH, width: logoW, height: logoH });
      y -= logoH + 14;
    }

    center(this.page, 'AZRAA INSTITUTE OF INFORMATION TECHNOLOGY (AIIT)', { y, font: serifBold, size: 14, color: INK });
    y -= 16;
    center(this.page, 'AIIT Academy • www.aiit.network', { y, font: sans, size: 9, color: INK_SOFT });
    y -= 12;
    center(this.page, '36, Farook Nagar 1st Cross, Kovaipudur, Coimbatore – 641042, Tamil Nadu, India', {
      y,
      font: sans,
      size: 8.5,
      color: INK_SOFT,
    });
    y -= 22;

    this.page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_W - MARGIN_X, y }, thickness: 1.25, color: BRASS_DEEP });
    y -= 24;

    center(this.page, 'INDIVIDUAL PARTNER REFERRAL AGREEMENT', { y, font: serifBold, size: 16, color: INK });
    y -= 17;
    center(this.page, 'Student Acquisition, Content Creator & Affiliate Partnership', { y, font: serif, size: 10.5, color: INK_SOFT });
    y -= 20;

    const signedDate = affiliate.signedAt ?? new Date();
    const dateLabel = signedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const reference = `AIIT/PART/REF/${signedDate.getUTCFullYear()}/${affiliate.id.slice(0, 8).toUpperCase()}`;
    center(this.page, `Date: ${dateLabel}    •    Agreement Reference: ${reference}    •    Version: ${AFFILIATE_AGREEMENT_VERSION}`, {
      y,
      font: sans,
      size: 8.5,
      color: INK_SOFT,
    });
    y -= 26;

    this.y = y;
  }

  heading(text: string): void {
    this.ensure(HEADING_GAP_BEFORE + HEADING_SIZE + HEADING_GAP_AFTER + BODY_LEADING);
    this.y -= HEADING_GAP_BEFORE;
    this.page.drawText(text, { x: MARGIN_X, y: this.y, font: this.fonts.serifBold, size: HEADING_SIZE, color: BRASS_DEEP });
    this.y -= HEADING_SIZE + HEADING_GAP_AFTER;
  }

  paragraph(text: string): void {
    const maxWidth = PAGE_W - MARGIN_X * 2;
    const lines = wrapText(this.fonts.serif, text, BODY_SIZE, maxWidth);
    for (const line of lines) {
      this.ensure(BODY_LEADING);
      this.page.drawText(line, { x: MARGIN_X, y: this.y, font: this.fonts.serif, size: BODY_SIZE, color: INK });
      this.y -= BODY_LEADING;
    }
    this.y -= PARAGRAPH_GAP;
  }

  /** The two-column signature block, plus the seal, on whatever page has room -- forced onto a fresh page if less than a third of a page remains, so it never splits awkwardly. */
  drawSignatureBlock(affiliate: Affiliate, seal: Awaited<ReturnType<PDFDocument['embedPng']>> | null): void {
    const blockHeight = 170;
    if (this.y - MARGIN_BOTTOM < blockHeight) this.page = this.addPage();
    this.y -= 10;
    this.page.drawLine({ start: { x: MARGIN_X, y: this.y }, end: { x: PAGE_W - MARGIN_X, y: this.y }, thickness: 0.75, color: BRASS });
    this.y -= 26;

    const colW = (PAGE_W - MARGIN_X * 2 - 30) / 2;
    const leftX = MARGIN_X;
    const rightX = MARGIN_X + colW + 30;
    const top = this.y;
    const { serifBold, sans, script } = this.fonts;

    this.page.drawText('FOR AND ON BEHALF OF AIIT', { x: leftX, y: top, font: serifBold, size: 9.5, color: INK });
    this.page.drawText('AIIT Academy / AIIT.network', { x: leftX, y: top - 13, font: sans, size: 8.5, color: INK_SOFT });
    this.page.drawText('David Charles Eboh', { x: leftX, y: top - 46, font: script, size: 20, color: INK });
    this.page.drawLine({ start: { x: leftX, y: top - 54 }, end: { x: leftX + colW, y: top - 54 }, thickness: 0.6, color: BRASS });
    this.page.drawText('Director / Co-Founder', { x: leftX, y: top - 68, font: sans, size: 8.5, color: INK_SOFT });

    this.page.drawText('FOR AND ON BEHALF OF THE PARTNER', { x: rightX, y: top, font: serifBold, size: 9.5, color: INK });
    this.page.drawText(affiliate.signedName ?? '', { x: rightX, y: top - 13, font: sans, size: 8.5, color: INK_SOFT });
    this.page.drawText(affiliate.signedName ?? '', { x: rightX, y: top - 46, font: script, size: 20, color: INK });
    this.page.drawLine({ start: { x: rightX, y: top - 54 }, end: { x: rightX + colW, y: top - 54 }, thickness: 0.6, color: BRASS });
    const signedAt = affiliate.signedAt ?? new Date();
    const signedLabel = signedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    this.page.drawText(`Signed electronically, ${signedLabel}`, { x: rightX, y: top - 68, font: sans, size: 8.5, color: INK_SOFT });
    if (affiliate.signedIp) {
      this.page.drawText(`IP address on file: ${affiliate.signedIp}`, { x: rightX, y: top - 80, font: sans, size: 7.5, color: INK_SOFT });
    }

    if (seal) {
      const sealW = 70;
      const sealH = (seal.height / seal.width) * sealW;
      this.page.drawImage(seal, { x: leftX + colW - sealW + 6, y: top - 110, width: sealW, height: sealH, opacity: 0.95 });
    }

    this.y = top - 130;
    center(this.page, `This document was generated and signed electronically via AIIT.network. Agreement version ${AFFILIATE_AGREEMENT_VERSION}.`, {
      y: this.y,
      font: sans,
      size: 7.5,
      color: INK_SOFT,
    });
  }

  /** Creates a new page only when the next chunk of content genuinely won't fit -- called from heading()/paragraph(), never speculatively. */
  private ensure(height: number): void {
    if (this.y - MARGIN_BOTTOM < height) this.page = this.addPage();
  }

  private addPage(): PDFPage {
    const page = this.doc.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });

    if (this.logo) {
      const wmW = 300;
      const wmH = (this.logo.height / this.logo.width) * wmW;
      page.drawImage(this.logo, { x: PAGE_W / 2 - wmW / 2, y: PAGE_H / 2 - wmH / 2, width: wmW, height: wmH, opacity: 0.035 });
    }

    page.drawLine({ start: { x: MARGIN_X, y: PAGE_H - 36 }, end: { x: PAGE_W - MARGIN_X, y: PAGE_H - 36 }, thickness: 0.5, color: BRASS });
    center(page, 'AIIT Academy • www.aiit.network • info@aiit.network', { y: PAGE_H - 28, font: this.fonts.sans, size: 7.5, color: INK_SOFT });

    page.drawLine({ start: { x: MARGIN_X, y: MARGIN_BOTTOM - 14 }, end: { x: PAGE_W - MARGIN_X, y: MARGIN_BOTTOM - 14 }, thickness: 0.5, color: BRASS });

    this.pages.push(page);
    this.y = PAGE_H - 50;
    return page;
  }

  /** The total page count is only knowable once every page has been created, so "Page N of TOTAL" is painted once, here, after all content is drawn -- never per-page during addPage(), which would draw a stale count and the new one on top of each other. */
  finalizePageNumbers(): void {
    this.pages.forEach((page, i) => {
      center(page, `Page ${i + 1} of ${this.pages.length}`, { y: MARGIN_BOTTOM - 26, font: this.fonts.sans, size: 7.5, color: INK_SOFT });
    });
  }
}

function center(page: PDFPage, text: string, opts: { y: number; font: PDFFont; size: number; color: Color }): void {
  const width = page.getSize().width;
  const textWidth = opts.font.widthOfTextAtSize(text, opts.size);
  page.drawText(text, { x: (width - textWidth) / 2, y: opts.y, font: opts.font, size: opts.size, color: opts.color });
}

/** Greedy word-wrap: packs as many words per line as fit maxWidth. */
function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
