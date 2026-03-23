// DNS Configuration - Ensures IPv4 first
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');
const readline = require('readline');

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;

if (!GITHUB_TOKEN || !GITHUB_REPO) {
  console.error('❌ Missing GitHub credentials. Please set GITHUB_TOKEN and GITHUB_REPO in .env');
  process.exit(1);
}

const BASE_URL = `https://api.github.com/repos/${GITHUB_REPO}`;

// Create readline interface
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Ask a question and get answer
function askQuestion(question) {
  const rl = createPrompt();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Get all releases
async function getAllReleases() {
  try {
    const response = await axios.get(`${BASE_URL}/releases`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DocuSoft-Cleanup'
      }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch releases:', error.response?.data?.message || error.message);
    return [];
  }
}

// Get all tags (for cleanup after release deletion)
async function getAllTags() {
  try {
    const response = await axios.get(`${BASE_URL}/git/refs/tags`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DocuSoft-Cleanup'
      }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch tags:', error.response?.data?.message || error.message);
    return [];
  }
}

// Delete a single release
async function deleteRelease(releaseId, releaseName, tagName) {
  try {
    await axios.delete(`${BASE_URL}/releases/${releaseId}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DocuSoft-Cleanup'
      }
    });
    console.log(`   ✅ Deleted release: ${releaseName} (${tagName})`);
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to delete release: ${releaseName} (${tagName})`);
    console.log(`      Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Delete a tag
async function deleteTag(tagName, refUrl) {
  try {
    await axios.delete(`${BASE_URL}/git/refs/tags/${tagName}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DocuSoft-Cleanup'
      }
    });
    console.log(`   ✅ Deleted tag: ${tagName}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to delete tag: ${tagName}`);
    console.log(`      Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Clean up orphaned tags (tags without releases)
async function cleanupOrphanedTags(releaseTagNames) {
  console.log('\n🧹 Checking for orphaned tags...');
  
  const allTags = await getAllTags();
  const orphanedTags = allTags.filter(tag => !releaseTagNames.includes(tag.ref.replace('refs/tags/', '')));
  
  if (orphanedTags.length === 0) {
    console.log('✅ No orphaned tags found.');
    return 0;
  }
  
  console.log(`\n📋 Found ${orphanedTags.length} orphaned tags (no associated release):\n`);
  orphanedTags.forEach(tag => {
    console.log(`   - ${tag.ref.replace('refs/tags/', '')}`);
  });
  
  const answer = await askQuestion(`\n⚠️  Delete these ${orphanedTags.length} orphaned tags? (yes/no): `);
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Tag deletion cancelled.');
    return 0;
  }
  
  console.log('\n🗑️  Deleting orphaned tags...\n');
  
  let deleted = 0;
  let failed = 0;
  
  for (const tag of orphanedTags) {
    const tagName = tag.ref.replace('refs/tags/', '');
    const success = await deleteTag(tagName, tag.ref);
    if (success) {
      deleted++;
    } else {
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Orphaned Tags: ${deleted} deleted, ${failed} failed`);
  return deleted;
}

// Delete all releases and their tags
async function deleteAllReleases() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  GitHub Releases & Tags Cleanup Tool');
  console.log('='.repeat(60));
  console.log(`📦 Repository: ${GITHUB_REPO}`);
  console.log('='.repeat(60));
  
  try {
    console.log('\n📡 Fetching releases...');
    const releases = await getAllReleases();
    
    if (releases.length === 0) {
      console.log('✅ No releases found in this repository.');
      return;
    }
    
    console.log(`\n📋 Found ${releases.length} releases:\n`);
    const releaseTags = [];
    releases.forEach(release => {
      releaseTags.push(release.tag_name);
      console.log(`   - ${release.name || release.tag_name} (${release.tag_name})`);
      console.log(`     ID: ${release.id}`);
      console.log(`     Created: ${new Date(release.created_at).toLocaleDateString()}`);
      if (release.assets.length > 0) {
        console.log(`     Assets: ${release.assets.length} files`);
        release.assets.forEach(asset => {
          console.log(`        📄 ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)`);
        });
      }
      console.log('');
    });
    
    // First confirmation
    const answer = await askQuestion(`\n⚠️  Delete ALL ${releases.length} releases and their tags? (yes/no): `);
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Deletion cancelled.');
      return;
    }
    
    // Second confirmation - must match exactly
    console.log('\n⚠️  WARNING: This will delete releases AND their Git tags!');
    const secondAnswer = await askQuestion(`Type "DELETE-ALL-RELEASES-AND-TAGS" to confirm: `);
    
    if (secondAnswer !== 'DELETE-ALL-RELEASES-AND-TAGS') {
      console.log('\n❌ Deletion cancelled. Confirmation string did not match.');
      return;
    }
    
    console.log('\n🗑️  Deleting releases...\n');
    
    let deletedReleases = 0;
    let failedReleases = 0;
    
    for (const release of releases) {
      const success = await deleteRelease(release.id, release.name || release.tag_name, release.tag_name);
      if (success) {
        deletedReleases++;
      } else {
        failedReleases++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🗑️  Deleting associated tags...\n');
    
    let deletedTags = 0;
    let failedTags = 0;
    
    for (const tagName of releaseTags) {
      const success = await deleteTag(tagName, `refs/tags/${tagName}`);
      if (success) {
        deletedTags++;
      } else {
        failedTags++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Releases: ✅ ${deletedReleases} deleted | ❌ ${failedReleases} failed`);
    console.log(`Tags:     ✅ ${deletedTags} deleted | ❌ ${failedTags} failed`);
    console.log('='.repeat(60));
    console.log('\n✅ GitHub releases and tags cleanup completed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Delete specific releases by number (and their tags)
async function deleteSpecificReleases() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  GitHub Releases Cleanup Tool (Selective)');
  console.log('='.repeat(60));
  console.log(`📦 Repository: ${GITHUB_REPO}`);
  console.log('='.repeat(60));
  
  try {
    const releases = await getAllReleases();
    
    if (releases.length === 0) {
      console.log('✅ No releases found.');
      return;
    }
    
    console.log('\n📋 Available releases:\n');
    releases.forEach((release, index) => {
      console.log(`   ${index + 1}. ${release.name || release.tag_name} (${release.tag_name})`);
      console.log(`      Created: ${new Date(release.created_at).toLocaleDateString()}`);
      console.log(`      Assets: ${release.assets.length} files`);
    });
    
    const answer = await askQuestion('\nEnter release numbers to delete (comma-separated, e.g., 1,3,5) or "all" to delete all: ');
    
    let toDelete = [];
    let tagsToDelete = [];
    
    if (answer.toLowerCase() === 'all') {
      toDelete = releases;
      tagsToDelete = releases.map(r => r.tag_name);
    } else {
      const indices = answer.split(',').map(n => parseInt(n.trim()) - 1);
      toDelete = indices.filter(i => i >= 0 && i < releases.length).map(i => releases[i]);
      tagsToDelete = toDelete.map(r => r.tag_name);
    }
    
    if (toDelete.length === 0) {
      console.log('\n❌ No releases selected for deletion.');
      return;
    }
    
    console.log(`\n⚠️  You selected ${toDelete.length} releases to delete:\n`);
    toDelete.forEach(release => {
      console.log(`   - ${release.name || release.tag_name} (tag: ${release.tag_name})`);
    });
    
    const confirm = await askQuestion('\nConfirm deletion of releases AND their tags? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Deletion cancelled.');
      return;
    }
    
    console.log('\n🗑️  Deleting releases...\n');
    
    let deletedReleases = 0;
    let failedReleases = 0;
    
    for (const release of toDelete) {
      const success = await deleteRelease(release.id, release.name || release.tag_name, release.tag_name);
      if (success) {
        deletedReleases++;
      } else {
        failedReleases++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🗑️  Deleting associated tags...\n');
    
    let deletedTags = 0;
    let failedTags = 0;
    
    for (const tagName of tagsToDelete) {
      const success = await deleteTag(tagName, `refs/tags/${tagName}`);
      if (success) {
        deletedTags++;
      } else {
        failedTags++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Releases: ✅ ${deletedReleases} deleted | ❌ ${failedReleases} failed`);
    console.log(`Tags:     ✅ ${deletedTags} deleted | ❌ ${failedTags} failed`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Delete releases older than X days (and their tags)
async function deleteOldReleases() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  Delete Old GitHub Releases');
  console.log('='.repeat(60));
  console.log(`📦 Repository: ${GITHUB_REPO}`);
  console.log('='.repeat(60));
  
  try {
    const daysAnswer = await askQuestion('Delete releases older than how many days? (default: 30): ');
    const daysOld = parseInt(daysAnswer) || 30;
    
    const releases = await getAllReleases();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const oldReleases = releases.filter(release => {
      const createdAt = new Date(release.created_at);
      return createdAt < cutoffDate;
    });
    
    if (oldReleases.length === 0) {
      console.log(`\n✅ No releases older than ${daysOld} days found.`);
      return;
    }
    
    console.log(`\n📋 Found ${oldReleases.length} releases older than ${daysOld} days:\n`);
    oldReleases.forEach(release => {
      const date = new Date(release.created_at).toLocaleDateString();
      console.log(`   - ${release.name || release.tag_name} (created: ${date})`);
      if (release.assets.length > 0) {
        console.log(`     Assets: ${release.assets.length} files`);
      }
    });
    
    const answer = await askQuestion(`\n⚠️  Delete these ${oldReleases.length} releases AND their tags? (yes/no): `);
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Deletion cancelled.');
      return;
    }
    
    console.log('\n🗑️  Deleting releases...\n');
    
    let deletedReleases = 0;
    let failedReleases = 0;
    
    for (const release of oldReleases) {
      const success = await deleteRelease(release.id, release.name || release.tag_name, release.tag_name);
      if (success) {
        deletedReleases++;
      } else {
        failedReleases++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🗑️  Deleting associated tags...\n');
    
    let deletedTags = 0;
    let failedTags = 0;
    
    for (const release of oldReleases) {
      const success = await deleteTag(release.tag_name, `refs/tags/${release.tag_name}`);
      if (success) {
        deletedTags++;
      } else {
        failedTags++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Releases: ✅ ${deletedReleases} deleted | ❌ ${failedReleases} failed`);
    console.log(`Tags:     ✅ ${deletedTags} deleted | ❌ ${failedTags} failed`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main menu
async function showMenu() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  GitHub Releases & Tags Cleanup Tool');
  console.log('='.repeat(60));
  console.log('1. Delete ALL releases and their tags');
  console.log('2. Delete specific releases (by number) and their tags');
  console.log('3. Delete releases older than X days and their tags');
  console.log('4. Clean up orphaned tags only (tags without releases)');
  console.log('5. Exit');
  console.log('='.repeat(60));
  
  const answer = await askQuestion('\nSelect option (1-5): ');
  return answer;
}

// Clean up orphaned tags only
async function cleanOrphanedTags() {
  console.log('\n' + '='.repeat(60));
  console.log('🧹 Clean Up Orphaned Tags');
  console.log('='.repeat(60));
  console.log(`📦 Repository: ${GITHUB_REPO}`);
  console.log('='.repeat(60));
  
  try {
    const releases = await getAllReleases();
    const releaseTagNames = releases.map(r => r.tag_name);
    await cleanupOrphanedTags(releaseTagNames);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  GitHub Releases & Tags Cleanup Tool');
  console.log('='.repeat(60));
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Repository: ${GITHUB_REPO}`);
  console.log('='.repeat(60));
  
  console.log('\n⚠️  WARNING: This will permanently delete releases AND Git tags from GitHub!');
  console.log('⚠️  Deleted items cannot be recovered.\n');
  
  const choice = await showMenu();
  
  if (choice === '1') {
    await deleteAllReleases();
  } else if (choice === '2') {
    await deleteSpecificReleases();
  } else if (choice === '3') {
    await deleteOldReleases();
  } else if (choice === '4') {
    await cleanOrphanedTags();
  } else if (choice === '5') {
    console.log('\n👋 Exiting...');
  } else {
    console.log('\n❌ Invalid option');
  }
  
  process.exit(0);
}

// Run the script
main();