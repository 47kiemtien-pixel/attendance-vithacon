export const parseVndAmount = (value) => {
  if (value === null || value === undefined) return 0;

  const digits = String(value).replace(/\D/g, '');
  if (!digits) return 0;

  return Number(digits);
};

export const formatVndInput = (value) => {
  const amount = parseVndAmount(value);
  if (!amount) return '';

  return amount.toLocaleString('vi-VN');
};

export const formatVndCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number.isFinite(amount) ? amount : 0);
};
