---
description: "Show the flow-viewer URL and make sure its server is running."
---

Run `node -e "fetch('http://127.0.0.1:4777/health').then(r=>r.text()).then(console.log).catch(()=>console.log('down'))"`. If it does not print `ok`, start the server with `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/start-server.js"`, wait one second, and check again. Then tell the user, in one line, to open http://localhost:4777 (or the port in FLOW_VIEWER_PORT). Do nothing else.
