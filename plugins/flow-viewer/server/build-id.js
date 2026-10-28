// Build id: hash of relative path + mtime of every file under server/ (including public/).
// Shared by /health and hooks/scripts/start-server.js so a stale running server is replaced after any file change.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function buildId(dir = __dirname) {
  const h = crypto.createHash('sha1');
  for (const rel of fs.readdirSync(dir, { recursive: true }).sort()) {
    let st; try { st = fs.statSync(path.join(dir, rel)); } catch (_) { continue; } // file vanished mid-walk
    if (st.isFile()) h.update(rel.split(path.sep).join('/') + ':' + st.mtimeMs + '\n');
  }
  return h.digest('hex').slice(0, 12);
};
