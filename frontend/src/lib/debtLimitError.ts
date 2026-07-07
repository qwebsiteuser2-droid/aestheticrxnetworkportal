import axios from 'axios';

export interface DebtStatusPayload {
  currentDebt: number;
  debtLimit: number;
  tierName: string;
  remainingLimit: number;
}

export type DebtLimitError = Error & {
  debtStatus: DebtStatusPayload;
  isDebtLimit: true;
};

export function isDebtLimitApiResponse(data: unknown): data is {
  message?: string;
  debtStatus?: DebtStatusPayload;
} {
  if (!data || typeof data !== 'object') return false;
  const d = data as { message?: string; debtStatus?: DebtStatusPayload };
  if (d.debtStatus && typeof d.debtStatus.currentDebt === 'number') return true;
  return Boolean(d.message && /debt limit/i.test(d.message));
}

/** True when axios interceptor should not show a generic error toast. */
export function shouldSkipToastForDebtError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 403) return false;
  return isDebtLimitApiResponse(error.response?.data);
}

function parseDebtMessage(message: string): DebtStatusPayload | null {
  const debtMatch = message.match(
    /debt limit of ([\d,]+) for your (\w+(?:\s+\w+)*) tier\. Your current debt is ([\d,]+\.?\d*)/
  );
  if (debtMatch) {
    const debtLimit = parseFloat(debtMatch[1].replace(/,/g, ''));
    const tierName = debtMatch[2].trim();
    const currentDebt = parseFloat(debtMatch[3].replace(/,/g, ''));
    return {
      currentDebt,
      debtLimit,
      tierName,
      remainingLimit: Math.max(0, debtLimit - currentDebt),
    };
  }

  const altMatch = message.match(/debt limit.*?(\d+(?:,\d+)*).*?(\w+(?:\s+\w+)*).*?debt is ([\d,]+\.?\d*)/i);
  if (altMatch) {
    const debtLimit = parseFloat(altMatch[1].replace(/,/g, ''));
    const tierName = altMatch[2].trim();
    const currentDebt = parseFloat(altMatch[3].replace(/,/g, ''));
    return {
      currentDebt,
      debtLimit,
      tierName,
      remainingLimit: Math.max(0, debtLimit - currentDebt),
    };
  }

  return null;
}

/** Extract debt status from axios or re-thrown order errors. */
export function parseDebtLimitFromError(error: unknown): DebtStatusPayload | null {
  if ((error as DebtLimitError)?.isDebtLimit && (error as DebtLimitError).debtStatus) {
    return (error as DebtLimitError).debtStatus;
  }

  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { message?: string; debtStatus?: DebtStatusPayload };
    if (data.debtStatus) return data.debtStatus;
    if (error.response.status === 403 && data.message) {
      return parseDebtMessage(data.message);
    }
  }

  if (error instanceof Error && /debt limit/i.test(error.message)) {
    return parseDebtMessage(error.message);
  }

  return null;
}

export function toDebtLimitError(error: unknown): DebtLimitError | null {
  const debtStatus = parseDebtLimitFromError(error);
  if (!debtStatus) return null;

  const message =
    (axios.isAxiosError(error) && error.response?.data?.message) ||
    (error instanceof Error ? error.message : '') ||
    'You have reached your debt limit. Please pay outstanding debts before placing new orders.';

  const err = new Error(message) as DebtLimitError;
  err.debtStatus = debtStatus;
  err.isDebtLimit = true;
  return err;
}
