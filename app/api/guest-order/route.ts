import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { first_name, last_name, phone, email, items, notes, payment_method } = body;

    if (!first_name || !last_name || !phone || !email || !items?.length) {
      return NextResponse.json(
        { error: 'first_name, last_name, phone, email, and at least one item are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const subtotal = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    );

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        first_name,
        last_name,
        phone,
        email,
        order_number: `GUEST-${Date.now()}`,
        payment_method: payment_method || 'cash',
        subtotal,
        total: subtotal,
        notes: notes || null,
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const orderItems = items.map((item: { modification_id: string; quantity: number; price: number }) => ({
      order_id: order.id,
      modification_id: item.modification_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({ order_id: order.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
