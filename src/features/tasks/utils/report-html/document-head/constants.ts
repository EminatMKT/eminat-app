const DOCUMENT_STYLES = `
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff;
        color:#111; padding:40px 50px; font-size:13px; }
      @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
    `
const PAGINATION_STYLES = 'td { overflow-wrap:anywhere; } table { table-layout:fixed; }'
  + ' thead { display:table-header-group; }'
export const PRINT_STYLES = DOCUMENT_STYLES + PAGINATION_STYLES

// Print styles for the report document and repeated table headers.
