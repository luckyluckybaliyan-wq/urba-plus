const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_FILE = 'project-codebase-context.txt';
const DIRECTORIES_TO_SCAN = ['app', 'lib', 'hooks', 'types', 'components'];
const INDIVIDUAL_FILES = ['package.json', 'next.config.ts', 'firestore.rules', 'firebase-blueprint.json', '.env.example'];
const EXCLUDED_DIRS = ['node_modules', '.next', '.git', 'public', 'assets', 'dist'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.rules', '.md'];

let outputContent = `# CrowdCivic AI - Project Codebase Context\n\n`;
outputContent += `This document contains the complete source code and configuration for the CrowdCivic AI application. You can use this context to answer technical questions, explain the architecture, or prepare for project vivas.\n\n`;
outputContent += `========================================================================\n\n`;

function shouldIncludeFile(filename) {
  const ext = path.extname(filename);
  return ALLOWED_EXTENSIONS.includes(ext) || filename === '.env.example';
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(item)) {
        processDirectory(fullPath);
      }
    } else {
      if (shouldIncludeFile(item)) {
        appendFileToOutput(fullPath);
      }
    }
  }
}

function appendFileToOutput(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    outputContent += `\n\n--- FILE START: ${filePath} ---\n\n`;
    outputContent += content;
    outputContent += `\n\n--- FILE END: ${filePath} ---\n\n`;
    console.log(`Added: ${filePath}`);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
}

// 1. Process specified directories
console.log('Generating codebase context...');
DIRECTORIES_TO_SCAN.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  processDirectory(dirPath);
});

// 2. Process individual root files
INDIVIDUAL_FILES.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    appendFileToOutput(filePath);
  }
});

// 3. Write to output file
fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf-8');
console.log(`\n✅ Success! All code has been exported to: ${OUTPUT_FILE}`);
console.log(`You can now upload '${OUTPUT_FILE}' to Gemini Advanced or ChatGPT to ask any questions about your project!`);
