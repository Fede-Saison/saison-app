import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-03-31.basil",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Falta el email" }), { status: 400, headers: corsHeaders });
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from("Perfiles")
      .select("stripe_subscription_id, es_premium")
      .eq("email", email)
      .maybeSingle();

    if (errorPerfil) throw errorPerfil;

    if (!perfil || !perfil.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "No se encontró una suscripción activa para este usuario" }), { status: 404, headers: corsHeaders });
    }

    if (!perfil.es_premium) {
      return new Response(JSON.stringify({ error: "Este usuario ya no tiene una suscripción activa" }), { status: 400, headers: corsHeaders });
    }

    const suscripcionCancelada = await stripe.subscriptions.update(perfil.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // El webhook de Stripe (customer.subscription.updated) se encarga de
    // actualizar subscription_status y premium_hasta en Perfiles cuando
    // Stripe confirme el cambio — no lo hacemos acá para evitar que
    // dos lugares distintos escriban el mismo dato y se desincronicen.

    return new Response(JSON.stringify({
      success: true,
      cancelaEl: suscripcionCancelada.items?.data?.[0]?.current_period_end
        ? new Date(suscripcionCancelada.items.data[0].current_period_end * 1000).toISOString()
        : null,
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("Error cancelando suscripción:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});