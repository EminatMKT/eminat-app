// Datos del directorio de personas y cargos. Hoy hardcodeados (seed);
// candidatos a migrar a la DB (ver TODO). AppContext los re-exporta.

export const CARGOS_DIR: Record<string, string> = {
  'freddy@eminat.net': 'Marketing Director',
  'joselyne@eminat.net': 'Graphic Designer',
  'david@eminat.net': 'Graphic Designer & Animations',
  'jonathan@eminat.net': 'CRM Developer / Full Stack',
  'ariana@eminat.net': 'Graphic Designer (Pasante)',
  'naomi@eminat.net': 'Community Manager (Pasante)',
  'bryan@eminat.net': 'Video Editor (Pasante)',
  'ceo@eminat.net': 'CEO',
  'javier@eminat.net': 'COO',
  'dmsardina@eminat.net': 'Director Clinical Research',
  'ntorres@eminat.net': 'Finance & Admin Director',
  'erick@eminat.net': 'Business Development Director',
  'raul@eminat.net': 'Director Digital Transformation',
  'ivannia@eminat.net': 'Premier Manager',
}

export const DIRECTORIO_DATA = [
  { nombre: 'Sandra Viviana Negrete', nickname: 'Vivi', cargo: 'CEO', email: 'ceo@eminat.net', ubicacion: 'USA', credenciales: 'MBA', departamento: 'Leadership', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Javier Andrade', nickname: 'Javi', cargo: 'COO', email: 'javier@eminat.net', ubicacion: 'USA', credenciales: 'MD, MPH', departamento: 'Leadership', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Emilio Andrade-Negrete', cargo: 'Clinical Research Regulatory Coordinator', email: 'emilioandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Natalya Andrade-Negrete', cargo: 'VNF Coordinator', email: 'natalyaandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Dayrelis Mesa-Sardina', nickname: 'Day', cargo: 'Director Clinical Research Operations', email: 'dmsardina@eminat.net', ubicacion: 'USA', credenciales: 'PA-C, MCMs, MPH', departamento: 'Directors', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Daniel Valderrama', nickname: 'Dani', cargo: 'Director Medical Center Operations', email: 'daniel@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Norma Torres', nickname: 'Normita', cargo: 'Finance and Administrative Director', email: 'ntorres@eminat.net', ubicacion: 'USA', credenciales: 'ECON', departamento: 'Directors', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Erick Lebed', cargo: 'Business Development Director', email: 'erick@eminat.net', ubicacion: 'USA', credenciales: 'BBA', departamento: 'Directors', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Raul Hernandez', nickname: 'Coach', cargo: 'Director Digital Transformation', email: 'raul@eminat.net', ubicacion: 'USA', credenciales: 'ENG', departamento: 'Directors', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Freddy Crespin', nickname: 'Mr Freddy', cargo: 'Marketing Director', email: 'freddy@eminat.net', ubicacion: 'Ecuador', departamento: 'Directors', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'Ivannia Castrillo', nickname: 'Ivannita', cargo: 'Eminat Premier Manager', email: 'ivannia@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Premier by Eminat', color: '#FB923C' },
  { nombre: 'Maria Jose Malaguera', nickname: 'Majito', cargo: 'Accounting Lead', email: 'majo@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Ana Vargas', nickname: 'Anita', cargo: 'Accounting Coordinator', email: 'ana@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Livingsthone Andrade', cargo: 'Latin America Manager', email: 'landrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MSES', departamento: 'Finance', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Ronny Andrade', cargo: 'Head of Partnerships', email: 'randrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MBA', departamento: 'Finance', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Federico Salviche', cargo: 'Business Development Associate', email: 'federico@eminat.net', ubicacion: 'USA', departamento: 'Business Dev', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Lina Guerrero', cargo: 'Business Development Associate', email: 'lina@eminat.net', ubicacion: 'USA', departamento: 'Business Dev', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Leonardo Salazar', nickname: 'Leo', cargo: 'Senior Clinical Research Coordinator', email: 'lsalazar@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Diana Hernandez', nickname: 'Dianita', cargo: 'Senior Clinical Research Coordinator', email: 'diana@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Lisandra Cruz', nickname: 'Lissy', cargo: 'Clinical Research Coordinator', email: 'lcruz@eminat.net', ubicacion: 'USA', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Joselyne Guerrero', nickname: 'Joss', cargo: 'Graphic Designer', email: 'joselyne@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'David Falconi', cargo: 'Graphic Designer & Animations', email: 'david@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'Jonathan Bula', cargo: 'CRM / Full Stack Developer', email: 'jonathan@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'Guiselle Negrete', nickname: 'Gigi', cargo: 'Patient Recruitment Coordinator', email: 'guisella@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'Gabriel Negrete', cargo: 'Patient Recruitment Coordinator', email: 'gnegrete@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Luis Melo', cargo: 'Digital Transformation Consultant', email: 'luis@eminat.net', ubicacion: 'USA', departamento: 'Digital & AI', empresa: 'Eminat Group', color: '#A78BFA' },
  { nombre: 'Wagner Duenas', cargo: 'AI Developer', email: 'wagner@eminat.net', ubicacion: 'Ecuador', departamento: 'Digital & AI', empresa: 'Eminat Group', color: '#A78BFA' },
  { nombre: 'Giuliana Guerrero', nickname: 'Giuli', cargo: 'Operations Coordinator', email: 'giuliana@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'AASW', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Felipe Beltran', cargo: 'Psychiatry', email: 'fbeltran@vivinegretefoundation.org', ubicacion: 'USA', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Sara Hidalgo', cargo: 'Psychiatry', email: 'shidalgo@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'ARNP', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
]

export const DEPS_DIR = ['Todos', 'Leadership', 'Directors', 'Finance', 'Business Dev', 'Research', 'Marketing', 'Digital & AI', 'VNF']
