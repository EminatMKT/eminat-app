/** The welcome email's text. Spanish on purpose: it is what the new person reads in their inbox. */
const WELCOME_COPY = {
  subject: 'Tu acceso a Stratix Solutions',
  brand: 'Stratix Solutions',
  greeting: 'Bienvenido',
  intro: 'Te creamos una cuenta para que ingreses al sistema operativo de Eminat Group.',
  area: 'Área asignada',
  email: 'Email',
  password: 'Contraseña temporal',
  temporary: 'Es temporal: cambiala apenas entres, desde tu perfil.',
  button: 'Acceder al sistema',
  tagline: 'The operating system of Eminat Group',
  unexpected: 'Si no esperabas este mensaje, ignóralo o contacta a',
} as const

export default WELCOME_COPY

// Moved verbatim out of the create-user route, where it was inlined in the HTML.
