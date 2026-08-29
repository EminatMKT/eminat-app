// `tabs`: si la sección posee un grupo de sub-vistas (barra horizontal), listalas acá.
// El item queda activo cuando la tab actual pertenece al grupo (no solo por igualdad con `tab`).
export type SubItem = { id: string; icon: string; label: string; tab: string; tabs?: string[] }
export type PanelKey = 'mkt' | 'medical' | 'research' | 'admin'
