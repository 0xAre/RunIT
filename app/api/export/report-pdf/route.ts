import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { buildReportHtml, buildEventPackSections } from '@/lib/report-pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function renderPdf(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;

  try {
    const { eventName, modules, mode } = await req.json() as {
      eventName: string;
      modules: Record<string, unknown>;
      mode?: 'lpj' | 'pack';
    };

    if (!eventName || !modules) {
      return NextResponse.json({ error: 'Missing eventName or modules' }, { status: 400 });
    }

    let sections = buildEventPackSections(modules);

    if (mode === 'lpj') {
      const lpj = typeof modules.report === 'string' ? modules.report : null;
      if (!lpj) {
        return NextResponse.json({ error: 'LPJ report not generated yet' }, { status: 400 });
      }
      sections = [{ title: 'LPJ Utama', content: lpj }];
    }

    if (!sections.length) {
      return NextResponse.json({ error: 'No report content to export' }, { status: 400 });
    }

    const html = buildReportHtml(eventName, sections);
    const pdfBuffer = await renderPdf(html);

    const filename = mode === 'lpj'
      ? `${eventName.replace(/[^a-zA-Z0-9-_]/g, '_')}_LPJ.pdf`
      : `${eventName.replace(/[^a-zA-Z0-9-_]/g, '_')}_EventPack.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Export PDF] Error:', error);
    const msg = error instanceof Error ? error.message : 'PDF export failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
