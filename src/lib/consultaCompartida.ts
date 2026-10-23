const pendientes=new Map<string,Promise<unknown>>();
/** Comparte solicitudes simultáneas del hero y tarjeta; no conserva datos obsoletos. */
export function consultaCompartida<T>(clave:string,consultar:()=>PromiseLike<T>):Promise<T>{
 const actual=pendientes.get(clave);if(actual)return actual as Promise<T>;
 const solicitud=Promise.resolve(consultar()).finally(()=>{pendientes.delete(clave);});
 pendientes.set(clave,solicitud);return solicitud;
}
