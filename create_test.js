const fs = require('fs');
const html = fs.readFileSync('D:\\jadi\\SAAS\\GARNETA STORE\\index.html', 'utf8');

const { JSDOM } = require('jsdom');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:3000/' });

dom.window.SimpleWebAuthnBrowser = { startRegistration: () => {}, startAuthentication: () => {} };

dom.window.onerror = function(msg, src, line, col, error) {
  console.error('Browser Error:', msg, line, col);
};

setTimeout(() => {
  try {
    dom.window.document.querySelector('.neural-node[data-route="dashboard"]').click();
    console.log('Dashboard Rendered, route is:', dom.window.state.route);
  } catch(e) {
    console.error('Dashboard Click Error:', e.message);
  }
  
  try {
    dom.window.document.querySelector('.neural-node[data-route="riwayat"]').click();
    console.log('Riwayat Rendered, route is:', dom.window.state.route);
  } catch(e) {
    console.error('Riwayat Click Error:', e.message);
  }
  process.exit(0);
}, 2000);
