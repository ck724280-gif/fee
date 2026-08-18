import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { getDocumentDataForRendering } from '@/lib/document-service';
import ReceiptPDF from '@/components/pdf/ReceiptPDF';
import ReminderPDF from '@/components/pdf/ReminderPDF';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Document token is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get('download') === 'true';

    let renderData: any;
    try {
      renderData = await getDocumentDataForRendering(token);
    } catch (err: any) {
      if (err?.name === 'DocumentNotFoundError' || err?.message?.includes('404')) {
        return NextResponse.json(
          { success: false, error: err.message || 'Document not found or access revoked' },
          { status: 404 }
        );
      }
      if (err?.name === 'DocumentExpiredError' || err?.message?.includes('410') || err?.message?.includes('expired')) {
        return NextResponse.json(
          {
            success: false,
            error: 'This document link has expired. Please request an updated link from your educational institute.',
          },
          { status: 410 }
        );
      }
      throw err;
    }

    let pdfElement: React.ReactElement;
    const cleanOrgName = (renderData.institute?.instituteName || 'Document').replace(/[^a-zA-Z0-9]/g, '-');
    let filename = `${cleanOrgName}-${token.substring(0, 8)}.pdf`;

    if (renderData.documentType === 'RECEIPT') {
      pdfElement = React.createElement(ReceiptPDF, { data: renderData });
      filename = `${cleanOrgName}-Receipt-${renderData.payment.receiptNumber || token.substring(0, 8)}.pdf`;
    } else if (renderData.documentType === 'REMINDER') {
      pdfElement = React.createElement(ReminderPDF, { data: renderData });
      filename = `${cleanOrgName}-Reminder-${renderData.student.studentCode || token.substring(0, 8)}.pdf`;
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported document rendering type: ${renderData.documentType}` },
        { status: 400 }
      );
    }

    // Render PDF in-memory buffer
    const pdfBuffer = await renderToBuffer(pdfElement as any);
    const dispositionType = isDownload ? 'attachment' : 'inline';

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="${filename}"`,
        'Cache-Control': 'private, no-transform, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('PDF stream rendering error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to render PDF document',
      },
      { status: 500 }
    );
  }
}
