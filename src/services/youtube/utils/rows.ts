export type Row = any[];

export const safeRows = (resp: any): Row[] => (resp?.data as any)?.rows || [];

export const firstRow = (resp: any): Row => safeRows(resp)[0] || [];
