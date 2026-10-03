/** What the welcome email shows: the person, their temporary credentials and their area. */
export type WelcomeArgs = {
  nombre: string
  apellido: string
  email: string
  password: string
  areaLabel: string
  cargo?: string
}

/** The credentials block's part of the email. */
export type WelcomeDetails = Pick<WelcomeArgs, 'email' | 'password' | 'areaLabel' | 'cargo'>

/** Sends the welcome email; answers the warning to show the admin, or `null` when it went out. */
export type WelcomeSender = (args: WelcomeArgs) => Promise<string | null>
