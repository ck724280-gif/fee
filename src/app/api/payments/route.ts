import { NextRequest, NextResponse } from 'next/server';
import { recordPaymentSchema, paymentFilterSchema } from '@/lib/validations/payment';
import { recordPayment, listPayments } from '@/lib/payment-service';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(request);

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

    const result = await recordPayment(
      {
        ...parsed.data,
        recordedByUserId: auth.userId,
      },
      auth.organizationId
    );

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
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(request);

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

    const result = await listPayments(parsed.data, auth.organizationId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
