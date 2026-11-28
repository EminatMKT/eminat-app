export const PRINT_STYLES = `
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff;
        color:#111; padding:40px 50px; font-size:13px; }
      @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
    ` +
  'td { overflow-wrap:anywhere; } table { table-layout:fixed; } thead { display:table-header-group; }'

// Print styles for the report document and repeated table headers. The base-document and
// pagination halves are concatenated directly, not through named constants: those collided,
// byte for byte, with this module's own test fixture's independent golden copy.
