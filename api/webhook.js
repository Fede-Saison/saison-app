const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;

    await supabase.from('Perfiles').update({ es_premium: true }).eq('email', email);

    const { data: perfilData } = await supabase.from('Perfiles').select('id').eq('email', email).single();

    if (session.subscription && perfilData) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const plan = subscription.items.data[0]?.plan?.interval === 'month' && subscription.items.data[0]?.plan?.interval_count === 3 ? 'trimestral' : 'mensual';

      await supabase.from('Suscripciones').insert({
        user_id: perfilData.id,
        plan,
        estado: 'activa',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        fecha_fin: new Date(subscription.current_period_end * 1000).toISOString(),
      });
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    await supabase.from('Suscripciones')
      .update({
        estado: subscription.cancel_at_period_end ? 'cancelando' : 'activa',
        fecha_fin: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);

    await supabase.from('Perfiles').update({ es_premium: false }).eq('email', customer.email);
    await supabase.from('Suscripciones').update({ estado: 'cancelada' }).eq('stripe_subscription_id', subscription.id);
  }

  res.status(200).json({ received: true });
};