// Pasang tema sebelum render agar tidak berkedip. File terpisah karena CSP melarang skrip inline.
try { var t = localStorage.getItem('fv-theme'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; else if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'dark'; } catch (e) { /* tanpa penyimpanan */ }
