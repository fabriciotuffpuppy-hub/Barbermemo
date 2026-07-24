export async function asaasFetch(path, options = {}) {
  const apiUrl = process.env.ASAAS_API_URL || process.env.VITE_ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
  const apiKey = (process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '').trim();

  const res = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // Asaas rejects requests without a User-Agent (returns invalid_access_token
      // instead of a clearer error), and Node's fetch sends none by default.
      'User-Agent': 'Barbermemo/1.0',
      access_token: apiKey,
      ...options.headers
    }
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    let message = 'Erro na comunicação com o Asaas.';
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      message = data.errors.map((e) => e.description).join(' ');
    } else {
      message = `Erro na comunicação com o Asaas (Status ${res.status}${res.statusText ? ': ' + res.statusText : ''}). Verifique as credenciais no servidor.`;
    }
    const err = new Error(message);
    err.asaasErrors = data?.errors;
    err.status = res.status;
    throw err;
  }

  return data;
}


// Creates or updates the Asaas customer for a local `cliente` / `usuarios` row.
export async function upsertAsaasCustomer(cliente) {
  const cleanCpfCnpj = cliente.cpf_cnpj ? String(cliente.cpf_cnpj).replace(/\D/g, '') : undefined;
  const cleanPhone = cliente.telefone ? String(cliente.telefone).replace(/\D/g, '') : undefined;

  const payload = {
    name: cliente.nome,
    cpfCnpj: cleanCpfCnpj || undefined,
    email: cliente.email || undefined,
    mobilePhone: cleanPhone || undefined,
    externalReference: cliente.id
  };

  if (cliente.asaas_customer_id) {
    return asaasFetch(`/customers/${cliente.asaas_customer_id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  return asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// Creates a monthly subscription in Asaas for a customer
export async function createAsaasSubscription({ customerId, value, description, billingType = 'UNDEFINED', externalReference }) {
  const payload = {
    customer: customerId,
    billingType: billingType,
    value: value,
    nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Due tomorrow for initial setup or immediate checkout
    cycle: 'MONTHLY',
    description: description,
    externalReference: externalReference
  };

  return asaasFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// Fetches a subscription from Asaas
export async function getAsaasSubscription(subscriptionId) {
  return asaasFetch(`/subscriptions/${subscriptionId}`);
}

// Fetches payments associated with a subscription
export async function getAsaasSubscriptionPayments(subscriptionId) {
  return asaasFetch(`/subscriptions/${subscriptionId}/payments`);
}


