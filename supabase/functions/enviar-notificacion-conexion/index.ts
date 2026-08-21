import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { emailReceptor, emailSolicitante } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: solicitante } = await supabase
      .from('Perfiles')
      .select('nombre, region_destino, fecha_viaje')
      .eq('email', emailSolicitante)
      .single()

    const { data: receptor } = await supabase
      .from('Perfiles')
      .select('nombre')
      .eq('email', emailReceptor)
      .single()

    const nombreSolicitante = solicitante?.nombre || 'Alguien'
    const nombreReceptor = receptor?.nombre || ''
    const destino = solicitante?.region_destino
    const fecha = solicitante?.fecha_viaje

    let detalle = ''
    if (destino && fecha) detalle = ` también viaja a ${destino} en ${fecha}`
    else if (destino) detalle = ` también viaja a ${destino}`
    else if (fecha) detalle = ` también viaja en ${fecha}`

    const asunto = `${nombreSolicitante} quiere conectar con vos en Saison`
    const cuerpo = `
      <div style="font-family:sans-serif; max-width:480px; margin:0 auto; padding:24px;">
        <p style="font-size:16px; color:#0B1426;">Hola ${nombreReceptor},</p>
        <p style="font-size:15px; color:#333; line-height:1.6;">
          <b>${nombreSolicitante}</b>${detalle} y quiere conectar con vos en Saison.
        </p>
        <p style="font-size:15px; color:#333; line-height:1.6;">
          Entrá a la app, andá a la pestaña Saisonniers, y aceptá la solicitud para destrabar el contacto por WhatsApp.
        </p>
        <a href="https://app.saisonfr.com" style="display:inline-block; background:#0A3AF2; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; margin-top:16px;">Ver solicitud →</a>
      </div>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Saison <notificaciones@saisonfr.com>',
        to: emailReceptor,
        subject: asunto,
        html: cuerpo,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      return new Response(JSON.stringify({ error: err }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})