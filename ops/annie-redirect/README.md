# ANNIE redirect: prepared, inactive

Target: `https://app.stratixsolutions.us/login` with HTTP 301. The sibling `.disabled`
file is a review template only, outside any active nginx include. No service, DNS,
certificate, runtime dependency, or infrastructure was changed or removed.

Do not activate yet. On 2026-10-24, the public ANNIE hostname still returned HTTP 200
from nginx. LILLY retains `src/server/integrations/annie/` and
`src/app/api/integrations/annie/` adapters controlled by environment configuration.
Source inspection alone cannot prove they are unused in Production.

Before activation, the operator must confirm, using deployed configuration and
access logs, that no required consumer uses this host for API, Sales, Patient Portal,
QuickBooks, Meta callbacks/webhooks, sessions or scheduled workers. Inventory external
callback registrations as well as browser and server requests. Confirm alternative
origins for every required consumer and test those paths. A blanket 301 changes POST
semantics and must never intercept a required API or callback.

After that audit passes and separate redirect approval is recorded: back up this
hostname's current nginx vhost, validate the candidate with `nginx -t`, replace only
its vhost and gracefully reload nginx. Do not restart application services. Confirm
HTTP and HTTPS root and legacy paths return exactly 301 with the fixed Location;
check other virtual hosts remain healthy. Keep ANNIE infrastructure running. To roll
back, restore the saved vhost, validate nginx and gracefully reload. No activation
commands are automated by this change.
