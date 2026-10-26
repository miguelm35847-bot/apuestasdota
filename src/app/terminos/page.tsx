import type { Metadata } from 'next';
import Link from 'next/link';
import DocumentoLegal from '@/components/DocumentoLegal';
import { CORREO_PRIVACIDAD, RESPONSABLE_PRIVACIDAD } from '@/lib/privacidad';
import { REDES_SITIO, URL_SITIO } from '@/lib/sitio';
import { FECHA_TERMINOS, FECHA_TERMINOS_VISIBLE } from '@/lib/terminos';

const titulo = 'Términos del servicio';
const descripcion = 'Consulta las condiciones de cuenta, salas, apuestas, recargas, retiros y atención al usuario de KódigoDota.';
const enlace = 'text-prism-300 underline decoration-prism-400/30 underline-offset-4 transition hover:text-prism-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-prism-400';

export const metadata: Metadata = {
  title: titulo,
  description: descripcion,
  alternates: { canonical: '/terminos' },
  robots: { index: true, follow: true },
  openGraph: { ...REDES_SITIO, title: titulo, description: descripcion, url: `${URL_SITIO}/terminos` },
};

const secciones = [
  {
    id: 'servicio', titulo: '1. El servicio y su responsable',
    contenido: <>
      <p>{RESPONSABLE_PRIVACIDAD} ofrece en <a href={URL_SITIO} className={enlace}>www.kodigodota.com</a> una plataforma de comunidad y salas competitivas de Dota 2, con perfiles, chat, resultados y funciones de saldo. Estas condiciones describen el uso de la web y las operaciones que se pueden realizar en ella.</p>
      <p>El contacto de atención es <a href={`mailto:${CORREO_PRIVACIDAD}`} className={`${enlace} break-all`}>{CORREO_PRIVACIDAD}</a>. Revisa estos términos, las condiciones económicas de cada operación y la <Link href="/como-jugar#reglas" className={enlace}>guía de reglas</Link> antes de participar.</p>
    </>,
  },
  {
    id: 'cuenta', titulo: '2. Cuenta y participación',
    contenido: <>
      <p>La participación en funciones con dinero está reservada a personas de <strong className="font-semibold text-slate-200">18 años o más</strong>, con capacidad para contratar y cuando esté permitida en el lugar donde se encuentren. No utilices la plataforma para eludir restricciones aplicables.</p>
      <p>Proporciona información auténtica, conserva el control de tu correo y protege tus credenciales. El acceso con Google sirve para autenticar tu cuenta; no cambia las reglas de las salas ni garantiza premios. No compartas contraseñas o códigos de acceso con otros jugadores o con soporte.</p>
      <p>Para entrar a una sala se requiere Steam vinculado y completar el perfil exigido por la web. El MMR debe reflejar tu nivel real; una vez registrado, las correcciones se solicitan a administración. Tu nick y perfil de juego son visibles para otros usuarios según la política de privacidad.</p>
    </>,
  },
  {
    id: 'conducta', titulo: '3. Juego limpio y convivencia',
    contenido: <>
      <p>No se permiten trampas, manipulación de resultados, acuerdos para perjudicar a otros participantes, suplantación, comprobantes falsos, uso de cuentas ajenas ni intentos de aprovechar errores para obtener saldo o premios indebidos.</p>
      <p>Respeta a los demás en el chat y las salas. No publiques amenazas, acoso, contenido ilícito ni datos privados de terceros. Cumple las indicaciones de organización de la partida y las reglas anunciadas antes de participar.</p>
    </>,
  },
  {
    id: 'salas', titulo: '4. Salas, cuotas y premios',
    contenido: <>
      <p>Las salas pueden ser 1v1 o 5v5. Antes de unirte, revisa modalidad, cupos, cuota de entrada y premio por ganador que muestra la sala. Al confirmarse la entrada, la cuota se descuenta de tu saldo y quedas registrado como participante.</p>
      <p>Los equipos, capitanes, elección de lado, picks y lobby se organizan desde la sala. La confirmación «Estoy listo» se solicita al completarse el cupo o por indicación del administrador. Vincular Steam o confirmar disponibilidad no sustituye el ingreso al lobby de Dota 2.</p>
      <p>El premio de sala depende de sus condiciones y del resultado registrado al cerrarla. No hay una ganancia garantizada: puedes perder la cuota aportada. Consulta el historial de la partida y los movimientos de tu perfil para comprobar el cierre.</p>
    </>,
  },
  {
    id: 'salidas', titulo: '5. Salidas, cancelaciones y penalidades',
    contenido: <>
      <p>Puedes salir mientras la sala admita esa acción. La salida de una sala abierta o de una sala 1v1 devuelve la cuota sin multa automática por abandono. Al abandonar una sala 5v5 que ya está llena, se devuelve la cuota y se aplica una multa de <strong className="font-semibold text-slate-200">S/ 2.00</strong>, limitada al saldo disponible.</p>
      <p>Las pausas, tolerancias, desconexiones y demás penalidades de juego se detallan en la <Link href="/como-jugar#reglas" className={enlace}>guía de reglas</Link>. Una partida en curso no equivale a una salida libre con devolución; cualquier incidencia debe comunicarse al administrador.</p>
      <p>La cancelación y los reembolsos deben quedar reflejados en el estado de la sala y en los movimientos correspondientes. Si consideras incorrecto un cobro, una penalidad o un resultado, puedes solicitar una revisión por los canales indicados al final.</p>
    </>,
  },
  {
    id: 'apuestas', titulo: '6. Apuestas entre usuarios',
    contenido: <>
      <ul className="list-disc space-y-3 pl-5 marker:text-prism-300">
        <li>Se elige Radiant o Dire y se publica una oferta. Publicar no cobra: la apuesta se confirma únicamente cuando otro usuario acepta el lado contrario y ambos tienen saldo suficiente.</li>
        <li>Cada participante aporta <strong className="font-semibold text-slate-200">S/ 5.50</strong>. El ganador recibe un abono total de <strong className="font-semibold text-slate-200">S/ 10.00</strong>, que incluye su propio aporte; no es un premio adicional al aporte. El perdedor pierde los S/ 5.50 aportados.</li>
        <li>Solo se admiten nuevas ofertas y aceptaciones mientras la sala esté en juego, sin resultado registrado y antes de que transcurran <strong className="font-semibold text-slate-200">25 minutos desde que la sala se puso en juego</strong>, según su hora de inicio registrada.</li>
        <li>Los jugadores de la sala no pueden apostar en su propia partida. Tampoco se puede aceptar una oferta propia.</li>
        <li>No hay un límite total de ofertas o apuestas por usuario o sala. Cada aceptación exige saldo; se aplican controles de seguridad ante solicitudes repetitivas.</li>
        <li>El creador puede cancelar una oferta pendiente sin cobro. Una apuesta ya confirmada no puede retirarse unilateralmente. Las ofertas que dejan de estar disponibles no generan un cobro por sí solas.</li>
        <li>El pago se determina por el equipo ganador registrado al cerrar la sala. Si la sala se cancela, se devuelve a cada participante su aporte de S/ 5.50.</li>
        <li>Los cruces confirmados muestran públicamente el nick, avatar y lado de ambos participantes.</li>
      </ul>
      <p>Participar implica riesgo de pérdida. Decide libremente y utiliza solo un importe que puedas permitirte perder; no se promete rentabilidad ni recuperación de pérdidas.</p>
    </>,
  },
  {
    id: 'resultados', titulo: '7. Estadísticas y resultado de la partida',
    contenido: <>
      <p>El marcador y las estadísticas en vivo que la web identifica como <strong className="font-semibold text-slate-200">datos de ejemplo o simulados</strong> son ilustrativos. No constituyen una retransmisión oficial ni se utilizan para decidir el pago de una apuesta. Las estadísticas públicas de Steam u OpenDota también pueden estar incompletas o desactualizadas.</p>
      <p>Los pagos usan el resultado registrado al cierre de la sala mediante los controles de la plataforma o la revisión del administrador. Si detectas una discrepancia, envía la referencia de sala y la evidencia de la partida para que se revise; no tomes un contador de ejemplo como prueba del resultado.</p>
    </>,
  },
  {
    id: 'saldo', titulo: '8. Recargas, saldo y retiros',
    contenido: <>
      <p>Los importes se expresan en soles peruanos (S/). Las recargas por Yape o Plin requieren importe, número de operación y comprobante, y se acreditan después de la revisión y aprobación del administrador. Presentar una solicitud no confirma por sí solo que el pago fue recibido.</p>
      <p>Comprueba el destinatario y las instrucciones que muestra el formulario antes de pagar. Si hay un error o una solicitud rechazada, contacta a soporte con su referencia y comprobante; no repitas el pago sin aclarar antes el estado del anterior.</p>
      <p>El retiro mínimo actual es <strong className="font-semibold text-slate-200">S/ 5.00</strong> y requiere saldo disponible y un destino válido. El importe solicitado se descuenta del saldo disponible mientras se procesa. Un administrador registra el pago o el rechazo; si lo rechaza, el importe se devuelve al saldo. Solicitar el retiro no significa que la transferencia ya esté pagada.</p>
      <p>Las recargas y retiros tienen revisión manual. El estado se consulta en la cuenta; esta página no promete acreditación ni pago inmediato. Para ayuda con una operación, también está disponible el contacto de pagos que figura en sus formularios.</p>
    </>,
  },
  {
    id: 'donaciones', titulo: '9. Donaciones entre usuarios',
    contenido: <>
      <p>Las donaciones son transferencias voluntarias de saldo entre cuentas de la plataforma. Revisa el destinatario, importe y mensaje antes de confirmar. La operación afecta el saldo de ambas cuentas y puede aparecer en la actividad pública con los nicks, avatares y mensaje asociado.</p>
      <p>No utilices donaciones para manipular resultados, encubrir operaciones indebidas o eludir controles. Si existe un error o una operación que no reconoces, solicita revisión; su tratamiento dependerá de lo ocurrido y de los derechos aplicables.</p>
    </>,
  },
  {
    id: 'incidencias', titulo: '10. Seguridad e incidencias',
    contenido: <>
      <p>Las funciones pueden verse afectadas por mantenimiento, conectividad o incidencias de Dota 2, Steam, Google, los medios de pago y otros proveedores. Comunica cualquier fallo que afecte una entrada, un resultado o una operación de saldo, indicando su referencia.</p>
      <p>Ante indicios de fraude, trampas, acceso indebido o infracciones de convivencia, la administración puede limitar las funciones afectadas o suspender el acceso mientras revisa los hechos. Puedes pedir el motivo y aportar información para la revisión. Una restricción de acceso no elimina por sí sola el saldo ni tus derechos a reclamar operaciones pendientes.</p>
    </>,
  },
  {
    id: 'privacidad', titulo: '11. Privacidad y servicios externos',
    contenido: <>
      <p>La <Link href="/privacidad" className={enlace}>Política de privacidad</Link> explica los datos que utiliza la web, su visibilidad, proveedores y cómo solicitar acceso, corrección o eliminación. Estos términos no sustituyen los permisos que Google u otro proveedor te pidan directamente.</p>
      <p>Dota 2 y Steam son marcas de Valve. Las marcas de Google y de los medios de pago pertenecen a sus respectivos titulares. Usar sus servicios o identificadores no implica que patrocinen, administren o garanticen las partidas de KódigoDota; sus propias condiciones también se aplican al uso de esos servicios.</p>
    </>,
  },
  {
    id: 'atencion', titulo: '12. Atención, derechos y cambios',
    contenido: <>
      <p>Para consultas o revisión de una operación, escribe a <a href={`mailto:${CORREO_PRIVACIDAD}?subject=Consulta%20sobre%20el%20servicio%20-%20K%C3%B3digoDota`} className={`${enlace} break-all`}>{CORREO_PRIVACIDAD}</a> e indica tu nick, la referencia de sala o solicitud y lo ocurrido. Aporta solo la información necesaria; no envíes contraseñas ni códigos de acceso.</p>
      <p>Estas condiciones no limitan los derechos irrenunciables que te correspondan ni impiden acudir a las autoridades o mecanismos de reclamación aplicables. Puedes consultar la información de <a href="https://consumidor.gob.pe/codigo-del-consumidor/" className={enlace} target="_blank" rel="noopener noreferrer">Indecopi sobre derechos del consumidor</a>. El correo de soporte no sustituye los mecanismos de reclamación que sean legalmente exigibles.</p>
      <p>Las actualizaciones se publicarán con su fecha de vigencia y los cambios relevantes se comunicarán por los canales de la web. No modificarán retroactivamente el aporte o premio de una operación ya confirmada. Consulta la versión vigente antes de realizar nuevas operaciones.</p>
    </>,
  },
];

export default function TerminosPage() {
  return <DocumentoLegal titulo={titulo} etiqueta="Reglas claras para participar" introduccion="Condiciones de uso de tu cuenta, las salas y las operaciones de saldo en KódigoDota." fecha={FECHA_TERMINOS} fechaVisible={FECHA_TERMINOS_VISIBLE} ruta="/terminos" secciones={secciones} />;
}
