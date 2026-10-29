import type { Metadata } from 'next';
import DocumentoLegal from '@/components/DocumentoLegal';
import { CORREO_PRIVACIDAD, FECHA_PRIVACIDAD, FECHA_PRIVACIDAD_VISIBLE, RESPONSABLE_PRIVACIDAD } from '@/lib/privacidad';
import { REDES_SITIO, URL_SITIO } from '@/lib/sitio';

const titulo = 'Política de privacidad';
const descripcion = 'Conoce qué datos utiliza KódigoDota, cómo se gestionan el acceso con Google o Steam y tu cuenta, y cómo ejercer tus derechos de privacidad.';
const enlace = 'text-prism-300 underline decoration-prism-400/30 underline-offset-4 transition hover:text-prism-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-prism-400';

export const metadata: Metadata = {
  title: titulo,
  description: descripcion,
  alternates: { canonical: '/privacidad' },
  robots: { index: true, follow: true },
  openGraph: { ...REDES_SITIO, title: titulo, description: descripcion, url: `${URL_SITIO}/privacidad` },
};

const secciones = [
  {
    id: 'responsable', titulo: '1. Responsable y alcance',
    contenido: <>
      <p>{RESPONSABLE_PRIVACIDAD} es responsable del tratamiento de los datos personales utilizados en esta plataforma de salas competitivas de Dota 2. Esta política se aplica al sitio <a href={URL_SITIO} className={enlace}>www.kodigodota.com</a>, al registro, al acceso con Google y a las funciones de cuenta, comunidad y billetera disponibles en la web.</p>
      <p>Puedes consultar sobre tus datos o presentar una solicitud de privacidad escribiendo a <a href={`mailto:${CORREO_PRIVACIDAD}`} className={`${enlace} break-all`}>{CORREO_PRIVACIDAD}</a>.</p>
    </>,
  },
  {
    id: 'datos', titulo: '2. Datos que tratamos',
    contenido: <>
      <ul className="list-disc space-y-3 pl-5 marker:text-prism-300">
        <li><strong className="font-semibold text-slate-200">Cuenta y acceso:</strong> correo electrónico, identificador de cuenta, nick y datos necesarios para autenticarte y mantener tu sesión. La autenticación y las contraseñas del registro por correo se gestionan mediante Supabase Auth.</li>
        <li><strong className="font-semibold text-slate-200">Google:</strong> identificador de tu cuenta de Google, correo y datos básicos de perfil que Google facilite al autorizar el acceso, como nombre e imagen de perfil. Estos datos forman parte del registro de autenticación.</li>
        <li><strong className="font-semibold text-slate-200">Perfil de juego:</strong> cuenta y perfil de Steam si decides vincularlos, avatar, nombre público, MMR, roles preferidos y estadísticas de juego disponibles públicamente.</li>
        <li><strong className="font-semibold text-slate-200">Actividad:</strong> participación en salas, equipos, partidas, resultados, apuestas, donaciones, mensajes de chat, notificaciones y actuaciones de moderación.</li>
        <li><strong className="font-semibold text-slate-200">Operaciones de saldo:</strong> importes, movimientos, números de operación, capturas de pago, destino de retiro, estado de las solicitudes y observaciones necesarias para revisarlas.</li>
        <li><strong className="font-semibold text-slate-200">Soporte y conexión:</strong> información que incluyas al contactarnos y datos técnicos de funcionamiento y seguridad, como dirección IP, navegador, fecha de acceso y registros de errores que puedan generar nuestros proveedores.</li>
      </ul>
    </>,
  },
  {
    id: 'finalidades', titulo: '3. Para qué usamos la información',
    contenido: <>
      <p>Usamos los datos necesarios para crear y administrar tu cuenta, verificar el acceso, mostrar tu perfil de juego, organizar las salas y registrar sus resultados. También permiten gestionar el chat y las notificaciones, revisar recargas y retiros, llevar el historial de saldo, resolver apuestas y donaciones, atender consultas y prevenir abusos o uso indebido.</p>
      <p>Si eliges ingresar con Steam, verificamos tu identidad con ese servicio para encontrar la cuenta vinculada o crear una nueva. Steam no nos entrega tu correo electrónico en este acceso. Conservamos la asociación necesaria para tus próximos ingresos y pruebas temporales para impedir que se reutilice una respuesta de acceso.</p>
      <p>El tratamiento depende de las funciones que utilices y de la información que proporciones en sus formularios. Determinados registros también pueden conservarse para resolver incidencias y atender obligaciones legales aplicables.</p>
    </>,
  },
  {
    id: 'google', titulo: '4. Acceso con Google y uso de sus datos',
    contenido: <>
      <p>Cuando eliges <strong className="font-semibold text-slate-200">Continuar con Google</strong>, Google te permite seleccionar una cuenta y autorizar el acceso básico a su correo y perfil. Utilizamos esa información para autenticarte, asociar la identidad con tu cuenta en KódigoDota y permitirte gestionar el acceso. Los permisos actuales no incluyen leer el contenido de Gmail ni tus archivos de Google Drive.</p>
      <p>El uso y la transferencia de información recibida de Google se ajustan a la <a href="https://developers.google.com/terms/api-services-user-data-policy" className={enlace} target="_blank" rel="noopener noreferrer">Política de Datos de Usuario de los Servicios API de Google</a>, incluidos los requisitos de Uso Limitado que correspondan. No vendemos los datos recibidos de Google, no los utilizamos para publicidad personalizada ni para entrenar modelos de inteligencia artificial.</p>
      <p>Puedes revisar o retirar el acceso desde las <a href="https://myaccount.google.com/connections" className={enlace} target="_blank" rel="noopener noreferrer">conexiones de tu cuenta de Google</a>. Retirar esa autorización no elimina por sí solo tu cuenta ni los registros de KódigoDota; para solicitar su eliminación, utiliza el contacto de esta política.</p>
    </>,
  },
  {
    id: 'visibilidad', titulo: '5. Información visible en la comunidad',
    contenido: <>
      <p>El nick, el avatar de juego, el MMR, los roles y las estadísticas públicas forman parte del perfil que otros usuarios pueden consultar. La participación en salas, los resultados y los cruces de apuestas confirmadas pueden mostrar el nick y avatar de los participantes. El feed de actividad puede mostrar donaciones y multas con sus importes y mensajes asociados.</p>
      <p>Los mensajes son visibles en el chat donde se publican, según el acceso de ese espacio. Ten en cuenta esta visibilidad al escribir o elegir tu nick. El correo de acceso, los comprobantes de pago y los destinos de retiro no forman parte del perfil público; su revisión corresponde a las funciones de cuenta y administración autorizadas.</p>
    </>,
  },
  {
    id: 'proveedores', titulo: '6. Proveedores y comunicaciones de datos',
    contenido: <>
      <p>La plataforma utiliza <strong className="font-semibold text-slate-200">Supabase</strong> para autenticación, base de datos, archivos y actualizaciones en tiempo real, y <strong className="font-semibold text-slate-200">Vercel</strong> para alojamiento y entrega de la web. Estos proveedores procesan la información necesaria para prestar sus servicios.</p>
      <p>Google interviene cuando eliges su acceso. Steam y los servicios de estadísticas públicas, como OpenDota, intervienen en la vinculación o consulta de información de juego. Yape o Plin gestionan los pagos que realizas en sus propias aplicaciones; KódigoDota recibe los datos y comprobantes que aportas para verificar la operación.</p>
      <p>La portada incluye el reproductor oficial de Kick. Al cargarse, tu navegador se conecta con Kick para mostrar la transmisión y ese proveedor procesa los datos técnicos de la conexión conforme a su <a href="https://kick.com/privacy-policy" className={enlace} target="_blank" rel="noopener noreferrer">política de privacidad</a>.</p>
      <p>Si nos contactas por correo o utilizas un enlace de soporte por WhatsApp, el proveedor de ese canal también gestiona la comunicación conforme a sus condiciones. Utilizamos la información que envíes a soporte para atender tu solicitud.</p>
      <p>Los administradores acceden a la información necesaria para soporte, moderación y revisión de operaciones. Cualquier comunicación adicional se limita a lo necesario para prestar el servicio, cumplir una obligación legal, atender un requerimiento válido o proteger la seguridad de las cuentas.</p>
      <p>La infraestructura de los proveedores puede encontrarse en otros países. El tratamiento también está sujeto a sus condiciones y medidas de protección. Puedes consultar los avisos de <a href="https://supabase.com/privacy" className={enlace} target="_blank" rel="noopener noreferrer">Supabase</a>, <a href="https://vercel.com/legal/privacy-notice" className={enlace} target="_blank" rel="noopener noreferrer">Vercel</a> y <a href="https://policies.google.com/privacy" className={enlace} target="_blank" rel="noopener noreferrer">Google</a>.</p>
    </>,
  },
  {
    id: 'almacenamiento', titulo: '7. Sesión y almacenamiento del navegador',
    contenido: <>
      <p>Utilizamos almacenamiento local del navegador para mantener la sesión, almacenamiento temporal de la pestaña durante el acceso con Google o Steam y cookies de seguridad en el acceso y la vinculación con Steam. Estas funciones permiten autenticarte, volver a la página de origen y proteger los flujos de acceso.</p>
      <p>Puedes borrar o limitar este almacenamiento desde tu navegador. Hacerlo puede cerrar tu sesión o impedir que se complete un acceso o una vinculación en curso.</p>
    </>,
  },
  {
    id: 'conservacion', titulo: '8. Conservación y seguridad',
    contenido: <>
      <p>Conservamos la información de cuenta y actividad mientras sea necesaria para mantener el servicio y gestionar la relación con el usuario. La conservación de operaciones de saldo, comprobantes y actuaciones de moderación depende de las operaciones pendientes, la resolución de incidencias y las obligaciones de conservación aplicables.</p>
      <p>Una solicitud de eliminación se revisa según el tipo de dato y su finalidad. Cuando sea necesario mantener un registro, te informaremos del motivo. Las copias de respaldo pueden conservar información durante los ciclos de recuperación de los proveedores.</p>
      <p>Aplicamos conexiones HTTPS, comprobaciones de sesión, permisos de acceso y validaciones en servidor para proteger las cuentas y sus operaciones. Estas medidas se complementan con las protecciones de nuestros proveedores.</p>
    </>,
  },
  {
    id: 'derechos', titulo: '9. Tus derechos y solicitudes',
    contenido: <>
      <p>Puedes solicitar información sobre el tratamiento de tus datos y ejercer los derechos de acceso, rectificación, cancelación o eliminación y oposición que correspondan. También puedes solicitar el cierre de tu cuenta o retirar una autorización otorgada.</p>
      <p>Escribe a <a href={`mailto:${CORREO_PRIVACIDAD}?subject=Solicitud%20de%20privacidad%20-%20K%C3%B3digoDota`} className={`${enlace} break-all`}>{CORREO_PRIVACIDAD}</a>, indicando el nick o correo asociado a la cuenta y la solicitud concreta. Para proteger tu información, podremos pedir lo necesario para comprobar que eres su titular. No envíes contraseñas ni códigos de acceso.</p>
      <p>Las solicitudes se atienden conforme a su naturaleza y a las obligaciones aplicables. Puedes consultar la orientación de la <a href="https://www.gob.pe/institucion/anpd/tema/derechos-arco" className={enlace} target="_blank" rel="noopener noreferrer">Autoridad Nacional de Protección de Datos Personales del Perú</a> sobre estos derechos y los mecanismos de tutela.</p>
    </>,
  },
  {
    id: 'actualizaciones', titulo: '10. Cambios y contacto',
    contenido: <>
      <p>Actualizaremos esta política cuando cambien las funciones de la plataforma o la forma de tratar la información. La fecha de la versión vigente figura al inicio. Los cambios relevantes podrán comunicarse mediante la web o los canales de contacto de la cuenta.</p>
      <p>Responsable: <strong className="font-semibold text-slate-200">{RESPONSABLE_PRIVACIDAD}</strong>. Contacto: <a href={`mailto:${CORREO_PRIVACIDAD}`} className={`${enlace} break-all`}>{CORREO_PRIVACIDAD}</a>.</p>
    </>,
  },
];

export default function PrivacidadPage() {
  return <DocumentoLegal titulo={titulo} etiqueta="Tu cuenta y tus datos" introduccion="Información sobre los datos que usamos para que puedas acceder, jugar y participar en la comunidad de KódigoDota." fecha={FECHA_PRIVACIDAD} fechaVisible={FECHA_PRIVACIDAD_VISIBLE} ruta="/privacidad" secciones={secciones} />;
}
