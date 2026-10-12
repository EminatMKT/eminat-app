export type Locale = 'es' | 'en'

export const STORAGE_LOCALE = 'stratix-meet.locale'
export const STORAGE_THEME = 'stratix-meet.theme'

export const messages = {
  es: {
    searchTasks: 'Buscar por Task, responsable, empresa o reunión', searchHistory: 'Buscar en el historial', clearSearch: 'Limpiar búsqueda', results: 'resultados', noSearchResults: 'No hay resultados con estos filtros.',
    meetings: 'Reuniones', newMeeting: 'Nueva reunión', history: 'Historial', tasks: 'Tasks', signOut: 'Salir',
    welcome: 'Bienvenido a Meetings de LILLY', hello: 'Hola', welcomePerson: 'bienvenido/a', team: 'Equipo', company: 'Empresa',
    light: 'Claro', dark: 'Oscuro', language: 'Idioma', loading: 'Cargando…',
    active: 'Activa', finished: 'Finalizada', viewMeeting: 'Ver reunión', viewHistory: 'Ver historial',
    lastActivity: 'Última actividad', noActivity: 'Sin actividad registrada', createdBy: 'Creada por',
    created: 'Creada', scheduled: 'Programada', updated: 'Última modificación', taskSummary: 'Resumen de Tasks',
    all: 'Todas visibles', relatedToMe: 'Todas relacionadas conmigo', allStatuses: 'Todos los estados', mine: 'Mis Tasks', myTeam: 'Mi equipo', myCompany: 'Mi empresa', allAssignees: 'Todos los responsables',
    readOnly: 'Solo lectura', noTasks: 'No hay Tasks disponibles con los permisos actuales.',
    taskSourceNotice: 'Las Tasks se administran en el módulo Tasks de LILLY. Meetings solo las muestra.',
    title: 'Título', description: 'Descripción', assignee: 'Responsable', department: 'Departamento',
    createdAt: 'Fecha de creación', dueDate: 'Fecha de entrega', status: 'Estado', originMeeting: 'Reunión de origen',
    notRegistered: 'No registrado', noDate: 'Sin fecha', pending: 'Pendiente', completed: 'Completado',
    meetingHistory: 'Historial de la reunión', noEvents: 'Todavía no hay eventos registrados.',
  },
  en: {
    searchTasks: 'Search Task, assignee, company or meeting', searchHistory: 'Search meeting history', clearSearch: 'Clear search', results: 'results', noSearchResults: 'No results match these filters.',
    meetings: 'Meetings', newMeeting: 'New meeting', history: 'History', tasks: 'Tasks', signOut: 'Sign out',
    welcome: 'Welcome to LILLY Meetings', hello: 'Hello', welcomePerson: 'welcome', team: 'Team', company: 'Company',
    light: 'Light', dark: 'Dark', language: 'Language', loading: 'Loading…',
    active: 'Active', finished: 'Finalized', viewMeeting: 'View meeting', viewHistory: 'View history',
    lastActivity: 'Latest activity', noActivity: 'No activity recorded', createdBy: 'Created by',
    created: 'Created', scheduled: 'Scheduled', updated: 'Last updated', taskSummary: 'Task summary',
    all: 'All visible', relatedToMe: 'All related to me', allStatuses: 'All statuses', mine: 'My Tasks', myTeam: 'My team', myCompany: 'My company', allAssignees: 'All assignees',
    readOnly: 'Read only', noTasks: 'No Tasks are available under your current permissions.',
    taskSourceNotice: 'Tasks are managed in LILLY’s Tasks module. Meetings only displays them.',
    title: 'Title', description: 'Description', assignee: 'Assignee', department: 'Department',
    createdAt: 'Created', dueDate: 'Due date', status: 'Status', originMeeting: 'Source meeting',
    notRegistered: 'Not available', noDate: 'No due date', pending: 'Pending', completed: 'Completed',
    meetingHistory: 'Meeting history', noEvents: 'No events have been recorded yet.',
  },
} as const

export type MessageKey = keyof typeof messages.es
