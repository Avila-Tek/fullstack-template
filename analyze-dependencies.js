const fs = require('fs');
const path = require('path');

const packageJsonFiles = [
  './examples/with-graphql-mongoose/apps/admin/package.json',
  './examples/with-graphql-mongoose/apps/api/package.json',
  './examples/with-graphql-mongoose/apps/client/package.json',
  './examples/with-graphql-mongoose/packages/schemas/package.json',
  './examples/with-graphql-mongoose/packages/services/package.json',
  './examples/with-graphql-mongoose/packages/typescript-config/package.json',
  './examples/with-graphql-mongoose/packages/ui/package.json',
  './examples/with-graphql-mongoose/packages/utils/package.json',
  './examples/with-graphql-prisma/apps/admin/package.json',
  './examples/with-graphql-prisma/apps/api/package.json',
  './examples/with-graphql-prisma/apps/client/package.json',
  './examples/with-graphql-prisma/packages/schemas/package.json',
  './examples/with-graphql-prisma/packages/services/package.json',
  './examples/with-graphql-prisma/packages/typescript-config/package.json',
  './examples/with-graphql-prisma/packages/ui/package.json',
  './examples/with-graphql-prisma/packages/utils/package.json',
  './examples/with-restful-mongoose/apps/admin/package.json',
  './examples/with-restful-mongoose/apps/api/package.json',
  './examples/with-restful-mongoose/apps/client/package.json',
  './examples/with-restful-mongoose/packages/schemas/package.json',
  './examples/with-restful-mongoose/packages/services/package.json',
  './examples/with-restful-mongoose/packages/typescript-config/package.json',
  './examples/with-restful-mongoose/packages/ui/package.json',
  './examples/with-restful-mongoose/packages/utils/package.json',
  './examples/with-restful-prisma/apps/admin/package.json',
  './examples/with-restful-prisma/apps/api/package.json',
  './examples/with-restful-prisma/apps/client/package.json',
  './examples/with-restful-prisma/packages/schemas/package.json',
  './examples/with-restful-prisma/packages/services/package.json',
  './examples/with-restful-prisma/packages/typescript-config/package.json',
  './examples/with-restful-prisma/packages/ui/package.json',
  './examples/with-restful-prisma/packages/utils/package.json'
];

const dependencyMap = new Map();

// Read all package.json files and collect dependencies
packageJsonFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    const template = filePath.split('/')[2]; // Extract template name
    const location = filePath.split('/').slice(2).join('/'); // Full location
    
    // Collect all dependencies
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    };
    
    Object.entries(allDeps).forEach(([depName, version]) => {
      if (!dependencyMap.has(depName)) {
        dependencyMap.set(depName, []);
      }
      dependencyMap.get(depName).push({
        template,
        location,
        version,
        type: packageJson.dependencies?.[depName] ? 'dependencies' : 
              packageJson.devDependencies?.[depName] ? 'devDependencies' : 'peerDependencies'
      });
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
});

// Find dependencies with version mismatches
const mismatches = [];
dependencyMap.forEach((locations, depName) => {
  const versions = [...new Set(locations.map(l => l.version))];
  if (versions.length > 1) {
    mismatches.push({
      dependency: depName,
      versions: locations
    });
  }
});

// Sort mismatches by dependency name
mismatches.sort((a, b) => a.dependency.localeCompare(b.dependency));

// Output results
console.log(`\nFound ${mismatches.length} dependencies with version mismatches:\n`);

mismatches.forEach(mismatch => {
  console.log(`\n${mismatch.dependency}:`);
  const versionGroups = {};
  mismatch.versions.forEach(v => {
    if (!versionGroups[v.version]) {
      versionGroups[v.version] = [];
    }
    versionGroups[v.version].push(v);
  });
  
  Object.entries(versionGroups).forEach(([version, locations]) => {
    console.log(`  ${version}:`);
    locations.forEach(loc => {
      console.log(`    - ${loc.location} (${loc.type})`);
    });
  });
});

// Summary
console.log(`\n\nTotal dependencies analyzed: ${dependencyMap.size}`);
console.log(`Dependencies with mismatches: ${mismatches.length}`);
console.log(`Dependencies with consistent versions: ${dependencyMap.size - mismatches.length}`);