import { NextRequest, NextResponse } from 'next/server';
import { generateReminderDocSchema } from '@/lib/validations/document';
import { createReminderDocumentToken } from '@/lib/document-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateReminderDocSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const doc = await createReminderDocumentToken(
      parsed.data.feeRecordId,
      parsed.data.expiryDays
    );

    return NextResponse.json(
      {
        success: true,
        document: doc,
        token: doc.token,
        documentUrl: `/api/documents/${doc.token}`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Reminder document generation error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to generate reminder document',
      },
      { status: 500 }
    );
  }
}
