
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dataImports/My Activity.html');
const fileContent = fs.readFileSync(filePath, 'utf8');

const cells = fileContent.split('<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">');

let count = 0;

for (let i = 1; i < cells.length; i++) {
    const cell = cells[i];

    // Status check
    const detailsMatch = cell.match(/<b>Details:<\/b><br>\s*&emsp;(.*?)<br>\s*&emsp;(Completed|Failed|Pending|Cancelled)/);
    if (!detailsMatch || detailsMatch[2].trim() !== 'Completed') continue;

    // Relaxed Date check
    // match day, month, year, time .. up to anything
    const dateMatch = cell.match(/\d{1,2}\s+[A-Za-z]{3}\s+20\d\d/);
    if (!dateMatch) {
        if (count < 5) {
            console.log("--- FAILED DATE BLOCK " + i + " ---");
            // Extract just the part that looks like a date for inspection
            // Search for year 202[0-9]
            const roughMatch = cell.match(/(\d{1,2} [A-Za-z]{3} \d{4}.*?)(<br>|<\/div>)/);
            if (roughMatch) {
                console.log("Found roughly:", roughMatch[1]);
                console.log("Hex dump:", Buffer.from(roughMatch[1]).toString('hex'));
            } else {
                console.log("Could not even find rough date.");
                console.log(cell.replace(/\n/g, ' '));
            }
        }
        count++;
    }
}
