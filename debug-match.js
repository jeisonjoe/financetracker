
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dataImports/My Activity.html');
const fileContent = fs.readFileSync(filePath, 'utf8');

const cells = fileContent.split('<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">');

let unmatchedButCompleted = 0;
let unmatchedTotal = 0;

for (let i = 1; i < cells.length; i++) {
    const cell = cells[i];

    // Strict regex used in API
    const detailsMatch = cell.match(/<b>Details:<\/b><br>\s*&emsp;(.*?)<br>\s*&emsp;(Completed|Failed|Pending|Cancelled)/);

    if (!detailsMatch) {
        unmatchedTotal++;
        if (cell.includes('Completed')) {
            unmatchedButCompleted++;
        }
    }
}

console.log("Total Unmatched by strict regex:", unmatchedTotal);
console.log("... of which contain 'Completed':", unmatchedButCompleted);
