const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../users.json');

// Default to the Test User ID found in users.json which is likely "User 2" in the user's mind.
const targetUserId = process.argv[2] || 'onubcrblr';
// Token amount from requirements
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

        // If the user literally meant ID '2', they can pass it as an argument.
        process.exit(1);
    }

    console.log(`Found user: ${user.name}`);
    console.log(`Previous AI Tokens: ${user.aiTokens || 0}`);

    // Add tokens
    user.aiTokens = (user.aiTokens || 0) + tokensToAdd;

    console.log(`Updated AI Tokens: ${user.aiTokens}`);

    // Write back to file
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    console.log('Successfully updated users.json');

} catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
}
