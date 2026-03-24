const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../users.json');


const targetUserId = process.argv[2] || 'onubcrblr';

const tokensToAdd = 2354465;

console.log(`Starting simulation...`);
console.log(`Target User ID: ${targetUserId}`);

try {
    if (!fs.existsSync(usersFilePath)) {
        console.error(`File not found: ${usersFilePath}`);
        process.exit(1);
    }

    const data = fs.readFileSync(usersFilePath, 'utf8');
    let users = [];
    try {
        users = JSON.parse(data);
    } catch (e) {
        console.error("Error parsing users.json:", e.message);
        process.exit(1);
    }

    const user = users.find(u => u.id === targetUserId);

    if (!user) {
        console.error(`User with ID "${targetUserId}" not found.`);
        console.log("Available Users:");
        users.forEach(u => console.log(`- ${u.name} (ID: ${u.id})`));

        
        process.exit(1);
    }

    console.log(`Found user: ${user.name}`);
    console.log(`Previous AI Tokens: ${user.aiTokens || 0}`);

    
    user.aiTokens = (user.aiTokens || 0) + tokensToAdd;

    console.log(`Updated AI Tokens: ${user.aiTokens}`);

    
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    console.log('Successfully updated users.json');

} catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
}
