export const IVA_RATE = 0.13;

export function round2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export const decimalTransformer = {
  to: (valor: number) => valor,
  from: (valor: string | number | null) => (valor === null ? null : parseFloat(valor as string)),
};

export function esViolacionUnicidad(error: any): boolean {
  const mensaje = String(error?.message || '');
  return (
    error?.code === '23505' ||
    error?.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    mensaje.includes('UNIQUE constraint failed') ||
    mensaje.includes('duplicate key')
  );
}
