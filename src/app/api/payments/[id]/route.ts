import { NextRequest, NextResponse } from 'next/server';
import { getPaymentById } from '@/lib/payment-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const payment = await getPaymentById(id);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        payment,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Error fetching payment:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch payment',
      },
      { status: 500 }
    );
  }
}
