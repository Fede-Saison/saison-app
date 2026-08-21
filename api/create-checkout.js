const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  mensual: 'price_1Txv6cJe09q68nqvFVC7KdWg',
  trimestral: 'price_1U4QwXJe09q68nqvJDG3kFiP',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { plan, email } = req.body;
  const priceId = PRICES[plan];

  if (!priceId) return res.status(400).json({ error: 'Plan inválido' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_URL || 'https://saisonfr.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'https://saisonfr.com'}/cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};