// require('dotenv').config(); // relying on node --env-file
const url = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

console.log("--- DATABASE_URL ---");
if (!url) {
    console.log("NOT SET");
} else {
    try {
        const u = new URL(url);
        console.log("Protocol:", u.protocol);
        console.log("Port:", u.port);
        console.log("Host:", u.hostname); // masked check
    } catch (e) { console.log("Invalid URL format"); }
}

console.log("--- DIRECT_URL ---");
if (!directUrl) {
    console.log("NOT SET");
} else {
    try {
        const u = new URL(directUrl);
        console.log("Protocol:", u.protocol);
        console.log("Port:", u.port);
        console.log("Host:", u.hostname);
    } catch (e) { console.log("Invalid URL format"); }
}
