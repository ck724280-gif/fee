import { NextRequest, NextResponse } from 'next/server';
import { recordPaymentSchema, paymentFilterSchema } from '@/lib/validations/payment';
import { recordPayment, listPayments } from '@/lib/payment-service';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    const userId = request.headers.get('x-user-id') || session?.userId || null;

    const body = await request.json();
    const parsed = recordPaymentSchema.safeParse(body);

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

    const result = await recordPayment({
      ...parsed.data,
      recordedByUserId: userId,
    });

    return NextResponse.json(
      {
        success: true,
        payment: result.payment,
        feeRecord: result.feeRecord,
        receiptNumber: result.receiptNumber,
        documentToken: result.documentToken,
        documentUrl: result.documentUrl,
      },
      { status: 201 }
    );
  } catch (err: any) {
    const message = err?.message || 'Failed to record payment';
    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    if (message.includes('cannot exceed') || message.includes('must be greater than 0')) {
      return NextResponse.json({ success: false, error: message }, { status: 422 });
    }

    console.error('Payment processing error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const parsed = paymentFilterSchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filter parameters',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await listPayments(parsed.data);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Payment listing error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to list payments',
      },
      { status: 500 }
    );
  }
}
