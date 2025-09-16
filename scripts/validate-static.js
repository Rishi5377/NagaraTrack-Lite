#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating static build...\n');

const frontendDir = path.join(__dirname, '../frontend-pwa');
const distDir = path.join(frontendDir, 'dist');
const dataDir = path.join(distDir, 'data');

// Check if build directory exists
if (!fs.existsSync(distDir)) {
  console.error('❌ Dist directory not found. Run `npm run build` first.');
  process.exit(1);
}

console.log('✅ Build directory exists');

// Check required files
const requiredFiles = [
  'index.html',
  '_redirects',
  'data/bus-stops.json',
  'data/routes.json', 
  'data/vehicles.json'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.error(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

// Validate JSON files
if (fs.existsSync(dataDir)) {
  const jsonFiles = ['bus-stops.json', 'routes.json', 'vehicles.json'];
  
  jsonFiles.forEach(file => {
    try {
      const filePath = path.join(dataDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ ${file} is valid JSON with ${data.length} items`);
      } else {
        console.warn(`⚠️  ${file} is empty or not an array`);
      }
    } catch (error) {
      console.error(`❌ ${file} is invalid JSON:`, error.message);
      allFilesExist = false;
    }
  });
}

// Check index.html for static mode indicators
try {
  const indexPath = path.join(distDir, 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  if (indexContent.includes('/NagaraTrack-Lite/')) {
    console.log('✅ Base path configured for GitHub Pages');
  } else {
    console.warn('⚠️  Base path might not be configured correctly');
  }
  
  if (indexContent.includes('static')) {
    console.log('✅ Static mode indicators found');
  }
} catch (error) {
  console.error('❌ Could not read index.html:', error.message);
  allFilesExist = false;
}

// Final validation
if (allFilesExist) {
  console.log('\n🎉 All validations passed! Ready for deployment.');
  console.log('\nNext steps:');
  console.log('1. Commit and push changes to main branch');
  console.log('2. GitHub Actions will automatically deploy to Pages');
  console.log('3. Visit https://rishi5377.github.io/NagaraTrack-Lite/');
} else {
  console.error('\n❌ Some validations failed. Please fix issues before deploying.');
  process.exit(1);
}