export class MutexPorClave {
  private colas = new Map<string, Promise<unknown>>();

  ejecutar<T>(clave: string, fn: () => Promise<T>): Promise<T> {
    const anterior = this.colas.get(clave) || Promise.resolve();
    const resultado = anterior.then(fn, fn);
    this.colas.set(clave, resultado.catch(() => undefined));
    return resultado;
  }
}

export const mutexSeries = new MutexPorClave();
