const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        try {
            if (fs.statSync(dirFile).isDirectory()) {
                if (!dirFile.includes('node_modules') && !dirFile.includes('.git') && !dirFile.includes('.next') && !dirFile.includes('dist')) {
                    filelist = walkSync(dirFile, filelist);
                }
            } else {
                if (dirFile.match(/\.(js|jsx|ts|tsx)$/)) {
                    filelist.push(dirFile);
                }
            }
        } catch (e) {
            
        }
    });
    return filelist;
};

const files = walkSync('/home/nabil-abubakar/Documents/Github/Stockbud-MVP-system');
let updatedCount = 0;


const exactEmojis = ['', '', '', '', '', '', '', '️', '', '', '', '', '', '', '', '', '️', '', '', '', '', '', '', '', ''];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    exactEmojis.forEach(emoji => {
        content = content.split(emoji).join('');
    });

    // Catch any remaining pictographics and their optional variation selectors
    content = content.replace(/[\p{Extended_Pictographic}]\uFE0F?/gu, '');

    // Also catch generic emoji presentation things like \u2600-\u27bf
    // but exclude ✓ (\u2713) and ✗ (\u2717) which are often used as text UI
    content = content.replace(/[\u2600-\u2712\u2714-\u2716\u2718-\u27BF]/gu, (match) => {
        return '';
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        updatedCount++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Completed. Updated ${updatedCount} files.`);
