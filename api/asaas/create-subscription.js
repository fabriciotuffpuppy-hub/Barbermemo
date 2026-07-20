import { upsertAsaasCustomer, createAsaasSubscription, getAsaasSubscriptionPayments } from '../_lib/asaas.js';
import { getAdminSupabase } from '../_lib/supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const { nome, email, cpfCnpj, telefone, plano } = req.body || {};

  if (!nome || !email || !plano) {
    res.status(400).json({ error: 'Nome, e-mail e plano são obrigatórios.' });
    return;
  }

  const planoClean = String(plano).toLowerCase().trim();
  if (!['autonomo', 'barbearia'].includes(planoClean)) {
    res.status(400).json({ error: 'Plano inválido. Escolha autonomo ou barbearia.' });
    return;
  }

  const valorMensal = planoClean === 'barbearia' ? 189.99 : 59.90;
  const descricaoPlano = planoClean === 'barbearia' 
    ? 'Assinatura Mensal BarberMemo - Plano Barbearia (Até 5 Barbeiros)' 
    : 'Assinatura Mensal BarberMemo - Plano Autônomo';

  try {
    // 1. Upsert Customer in Asaas
    const customer = await upsertAsaasCustomer({
      nome,
      email,
      cpf_cnpj: cpfCnpj,
      telefone
    });

    // 2. Create Monthly Subscription in Asaas
    const subscription = await createAsaasSubscription({
      customerId: customer.id,
      value: valorMensal,
      description: descricaoPlano,
      billingType: 'UNDEFINED',
      externalReference: `plan_${planoClean}_${Date.now()}`
    });

    // 3. Fetch the first payment for this subscription to get invoiceUrl (pay_...)
    let invoiceUrl = subscription.invoiceUrl;
    try {
      const paymentsData = await getAsaasSubscriptionPayments(subscription.id);
      const firstPayment = paymentsData?.data?.[0];
      if (firstPayment) {
        invoiceUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl;
        if (!invoiceUrl && firstPayment.id) {
          const apiUrl = process.env.ASAAS_API_URL || process.env.VITE_ASAAS_API_URL || '';
          const isSandbox = apiUrl.includes('sandbox');
          const baseUrl = isSandbox ? 'https://sandbox.asaas.com' : 'https://www.asaas.com';
          invoiceUrl = `${baseUrl}/i/${firstPayment.id}`;
        }
      }
    } catch (pErr) {
      console.warn('Não foi possível obter link direto da fatura:', pErr.message);
    }

    // 4. Save pending subscription record in Supabase
    const supabase = getAdminSupabase();
    const { error: dbError } = await supabase
      .from('assinaturas_asaas')
      .upsert({
        id: subscription.id,
        asaas_customer_id: customer.id,
        plano: planoClean,
        valor_mensal: valorMensal,
        status: 'PENDING',
        email_comprador: email.toLowerCase().trim(),
        nome_comprador: nome,
        cpf_cnpj_comprador: cpfCnpj ? String(cpfCnpj).replace(/\D/g, '') : null,
        telefone_comprador: telefone || null,
        usado_para_cadastro: false
      });

    if (dbError) {
      console.error('Erro ao registrar assinatura no banco:', dbError);
    }

    res.status(200).json({
      subscriptionId: subscription.id,
      customerId: customer.id,
      invoiceUrl: invoiceUrl || `https://sandbox.asaas.com/subscriptions/${subscription.id}`,
      plano: planoClean,
      valor: valorMensal
    });
  } catch (err) {
    console.error('Erro ao criar assinatura Asaas:', err);
    res.status(err.status && err.status < 500 ? 422 : 502).json({
      error: err.message || 'Falha ao processar assinatura com Asaas.'
    });
  }
}

