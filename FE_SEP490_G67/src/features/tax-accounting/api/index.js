import { api } from '@/lib/api-clien';

const TAX_PROFILE_BASE = '/store/tax-profiles';

function periodBase(year) {
  return `/accounting/tax-profiles/${year}/periods`;
}

function adjustmentBase(year) {
  return `/accounting/tax-profiles/${year}/adjustments`;
}

function getResult(response) {
  return response?.result;
}

function getFilenameFromContentDisposition(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1].replace(/^"|"$/g, ''));

  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] || fallback;
}

async function getFile(path, fallbackFilename, params) {
  const response = await api.get(path, {
    params,
    responseType: 'blob',
  });

  const contentDisposition = response.headers?.['content-disposition'];
  return {
    blob: response.data,
    filename: getFilenameFromContentDisposition(contentDisposition, fallbackFilename),
  };
}

export const taxProfilesApi = {
  list: async () => getResult(await api.get(TAX_PROFILE_BASE)),

  getByYear: async (year) => getResult(await api.get(`${TAX_PROFILE_BASE}/${year}`)),

  create: async (payload) => getResult(await api.post(TAX_PROFILE_BASE, payload)),

  update: async (year, payload) => getResult(await api.put(`${TAX_PROFILE_BASE}/${year}`, payload)),

  confirm: async (year, version) => getResult(
    await api.post(`${TAX_PROFILE_BASE}/${year}/confirm`, { version }),
  ),

  updateTrackingStart: async (year, payload) => getResult(
    await api.put(`${TAX_PROFILE_BASE}/${year}/tracking-start`, payload),
  ),
};

export const accountingPeriodsApi = {
  list: async (year) => getResult(await api.get(periodBase(year))),

  getByMonth: async (year, month) => getResult(
    await api.get(`${periodBase(year)}/${month}`),
  ),

  create: async (year, accountingMonth, profileVersion) => getResult(
    await api.post(periodBase(year), { accountingMonth, profileVersion }),
  ),

  getRevenueLines: async (year, month, params = {}) => getResult(
    await api.get(`${periodBase(year)}/${month}/revenue-lines/page`, { params }),
  ),

  synchronize: async (year, month) => getResult(
    await api.post(`${periodBase(year)}/${month}/revenue-lines/synchronize`),
  ),

  getReconciliation: async (year, month) => getResult(
    await api.get(`${periodBase(year)}/${month}/reconciliation`),
  ),

  close: async (year, month, payload) => getResult(
    await api.post(`${periodBase(year)}/${month}/close`, payload),
  ),
};

export const adjustmentsApi = {
  list: async (year, params = {}) => getResult(await api.get(adjustmentBase(year), { params })),

  create: async (year, payload) => getResult(await api.post(adjustmentBase(year), payload)),

  update: async (year, id, payload) => getResult(
    await api.put(`${adjustmentBase(year)}/${id}`, payload),
  ),

  approve: async (year, id, payload) => getResult(
    await api.post(`${adjustmentBase(year)}/${id}/approve`, payload),
  ),

  reject: async (year, id, payload) => getResult(
    await api.post(`${adjustmentBase(year)}/${id}/reject`, payload),
  ),
};

export const accountingReportsApi = {
  getMonthSummary: async (year, month) => getResult(
    await api.get(`${periodBase(year)}/summary/months/${month}`),
  ),

  getQuarterSummary: async (year, quarter) => getResult(
    await api.get(`${periodBase(year)}/summary/quarters/${quarter}`),
  ),

  getYearSummary: async (year) => getResult(await api.get(`${periodBase(year)}/summary`)),
};

export const taxSupportApi = {
  getS1a: async (year, month, mode = 'PREVIEW') => getResult(
    await api.get(`${periodBase(year)}/${month}/tax-support/s1a`, { params: { mode } }),
  ),

  downloadS1a: async (year, month, mode = 'PREVIEW') => getFile(
    `${periodBase(year)}/${month}/tax-support/s1a.xlsx`,
    `S1a-HKD-${year}-${month}.xlsx`,
    { mode },
  ),

  downloadS1aRange: async (year, periodType, periodNumber) => getFile(
    `/accounting/tax-profiles/${year}/periods/tax-support/s1a.xlsx`,
    periodType === 'MONTH'
      ? `S1a-HKD-${year}-T${String(periodNumber).padStart(2, '0')}.xlsx`
      : periodType === 'QUARTER'
        ? `S1a-HKD-${year}-Q${periodNumber}.xlsx`
        : `S1a-HKD-${year}.xlsx`,
    {
      periodType,
      ...(periodType === 'MONTH' ? { month: periodNumber } : {}),
      ...(periodType === 'QUARTER' ? { quarter: periodNumber } : {}),
    },
  ),

  downloadTaxDeclaration: async (year, mode = 'PREVIEW', periodType = 'YEAR') => getFile(
    `${periodBase(year)}/tax-support/01-tkn-cnkd.docx`,
    `01-TKN-CNKD-${year}.docx`,
    { periodType, mode },
  ),
};

export const taxRecordApi = {
  get: async (year) => getResult(
    await api.get(`/accounting/tax-profiles/${year}/tax-record`),
  ),

  calculate: async (year) => getResult(
    await api.post(`/accounting/tax-profiles/${year}/tax-record/calculate`),
  ),

  confirm: async (year, version) => getResult(
    await api.post(`/accounting/tax-profiles/${year}/tax-record/confirm`, { version }),
  ),

  declare: async (year) => getResult(
    await api.post(`/accounting/tax-profiles/${year}/tax-record/declare`),
  ),
};

export { getFilenameFromContentDisposition };
