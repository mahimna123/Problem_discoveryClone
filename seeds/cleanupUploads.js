const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  console.log('Uploads directory does not exist.');
  process.exit(0);
}

const files = fs.readdirSync(uploadsDir);
const now = Date.now();
const oneDayAgo = now - (24 * 60 * 60 * 1000); // 24 hours in milliseconds

let deleted = 0;
let kept = 0;

files.forEach(file => {
  const filePath = path.join(uploadsDir, file);
  const stats = fs.statSync(filePath);
  const fileTime = stats.mtimeMs;
  
  // Delete files older than 1 day
  if (fileTime < oneDayAgo) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${file} (${Math.round((now - fileTime) / (60 * 60 * 1000))} hours old)`);
      deleted++;
    } catch (error) {
      console.error(`Error deleting ${file}:`, error.message);
    }
  } else {
    kept++;
  }
});

console.log(`\nCleanup complete: ${deleted} file(s) deleted, ${kept} file(s) kept.`);



