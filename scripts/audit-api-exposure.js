#!/usr/bin/env node

/**
 * API Exposure Audit Script
 *
 * This script scans the codebase and reports:
 * - What's exported from feature directories
 * - What's exposed in public APIs
 * - What might be missing from public APIs
 */

const fs = require('fs');
const path = require('path');

const CORE_SRC = path.join(__dirname, '../packages/core/src');
const ANGULAR_PUBLIC_API = path.join(__dirname, '../packages/angular/src/public-api.ts');

// Features to audit
const FEATURE_DIRS = [
  'features/sorting',
  'features/filtering',
  'features/selection',
  'features/columns',
  'features/column-groups',
  'features/column-resize',
  'features/column-drag',
  'features/viewport',
  'features/copy-paste',
  'features/undo-redo',
  'features/autofill',
  'features/row-height',
  'features/export',
  'features/loading',
  'features/pagination',
  'features/formulas',
  'features/hit-testing',
  'features/query',
  'plugins',
  'rendering/renderers',
  'editing',
  'data',
  'grid',
  'keyboard',
  'a11y',
  'selection',
  'theming',
  'datetime-core',
  'reactive',
  'events',
  'touch',
  'i18n',
  'utils',
];

/**
 * Extract exports from a TypeScript file
 */
function extractExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports = [];

    // Match: export { X, Y } from 'z'
    const reExportPattern = /export\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = reExportPattern.exec(content)) !== null) {
      const items = match[1].split(',').map(s => s.trim());
      items.forEach(item => {
        const renamed = item.match(/(\w+)\s+as\s+(\w+)/);
        exports.push({
          name: renamed ? renamed[2] : item,
          original: renamed ? renamed[1] : item,
          type: 're-export',
          from: match[2]
        });
      });
    }

    // Match: export class/function/const/interface/type
    const directExportPattern = /export\s+(class|function|const|interface|type|enum)\s+(\w+)/g;
    while ((match = directExportPattern.exec(content)) !== null) {
      exports.push({
        name: match[2],
        type: match[1],
        direct: true
      });
    }

    // Match: export type { X, Y }
    const typeExportPattern = /export\s+type\s*\{\s*([^}]+)\s*\}/g;
    while ((match = typeExportPattern.exec(content)) !== null) {
      const items = match[1].split(',').map(s => s.trim());
      items.forEach(item => {
        exports.push({
          name: item,
          type: 'type',
          direct: true
        });
      });
    }

    return exports;
  } catch (err) {
    return [];
  }
}

/**
 * Check if a directory has an index.ts
 */
function hasIndex(dirPath) {
  const indexPath = path.join(dirPath, 'index.ts');
  return fs.existsSync(indexPath);
}

/**
 * Get all TypeScript files in a directory (non-recursive)
 */
function getTsFiles(dirPath) {
  try {
    return fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== 'index.ts')
      .map(f => path.join(dirPath, f));
  } catch (err) {
    return [];
  }
}

/**
 * Main audit function
 */
function auditApiExposure() {
  console.log('🔍 ZenGrid API Exposure Audit\n');
  console.log('=' .repeat(80));

  const report = {
    totalFeatures: 0,
    withIndex: 0,
    withoutIndex: 0,
    exports: {},
    missingFromPublicApi: []
  };

  FEATURE_DIRS.forEach(featureDir => {
    const fullPath = path.join(CORE_SRC, featureDir);

    if (!fs.existsSync(fullPath)) {
      return;
    }

    report.totalFeatures++;

    console.log(`\n📁 ${featureDir}`);

    // Check for index.ts
    if (hasIndex(fullPath)) {
      report.withIndex++;
      const indexPath = path.join(fullPath, 'index.ts');
      const exports = extractExports(indexPath);

      console.log(`   ✅ Has index.ts (${exports.length} exports)`);

      if (exports.length > 0) {
        report.exports[featureDir] = exports;
        console.log(`   📤 Exports:`);
        exports.slice(0, 5).forEach(exp => {
          const typeLabel = exp.type === 're-export' ? `→ ${exp.from}` : exp.type;
          console.log(`      - ${exp.name} (${typeLabel})`);
        });
        if (exports.length > 5) {
          console.log(`      ... and ${exports.length - 5} more`);
        }
      } else {
        console.log(`   ⚠️  Empty index.ts`);
      }
    } else {
      report.withoutIndex++;
      console.log(`   ❌ No index.ts`);

      // Check for TypeScript files
      const tsFiles = getTsFiles(fullPath);
      if (tsFiles.length > 0) {
        console.log(`   📄 Found ${tsFiles.length} .ts files`);
        tsFiles.slice(0, 3).forEach(file => {
          console.log(`      - ${path.basename(file)}`);
        });
        if (tsFiles.length > 3) {
          console.log(`      ... and ${tsFiles.length - 3} more`);
        }
      }
    }
  });

  // Check Angular public API
  console.log('\n' + '='.repeat(80));
  console.log('\n📦 Angular Public API Exports\n');

  if (fs.existsSync(ANGULAR_PUBLIC_API)) {
    const publicExports = extractExports(ANGULAR_PUBLIC_API);
    const coreExports = publicExports.filter(e => e.from === '@zengrid/core');

    console.log(`Total exports from @zengrid/core: ${coreExports.length}\n`);

    // Group by type
    const byType = {};
    coreExports.forEach(exp => {
      if (!byType[exp.type]) byType[exp.type] = [];
      byType[exp.type].push(exp.name);
    });

    Object.entries(byType).forEach(([type, names]) => {
      console.log(`${type}: ${names.length}`);
      names.slice(0, 5).forEach(name => console.log(`   - ${name}`));
      if (names.length > 5) {
        console.log(`   ... and ${names.length - 5} more`);
      }
      console.log('');
    });
  }

  // Summary
  console.log('='.repeat(80));
  console.log('\n📊 Summary\n');
  console.log(`Total Features Scanned: ${report.totalFeatures}`);
  console.log(`With index.ts: ${report.withIndex} (${Math.round(report.withIndex / report.totalFeatures * 100)}%)`);
  console.log(`Without index.ts: ${report.withoutIndex} (${Math.round(report.withoutIndex / report.totalFeatures * 100)}%)`);

  const totalExports = Object.values(report.exports).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Total Exports Found: ${totalExports}`);

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Audit Complete!\n');
  console.log('Next steps:');
  console.log('1. Review features without index.ts');
  console.log('2. Check if exports should be in public API');
  console.log('3. Add documentation to exported APIs');
  console.log('4. Update FEATURES_AUDIT.md with findings\n');
}

// Run audit
auditApiExposure();
