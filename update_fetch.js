const fs = require('fs');
const path = require('path');

function replaceFetch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace fetch('/api/...) with fetch(window.API_BASE_URL + '/api/...)
    // Also handle fetch(`/api/...`)
    let updated = content.replace(/fetch\(['"`]\/api\//g, "fetch(window.API_BASE_URL + '/api/");
    
    // Sometimes it's fetch( `/api/... ) with spaces
    // Let's use a regex that catches string literals starting with /api/
    updated = updated.replace(/fetch\(\s*['"`]\/api\//g, "fetch(window.API_BASE_URL + '/api/");
    
    if (content !== updated) {
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log('Updated:', filePath);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
            replaceFetch(fullPath);
        }
    }
}

processDirectory(path.join(__dirname, 'assets', 'js'));
replaceFetch(path.join(__dirname, 'index.html'));
console.log('Selesai update fetch calls!');
