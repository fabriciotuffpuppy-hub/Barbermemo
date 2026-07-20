import { getAdminSupabase } from '../_lib/supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  // Verify Asaas webhook access token header if configured in environment
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const requestToken = req.headers['asaas-access-token'] || req.headers['access_token'];

  if (webhookToken && requestToken !== webhookToken) {
    res.status(401).json({ error: 'Token de webhook inválido.' });
    return;
  }

  const { event, payment, subscription } = req.body || {};
  console.log(`[Asaas Webhook] Evento recebido: ${event}`, { paymentId: payment?.id, subscriptionId: payment?.subscription || subscription?.id });

  const subscriptionId = payment?.subscription || subscription?.id;
  const supabase = getAdminSupabase();

  try {
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_DUNNING_RECEIVED'].includes(event)) {
      if (subscriptionId) {
        // Mark subscription as ACTIVE
        const { data: subData } = await supabase
          .from('assinaturas_asaas')
          .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
          .eq('id', subscriptionId)
          .select()
          .maybeSingle();

        if (subData && subData.usuario_id) {
          await supabase
            .from('usuarios')
            .update({ status_assinatura: 'active' })
            .eq('id', subData.usuario_id);
        }
      }
    } else if (['PAYMENT_OVERDUE'].includes(event)) {
      if (subscriptionId) {
        const { data: subData } = await supabase
          .from('assinaturas_asaas')
          .update({ status: 'OVERDUE', updated_at: new Date().toISOString() })
          .eq('id', subscriptionId)
          .select()
          .maybeSingle();

        if (subData && subData.usuario_id) {
          await supabase
            .from('usuarios')
            .update({ status_assinatura: 'overdue' })
            .eq('id', subData.usuario_id);
        }
      }
    } else if (['SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'].includes(event)) {
      if (subscriptionId) {
        const { data: subData } = await supabase
          .from('assinaturas_asaas')
          .update({ status: 'CANCELED', updated_at: new Date().toISOString() })
          .eq('id', subscriptionId)
          .select()
          .maybeSingle();

        if (subData && subData.usuario_id) {
          await supabase
            .from('usuarios')
            .update({ status_assinatura: 'canceled' })
            .eq('id', subData.usuario_id);
        }
      }
    }

    res.status(200).json({ success: true, event });
  } catch (err) {
    console.error('[Asaas Webhook] Erro ao processar evento:', err);
    res.status(500).json({ error: 'Erro interno ao processar webhook.' });
  }
}
