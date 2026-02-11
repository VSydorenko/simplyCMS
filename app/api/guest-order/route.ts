import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_name, customer_phone, customer_email, items, delivery_info, comment } = body;

    if (!customer_name || !customer_phone || !items?.length) {
      return NextResponse.json(
        { error: 'Name, phone, and at least one item are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const total_amount = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    );

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        delivery_info: delivery_info || null,
        comment: comment || null,
        total_amount,
        status: 'pending',
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
