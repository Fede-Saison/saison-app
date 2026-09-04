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
    console.log('Error verificando firma de webhook:', err.message);
    return res.status(400).json({ error: err.message });
  }

  try {
      if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_email;

      let premiumHasta = null;
      let subscriptionStatus = 'activa';

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        premiumHasta = new Date(subscription.current_period_end * 1000).toISOString();
      } else if (session.mode === 'payment') {
        premiumHasta = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        subscriptionStatus = 'pago_unico';
      }

      const { error } = await supabase.from('Perfiles').update({
        es_premium: true,
        subscription_status: subscriptionStatus,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription || null,
        premium_desde: new Date().toISOString(),
        premium_hasta: premiumHasta,
      }).eq('email', email);

      if (error) console.log('Error actualizando Perfiles en checkout.session.completed:', error.message);
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;

      const { error } = await supabase.from('Perfiles').update({
        subscription_status: subscription.cancel_at_period_end ? 'cancelando' : 'activa',
        premium_hasta: new Date(subscription.current_period_end * 1000).toISOString(),
      }).eq('stripe_customer_id', subscription.customer);

      if (error) console.log('Error actualizando Perfiles en subscription.updated:', error.message);
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;

      const { error } = await supabase.from('Perfiles').update({
        es_premium: false,
        subscription_status: 'cancelada',
      }).eq('stripe_customer_id', subscription.customer);

      if (error) console.log('Error actualizando Perfiles en subscription.deleted:', error.message);
    }
  } catch (err) {
    console.log('Error inesperado procesando evento:', err.message);
  }

  res.status(200).json({ received: true });
};