import { getAsaasSubscription, getAsaasSubscriptionPayments } from '../_lib/asaas.js';
import { getAdminSupabase } from '../_lib/supabaseServer.js';

export default async function handler(req, res) {
  const subscriptionId = req.query.subscriptionId || req.body?.subscriptionId;

  if (!subscriptionId) {
    res.status(400).json({ error: 'subscriptionId não informado.' });
    return;
  }

  const supabase = getAdminSupabase();

  try {
    // 1. Check local DB record
    const { data: dbSub } = await supabase
      .from('assinaturas_asaas')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle();

    let isActive = dbSub?.status === 'ACTIVE';
    let plano = dbSub?.plano || 'autonomo';
    let usado = dbSub?.usado_para_cadastro || false;

    // 2. If not marked active in DB yet, query Asaas API directly
    if (!isActive) {
      try {
        const asaasSub = await getAsaasSubscription(subscriptionId);
        const paymentsData = await getAsaasSubscriptionPayments(subscriptionId);
        const payments = paymentsData.data || [];

        const hasPaidPayment = payments.some((p) =>
          ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH_CONFIRMED'].includes(p.status)
        );

        if (hasPaidPayment) {
          isActive = true;
          // Sync local DB if table exists
          if (dbSub) {
            await supabase
              .from('assinaturas_asaas')
              .update({ status: 'ACTIVE' })
              .eq('id', subscriptionId)
              .catch(() => {});
          }
        }
      } catch (asaasErr) {
        console.warn('Não foi possível consultar Asaas API diretamente:', asaasErr.message);
      }

    }

    if (usado) {
      res.status(400).json({
        valid: false,
        error: 'Esta assinatura já foi utilizada para criar uma conta.'
      });
      return;
    }

    if (!isActive) {
      res.status(200).json({
        valid: false,
        status: dbSub?.status || 'PENDING',
        message: 'Aguardando confirmação de pagamento da assinatura pelo Asaas.'
      });
      return;
    }

    res.status(200).json({
      valid: true,
      subscriptionId,
      plano,
      email: dbSub?.email_comprador || '',
      nome: dbSub?.nome_comprador || '',
      cpfCnpj: dbSub?.cpf_cnpj_comprador || '',
      telefone: dbSub?.telefone_comprador || ''
    });
  } catch (err) {
    console.error('Erro ao verificar assinatura:', err);
    res.status(500).json({ error: err.message || 'Erro ao verificar status da assinatura.' });
  }
}
