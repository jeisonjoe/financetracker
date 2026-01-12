
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dataImports/My Activity.html');
const fileContent = fs.readFileSync(filePath, 'utf8');

const cells = fileContent.split('<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">');

const statusCounts = {};
let total = 0;

for (let i = 1; i < cells.length; i++) {
    const cell = cells[i];

    // Pattern: <b>Details:</b><br>&emsp;{ID}<br>&emsp;{Status}<br>
    const detailsMatch = cell.match(/<b>Details:<\/b><br>\s*&emsp;(.*?)<br>\s*&emsp;(Completed|Failed|Pending|Cancelled)/);

    if (detailsMatch) {
        const status = detailsMatch[2].trim();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        total++;
    } else {
        // Try to see if there are others that didn't match the specific regex (maybe different status word)
        const partialMatch = cell.match(/<b>Details:<\/b><br>\s*&emsp;(.*?)<br>\s*&emsp;([A-Za-z]+)/);
        if (partialMatch) {
            const status = partialMatch[2].trim();
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            total++;
        }
    }
}

console.log("Total outer-cell blocks:", cells.length - 1);
console.log("Total Matched:", total);
console.log("Status Breakdown:", statusCounts);
