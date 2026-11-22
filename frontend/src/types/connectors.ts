export interface SetupStep {
  label: string;
  url?: string;
  urlLabel?: string;
}

export interface ConnectorMeta {
  connector_id: string;
  display_name: string;
  auth_type: 'oauth' | 'local' | 'bridge' | 'filesystem' | 'token';
  category: 'communication' | 'documents' | 'pim' | 'other';
  icon: string;
  color: string;
  description: string;
  unitLabel?: string;  // "emails", "messages", "meeting notes", "pages", "notes", etc.
  steps?: SetupStep[];
  troubleshooting?: string[];
  inputFields?: Array<{
    name: string;
    placeholder: string;
    type?: 'text' | 'password' | 'number' | 'select';
    required?: boolean;
    defaultValue?: string;
    options?: Array<{ value: string; label: string }>;
  }>;
}

export interface OAuthSetupInfo {
  provider: string;
  setup_url: string;
  setup_hint: string;
  has_credentials: boolean;
}

export interface ConnectorInfo {
  connector_id: string;
  display_name: string;
  auth_type: "oauth" | "local" | "bridge" | "filesystem" | "token";
  connected: boolean;
  auth_url?: string;
  mcp_tools?: string[];
  chunks?: number;
  oauth_setup?: OAuthSetupInfo | null;
}

export interface SyncStatus {
  state: "idle" | "syncing" | "stopping" | "paused" | "error";
  items_synced: number;
  items_total: number;
  /** Items processed in the current (or most recent) run only. `null`
   *  when no sync has been triggered through this server session yet. */
  new_items_synced?: number | null;
  /** ISO 8601 timestamp of the oldest indexed item, used to label how far
   *  back the corpus reaches ("past 3 months", "past 5 years"). `null`
   *  before anything is indexed. */
  oldest_item_date?: string | null;
  last_sync: string | null;
  error: string | null;
}

export interface ConnectRequest {
  path?: string;
  token?: string;
  code?: string;
  email?: string;
  password?: string;
  /** Non-secret connector configuration such as a weather location or RSS feeds. */
  config?: Record<string, unknown>;
  host?: string;
  port?: number;
  security?: 'tls' | 'starttls';
}

/** Response from POST /v1/connectors/{id}/connect.
 *  For OAuth connectors, pasting a Client ID / Secret pair only registers the
 *  app credentials; the backend returns `status: "oauth_required"` plus an
 *  `oauth_start` path the UI must open to run the browser consent flow that
 *  actually mints an access token (see issue #512). */
export interface ConnectResponse {
  connector_id: string;
  connected: boolean;
  status: "connected" | "pending" | "oauth_required" | "disconnected";
  oauth_start?: string;
  sync_status?: string | null;
}

export type WizardStep = "pick" | "connect" | "ingest" | "ready";

// Backward-compatible alias
export type SourceCard = ConnectorMeta;

export type ConnectorCategory = ConnectorMeta['category'];

export const SOURCE_CATALOG: ConnectorMeta[] = [
  // ── Upload / Paste ─────────────────────────────────────────────────
  {
    connector_id: 'upload',
    display_name: 'Subir / pegar',
    auth_type: 'filesystem',
    category: 'other',
    icon: 'FileUp',
    color: 'text-blue-400',
    description: 'Pega texto o sube documentos',
    unitLabel: 'documents',
    steps: [
      { label: 'Pega texto o sube archivos (.txt, .md, .pdf, .docx, .csv) para añadirlos a tu base de conocimiento.' },
    ],
    inputFields: [],
  },
  // ── Communication ──────────────────────────────────────────────────
  {
    // Unified Gmail card. Defaults to the IMAP (app-password) flow because
    // it needs no Google Cloud setup; the OAuth path is offered as an
    // "Advanced" disclosure rendered in DataSourcesPage.
    connector_id: 'gmail_imap',
    display_name: 'Gmail',
    auth_type: 'oauth',
    category: 'communication',
    icon: 'Mail',
    color: 'text-red-400',
    description: 'Correos y conversaciones',
    unitLabel: 'emails',
    steps: [
      {
        label: 'Comprueba que tienes activada la verificación en dos pasos y genera una contraseña de aplicación de 16 caracteres (Correo / Otra / «Ultron»). Pégala abajo; los espacios no importan. Usa la contraseña de aplicación, no la normal de Gmail.',
        url: 'https://myaccount.google.com/apppasswords',
        urlLabel: 'Cómo conseguir una contraseña de aplicación →',
      },
    ],
    troubleshooting: [
      "¿No ves las contraseñas de aplicación? Activa primero la verificación en dos pasos.",
      "¿Usas Google Workspace? Puede que tu administrador tenga que activar las contraseñas de aplicación en tu organización.",
    ],
    inputFields: [
      { name: 'email', placeholder: 'you@gmail.com', type: 'text' },
      { name: 'password', placeholder: 'Contraseña de aplicación (xxxx xxxx xxxx xxxx)', type: 'password' },
    ],
  },
  {
    connector_id: 'imap',
    display_name: 'Correo (IMAP)',
    auth_type: 'oauth',
    category: 'communication',
    icon: 'Mail',
    color: 'text-amber-400',
    description: 'Cualquier buzón IMAP',
    unitLabel: 'emails',
    steps: [
      {
        label: 'Genera una contraseña de aplicación con tu proveedor de correo (IMAP tiene que estar activado) e introduce tu dirección y esa contraseña. Los proveedores conocidos se detectan solos; para otros, usa los ajustes opcionales del servidor.',
      },
    ],
    troubleshooting: [
      'La mayoría de proveedores piden una contraseña de aplicación en lugar de la normal.',
      'Usa TLS para TLS implícito (normalmente puerto 993) o STARTTLS (normalmente puerto 143).',
      'Por seguridad, se rechazan las direcciones de servidor privadas, locales o no públicas.',
    ],
    inputFields: [
      { name: 'email', placeholder: 'you@example.com', type: 'text' },
      { name: 'password', placeholder: 'Contraseña de aplicación', type: 'password' },
      {
        name: 'host',
        placeholder: 'Servidor IMAP (opcional; se detecta solo)',
        type: 'text',
        required: false,
      },
      {
        name: 'port',
        placeholder: 'Puerto (opcional; 993 o 143)',
        type: 'number',
        required: false,
      },
      {
        name: 'security',
        placeholder: 'Seguridad de la conexión',
        type: 'select',
        defaultValue: 'tls',
        options: [
          { value: 'tls', label: 'TLS (normalmente puerto 993)' },
          { value: 'starttls', label: 'STARTTLS (normalmente puerto 143)' },
        ],
      },
    ],
  },
  {
    connector_id: 'slack',
    display_name: 'Slack',
    auth_type: 'oauth',
    category: 'communication',
    icon: 'Hash',
    color: 'text-purple-400',
    description: 'Lee los mensajes de todos los canales, canales privados, mensajes directos y grupos a los que tienes acceso',
    unitLabel: 'messages',
    steps: [
      {
        label: 'Ve a api.slack.com/apps y pulsa «Create New App» → elige «From scratch». Llámala «Ultron» y elige tu espacio de trabajo',
        url: 'https://api.slack.com/apps',
        urlLabel: 'Abrir apps de Slack',
      },
      {
        label: 'En la barra lateral izquierda, pulsa «OAuth & Permissions». Baja hasta «User Token Scopes» (NO «Bot Token Scopes»). Pulsa «Add an OAuth Scope» y añade UNO A UNO estos permisos:',
      },
      {
        label: 'channels:history • channels:read • groups:history • groups:read • im:history • im:read • mpim:history • mpim:read • users:read',
      },
      {
        label: 'En la barra lateral izquierda, pulsa «Install App» → «Install to Workspace» → «Allow». Después copia el «User OAuth Token» que aparece (empieza por xoxp-, NO por xoxb-)',
      },
      {
        label: 'Pega abajo el token de usuario. La sincronización indexa todos los canales, canales privados, mensajes directos y grupos a los que tienes acceso; no hace falta invitar a nada en los canales',
      },
      {
        label: '(Opcional) Pon el icono de la app: en la barra lateral pulsa «Basic Information» → baja hasta «Display Information» → sube el logo de Ultron',
        url: 'https://github.com/open-jarvis/OpenJarvis/blob/main/assets/openjarvis-slack-icon.jpg',
        urlLabel: 'Download icon',
      },
    ],
    inputFields: [
      { name: 'token', placeholder: 'xoxp-...', type: 'password' },
    ],
  },
  {
    connector_id: 'notion',
    display_name: 'Notion',
    auth_type: 'oauth',
    category: 'documents',
    icon: 'FileText',
    color: 'text-gray-300',
    description: 'Páginas y bases de datos',
    unitLabel: 'pages',
    steps: [
      {
        label: 'Ve a notion.so/profile/integrations → pulsa «+ New integration». Llámala «Ultron», elige tu espacio de trabajo y pulsa Submit',
        url: 'https://www.notion.so/profile/integrations',
        urlLabel: 'Abrir integraciones de Notion',
      },
      {
        label: 'Copia el «Internal Integration Secret» (empieza por ntn_) y pégalo abajo',
      },
      {
        label: 'Para compartir TODAS tus páginas a la vez: abre una página principal → pulsa «...» (arriba a la derecha) → «Connections» → «Add connections» → busca «Ultron» y púlsalo. Así compartes esa página y todas sus subpáginas. Repítelo con cada página principal para compartir todo tu espacio',
      },
      {
        label: 'Consejo: si tienes una sola página principal que lo contiene todo, al compartirla se comparten automáticamente todas sus subpáginas',
      },
    ],
    inputFields: [
      { name: 'token', placeholder: 'ntn_...', type: 'password' },
    ],
  },
  {
    connector_id: 'granola',
    display_name: 'Granola',
    auth_type: 'oauth',
    category: 'documents',
    icon: 'Mic',
    color: 'text-amber-400',
    description: 'Notas de reuniones con IA',
    unitLabel: 'meeting notes',
    steps: [
      { label: 'Abre la app de escritorio de Granola. Pulsa el engranaje (Ajustes) abajo a la izquierda y luego «API»' },
      { label: 'Pulsa «Generate API Key» (o copia la que ya tengas) y pégala abajo' },
    ],
    inputFields: [
      { name: 'token', placeholder: 'grn_...', type: 'password' },
    ],
  },
  {
    connector_id: 'imessage',
    display_name: 'iMessage',
    auth_type: 'local',
    category: 'communication',
    icon: 'MessageSquare',
    color: 'text-green-400',
    description: 'Historial de Mensajes de macOS',
    unitLabel: 'messages',
    steps: [
      {
        label: 'Abre el menú Apple () → Ajustes del Sistema → Privacidad y seguridad (en la barra lateral) → baja y pulsa «Acceso total al disco»',
      },
      {
        label: 'Pulsa el botón «+» al final de la lista. Ve a Aplicaciones → Utilidades → elige «Terminal.app» (o iTerm2/Warp si usas otro). Si usas la app de escritorio, añade también «OpenJarvis.app» desde Aplicaciones',
      },
      {
        label: 'Activa el interruptor de cada app que hayas añadido. Cierra y vuelve a abrir el terminal (o reinicia Ultron). Los datos de iMessage se detectarán solos; no hacen falta credenciales',
      },
    ],
  },
  // ── Documents ──────────────────────────────────────────────────────
  {
    connector_id: 'obsidian',
    display_name: 'Obsidian',
    auth_type: 'filesystem',
    category: 'documents',
    icon: 'FolderOpen',
    color: 'text-purple-300',
    description: 'Bóveda de Markdown',
    unitLabel: 'notes',
    steps: [
      {
        label: 'Busca la ruta de tu bóveda: abre Obsidian → pulsa el nombre de la bóveda abajo a la izquierda → «Manage Vaults» → mira la ruta que aparece bajo el nombre. En macOS suele ser ~/Documents/MyVault o ~/Library/Mobile Documents/iCloud~md~obsidian/Documents/MyVault',
      },
      {
        label: 'También puedes abrir el Finder → ir a la carpeta de la bóveda (tiene una carpeta oculta .obsidian). Haz clic derecho en la carpeta → «Copiar como nombre de ruta» para obtener la ruta completa',
      },
      {
        label: 'Pega abajo la ruta completa. Ultron indexará todos los archivos .md de la bóveda',
      },
    ],
    inputFields: [
      { name: 'path', placeholder: '/Users/you/Documents/MyVault', type: 'text' },
    ],
  },
  {
    connector_id: 'gdrive',
    display_name: 'Google Drive',
    auth_type: 'oauth',
    category: 'documents',
    icon: 'FolderOpen',
    color: 'text-blue-400',
    description: 'Documentos, hojas de cálculo y archivos',
    unitLabel: 'files',
    steps: [
      {
        label: 'Ve a Google Cloud Console → crea un proyecto nuevo (o elige uno que ya tengas). Ponle cualquier nombre (p. ej. «Ultron»)',
        url: 'https://console.cloud.google.com/projectcreate',
        urlLabel: 'Create Project',
      },
      {
        label: 'Activa la API de Google Drive: pulsa el enlace de abajo, comprueba que tu proyecto está seleccionado arriba y pulsa «Habilitar»',
        url: 'https://console.cloud.google.com/apis/library/drive.googleapis.com',
        urlLabel: 'Enable Drive API',
      },
      {
        label: 'Crea credenciales OAuth: ve a Credenciales (enlace de abajo) → pulsa «+ Crear credenciales» → elige «ID de cliente de OAuth» → Tipo de aplicación: «Aplicación web». En «URI de redirección autorizados» añade la dirección de retorno de este servidor (p. ej. http://localhost:1313/v1/connectors/gdrive/oauth/callback, con el host y puerto de tu servidor Ultron) → pulsa «Crear».',
        url: 'https://console.cloud.google.com/apis/credentials',
        urlLabel: 'Abrir credenciales',
      },
      {
        label: 'Aparecerá una ventana con tu Client ID y tu Client Secret. Cópialos, pégalos abajo y pulsa Conectar: se abrirá una ventana de Google para terminar la autorización. (Si cierras la ventana sin querer, pulsa el icono de descarga junto a tu cliente OAuth para verlos otra vez.)',
      },
    ],
    inputFields: [
      { name: 'email', placeholder: 'Client ID (p. ej. 123456-abc.apps.googleusercontent.com)', type: 'text' },
      { name: 'password', placeholder: 'Client Secret', type: 'password' },
    ],
  },
  // ── PIM (Calendar, Contacts) ───────────────────────────────────────
  {
    connector_id: 'gcalendar',
    display_name: 'Google Calendar',
    auth_type: 'oauth',
    category: 'pim',
    icon: 'Calendar',
    color: 'text-blue-400',
    description: 'Eventos y reuniones',
    unitLabel: 'events',
    steps: [
      {
        label: 'Ve a Google Cloud Console → usa el mismo proyecto que para Google Drive (o crea uno nuevo)',
        url: 'https://console.cloud.google.com/projectcreate',
        urlLabel: 'Abrir consola',
      },
      {
        label: 'Activa la API de Google Calendar: pulsa el enlace de abajo, elige tu proyecto y pulsa «Habilitar»',
        url: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com',
        urlLabel: 'Enable Calendar API',
      },
      {
        label: 'Ve a Credenciales → «+ Crear credenciales» → «ID de cliente de OAuth» → Tipo de aplicación: «App de escritorio» → «Crear». Copia el Client ID y el Client Secret',
        url: 'https://console.cloud.google.com/apis/credentials',
        urlLabel: 'Abrir credenciales',
      },
      {
        label: 'Pega abajo el Client ID y el Client Secret (puedes reutilizar el cliente OAuth de Google Drive si activaste las dos API en el mismo proyecto)',
      },
    ],
    inputFields: [
      { name: 'email', placeholder: 'Client ID', type: 'text' },
      { name: 'password', placeholder: 'Client Secret', type: 'password' },
    ],
  },
  {
    connector_id: 'gcontacts',
    display_name: 'Google Contacts',
    auth_type: 'oauth',
    category: 'pim',
    icon: 'Users',
    color: 'text-blue-400',
    description: 'Personas y datos de contacto',
    unitLabel: 'contacts',
    steps: [
      {
        label: 'Ve a Google Cloud Console → usa el mismo proyecto que para Google Drive (o crea uno nuevo)',
        url: 'https://console.cloud.google.com/projectcreate',
        urlLabel: 'Abrir consola',
      },
      {
        label: 'Activa la People API: pulsa el enlace de abajo, elige tu proyecto y pulsa «Habilitar»',
        url: 'https://console.cloud.google.com/apis/library/people.googleapis.com',
        urlLabel: 'Enable People API',
      },
      {
        label: 'Ve a Credenciales → «+ Crear credenciales» → «ID de cliente de OAuth» → Tipo de aplicación: «App de escritorio» → «Crear». Copia el Client ID y el Client Secret',
        url: 'https://console.cloud.google.com/apis/credentials',
        urlLabel: 'Abrir credenciales',
      },
      {
        label: 'Pega abajo el Client ID y el Client Secret',
      },
    ],
    inputFields: [
      { name: 'email', placeholder: 'Client ID', type: 'text' },
      { name: 'password', placeholder: 'Client Secret', type: 'password' },
    ],
  },
  {
    connector_id: 'apple_notes',
    display_name: 'Apple Notes',
    auth_type: 'local',
    category: 'documents',
    icon: 'FileText',
    color: 'text-yellow-400',
    description: 'App Notas de macOS',
    unitLabel: 'notes',
    steps: [
      {
        label: 'Abre el menú Apple () → Ajustes del Sistema → Privacidad y seguridad (en la barra lateral) → baja y pulsa «Acceso total al disco»',
      },
      {
        label: 'Pulsa el botón «+» al final de la lista. Ve a Aplicaciones → Utilidades → elige «Terminal.app» (o iTerm2/Warp si usas otro). Si usas la app de escritorio, añade también «OpenJarvis.app» desde Aplicaciones',
      },
      {
        label: 'Activa el interruptor de cada app que hayas añadido. Cierra y vuelve a abrir el terminal (o reinicia Ultron). Las notas de Apple se detectarán solas; no hacen falta credenciales',
      },
    ],
  },
  {
    connector_id: 'apple_contacts',
    display_name: 'Apple Contacts',
    auth_type: 'local',
    category: 'pim',
    icon: 'Users',
    color: 'text-orange-400',
    description: 'App Contactos de macOS',
    unitLabel: 'contacts',
    steps: [
      {
        label: 'Abre el menú Apple () → Ajustes del Sistema → Privacidad y seguridad (en la barra lateral) → baja y pulsa «Acceso total al disco»',
      },
      {
        label: 'Pulsa el botón «+» al final de la lista. Ve a Aplicaciones → Utilidades → elige «Terminal.app» (o iTerm2/Warp si usas otro). Si usas la app de escritorio, añade también «OpenJarvis.app» desde Aplicaciones',
      },
      {
        label: 'Activa el interruptor de cada app que hayas añadido. Cierra y vuelve a abrir el terminal (o reinicia Ultron). Los contactos de Apple se detectarán solos; no hacen falta credenciales',
      },
    ],
  },
  {
    connector_id: 'outlook',
    display_name: 'Outlook',
    auth_type: 'oauth',
    category: 'communication',
    icon: 'Mail',
    color: 'text-blue-400',
    description: 'Correo y calendario de Microsoft',
    unitLabel: 'emails',
    steps: [
      {
        label: 'Ve al portal de Azure → Registros de aplicaciones → pulsa «+ Nuevo registro». Llámalo «Ultron», elige «Solo cuentas de este directorio organizativo» y pulsa Registrar',
        url: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
        urlLabel: 'Abrir registros de apps de Azure',
      },
      {
        label: 'En la barra lateral, pulsa «Permisos de API» → «Agregar un permiso» → «Microsoft Graph» → «Permisos delegados» → busca y marca «Mail.Read» → pulsa «Agregar permisos»',
      },
      {
        label: 'En la barra lateral, pulsa «Certificados y secretos» → «Nuevo secreto de cliente» → ponle descripción y caducidad → pulsa «Agregar» → copia enseguida el «Valor» (no volverás a verlo)',
      },
      {
        label: 'Ve a «Información general» en la barra lateral y copia el «Id. de aplicación (cliente)». Pega abajo el Client ID y el Client Secret',
      },
    ],
    inputFields: [
      { name: 'email', placeholder: 'Id. de aplicación (cliente)', type: 'text' },
      { name: 'password', placeholder: 'Valor del Client Secret', type: 'password' },
    ],
  },
  {
    connector_id: 'dropbox',
    display_name: 'Dropbox',
    auth_type: 'oauth',
    category: 'documents',
    icon: 'FolderOpen',
    color: 'text-blue-300',
    description: 'Almacenamiento de archivos en la nube',
    unitLabel: 'files',
    steps: [
      {
        label: 'Ve a la App Console de Dropbox y pulsa «Create app». Elige «Scoped access» → «Full Dropbox» → ponle un nombre (p. ej. «Ultron») → pulsa «Create app»',
        url: 'https://www.dropbox.com/developers/apps/create',
        urlLabel: 'Abrir la App Console de Dropbox',
      },
      {
        label: 'Pulsa la pestaña «Permissions» de arriba. Marca «files.metadata.read» y «files.content.read» → pulsa «Submit» abajo para guardar',
      },
      {
        label: 'Vuelve a la pestaña «Settings». En «OAuth 2», busca «Generated access token» y pulsa «Generate». Copia el token y pégalo abajo',
      },
    ],
    inputFields: [
      { name: 'token', placeholder: 'Token de acceso (sl.u...)', type: 'password' },
    ],
  },
  {
    connector_id: 'whatsapp',
    display_name: 'WhatsApp',
    auth_type: 'oauth',
    category: 'communication',
    icon: 'MessageSquare',
    color: 'text-green-400',
    description: 'Mensajes de WhatsApp (Meta Cloud API)',
    unitLabel: 'messages',
    steps: [
      {
        label: 'Ve a Meta for Developers → pulsa «Crear app» → elige el tipo «Negocios» → rellena los datos y pulsa «Crear app»',
        url: 'https://developers.facebook.com/apps/',
        urlLabel: 'Abrir el portal de desarrolladores de Meta',
      },
      {
        label: 'En el panel de la app, busca «WhatsApp» y pulsa «Configurar». Sigue los pasos para añadir un número de prueba. Ve a «Configuración de la API» y copia el token de acceso temporal',
      },
      {
        label: 'Copia tu «Phone Number ID» (aparece en la página de configuración de la API) y el token de acceso. Pégalos abajo separados por dos puntos, p. ej. 123456789:EAABx...',
      },
    ],
    inputFields: [
      { name: 'token', placeholder: 'Phone Number ID:Token de acceso', type: 'password' },
    ],
  },
];
