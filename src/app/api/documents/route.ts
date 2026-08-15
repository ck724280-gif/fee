import { NextRequest, NextResponse } from 'next/server';
import { generateDocumentSchema } from '@/lib/validations/document';
import { createDocumentToken } from '@/lib/document-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateDocumentSchema.safeParse(body);

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

    const doc = await createDocumentToken(
      parsed.data.documentType,
      parsed.data.referenceId,
      {
        studentId: parsed.data.studentId,
        metadata: parsed.data.metadata,
        expiresAt: parsed.data.expiresAt,
        expiryDays: parsed.data.expiryDays,
      }
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
    console.error('Document generation error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to generate document token',
      },
      { status: 500 }
    );
  }
}
