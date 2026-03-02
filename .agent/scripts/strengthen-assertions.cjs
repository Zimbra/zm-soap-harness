/**
 * Bulk-strengthen common weak assertion patterns across all test files.
 *
 * Usage: node .agent/scripts/strengthen-assertions.cjs [dir]
 *   dir defaults to mocha/tests
 *
 * Replaces shallow assert.exists(res.XxxResponse, '...') patterns with
 * deeper internal element assertions matching XML t:select parity.
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '..', '..', 'mocha', 'tests');

// Find all JS files recursively
function findJsFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findJsFiles(fullPath));
        } else if (entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

const files = findJsFiles(targetDir);

let totalChanges = 0;
const changedFiles = [];

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let fileChanges = 0;

    // Pattern 1: assert.exists(VARNAME.SendMsgResponse, 'SendMsgResponse should exist');
    const sendMsgPattern = /(\t+)assert\.exists\((\w+)\.SendMsgResponse,\s*'SendMsgResponse should exist'\);/g;
    content = content.replace(sendMsgPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const sentMsg = Array.isArray(${varName}.SendMsgResponse.m)\n` +
            `${indent}\t? ${varName}.SendMsgResponse.m[0] : ${varName}.SendMsgResponse.m;\n` +
            `${indent}assert.exists(sentMsg, 'SendMsgResponse should contain m');\n` +
            `${indent}assert.isString(sentMsg.id, 'Sent message should have an id');`;
    });

    // Pattern 2: assert.exists(VARNAME.SearchResponse, 'SearchResponse should exist');
    const searchResPattern = /(\t+)assert\.exists\((\w+)\.SearchResponse,\s*'SearchResponse should exist'\);/g;
    content = content.replace(searchResPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}assert.exists(${varName}.SearchResponse.m || ${varName}.SearchResponse.c,\n` +
            `${indent}\t'SearchResponse should contain results');`;
    });

    // Pattern 3: assert.exists(VARNAME.MsgActionResponse, 'MsgActionResponse should exist');
    const msgActionPattern = /(\t+)assert\.exists\((\w+)\.MsgActionResponse,\s*'MsgActionResponse should exist'\);/g;
    content = content.replace(msgActionPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const msgAction = Array.isArray(${varName}.MsgActionResponse.action)\n` +
            `${indent}\t? ${varName}.MsgActionResponse.action[0] : ${varName}.MsgActionResponse.action;\n` +
            `${indent}assert.exists(msgAction, 'MsgActionResponse should contain action');`;
    });

    // Pattern 4: assert.exists(VARNAME.ItemActionResponse, 'ItemActionResponse should exist');
    const itemActionPattern = /(\t+)assert\.exists\((\w+)\.ItemActionResponse,\s*'ItemActionResponse should exist'\);/g;
    content = content.replace(itemActionPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const itemAction = Array.isArray(${varName}.ItemActionResponse.action)\n` +
            `${indent}\t? ${varName}.ItemActionResponse.action[0] : ${varName}.ItemActionResponse.action;\n` +
            `${indent}assert.exists(itemAction, 'ItemActionResponse should contain action');`;
    });

    // Pattern 5: assert.exists(VARNAME.GetMsgResponse, 'GetMsgResponse should exist');
    const getMsgPattern = /(\t+)assert\.exists\((\w+)\.GetMsgResponse,\s*'GetMsgResponse should exist'\);/g;
    content = content.replace(getMsgPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const getMsg = Array.isArray(${varName}.GetMsgResponse.m)\n` +
            `${indent}\t? ${varName}.GetMsgResponse.m[0] : ${varName}.GetMsgResponse.m;\n` +
            `${indent}assert.exists(getMsg, 'GetMsgResponse should contain m');`;
    });

    // Pattern 6: assert.exists(VARNAME.FolderActionResponse, 'FolderActionResponse should exist');
    const folderActionPattern = /(\t+)assert\.exists\((\w+)\.FolderActionResponse,\s*'FolderActionResponse should exist'\);/g;
    content = content.replace(folderActionPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const folderAction = Array.isArray(${varName}.FolderActionResponse.action)\n` +
            `${indent}\t? ${varName}.FolderActionResponse.action[0] : ${varName}.FolderActionResponse.action;\n` +
            `${indent}assert.exists(folderAction, 'FolderActionResponse should contain action');`;
    });

    // Pattern 7: assert.exists(VARNAME.ConvActionResponse, 'ConvActionResponse should exist');
    const convActionPattern = /(\t+)assert\.exists\((\w+)\.ConvActionResponse,\s*'ConvActionResponse should exist'\);/g;
    content = content.replace(convActionPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const convAction = Array.isArray(${varName}.ConvActionResponse.action)\n` +
            `${indent}\t? ${varName}.ConvActionResponse.action[0] : ${varName}.ConvActionResponse.action;\n` +
            `${indent}assert.exists(convAction, 'ConvActionResponse should contain action');`;
    });

    // Pattern 8: assert.exists(VARNAME.AddMsgResponse, 'AddMsgResponse should exist');
    const addMsgPattern = /(\t+)assert\.exists\((\w+)\.AddMsgResponse,\s*'AddMsgResponse should exist'\);/g;
    content = content.replace(addMsgPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const addedMsg = Array.isArray(${varName}.AddMsgResponse.m)\n` +
            `${indent}\t? ${varName}.AddMsgResponse.m[0] : ${varName}.AddMsgResponse.m;\n` +
            `${indent}assert.exists(addedMsg, 'AddMsgResponse should contain m');`;
    });

    // Pattern 9: assert.exists(VARNAME.SaveDraftResponse, 'SaveDraftResponse should exist');
    const saveDraftPattern = /(\t+)assert\.exists\((\w+)\.SaveDraftResponse,\s*'SaveDraftResponse should exist'\);/g;
    content = content.replace(saveDraftPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const draftMsg = Array.isArray(${varName}.SaveDraftResponse.m)\n` +
            `${indent}\t? ${varName}.SaveDraftResponse.m[0] : ${varName}.SaveDraftResponse.m;\n` +
            `${indent}assert.exists(draftMsg, 'SaveDraftResponse should contain m');`;
    });

    // Pattern 10: assert.exists(VARNAME.CreateTagResponse, 'CreateTagResponse should exist');
    const createTagPattern = /(\t+)assert\.exists\((\w+)\.CreateTagResponse,\s*'CreateTagResponse should exist'\);/g;
    content = content.replace(createTagPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const createdTag = Array.isArray(${varName}.CreateTagResponse.tag)\n` +
            `${indent}\t? ${varName}.CreateTagResponse.tag[0] : ${varName}.CreateTagResponse.tag;\n` +
            `${indent}assert.exists(createdTag, 'CreateTagResponse should contain tag');`;
    });

    // Pattern 11: assert.exists(VARNAME.CreateFolderResponse, 'CreateFolderResponse should exist');
    const createFolderPattern = /(\t+)assert\.exists\((\w+)\.CreateFolderResponse,\s*'CreateFolderResponse should exist'\);/g;
    content = content.replace(createFolderPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}const createdFolder = Array.isArray(${varName}.CreateFolderResponse.folder)\n` +
            `${indent}\t? ${varName}.CreateFolderResponse.folder[0] : ${varName}.CreateFolderResponse.folder;\n` +
            `${indent}assert.exists(createdFolder, 'CreateFolderResponse should contain folder');`;
    });

    // Pattern 12: assert.exists(VARNAME.GetFolderResponse, 'GetFolderResponse should exist');
    const getFolderPattern = /(\t+)assert\.exists\((\w+)\.GetFolderResponse,\s*'GetFolderResponse should exist'\);/g;
    content = content.replace(getFolderPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}assert.exists(${varName}.GetFolderResponse.folder,\n` +
            `${indent}\t'GetFolderResponse should contain folder');`;
    });

    // Pattern 13: assert.exists(VARNAME.ModifyAccountResponse, 'ModifyAccountResponse should exist');
    const modifyAcctPattern = /(\t+)assert\.exists\((\w+)\.ModifyAccountResponse,\s*'ModifyAccountResponse should exist'\);/g;
    content = content.replace(modifyAcctPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}assert.exists(${varName}.ModifyAccountResponse.account,\n` +
            `${indent}\t'ModifyAccountResponse should contain account');`;
    });

    // Pattern 14: assert.exists(VARNAME.GetConvResponse, 'GetConvResponse should exist');
    const getConvPattern = /(\t+)assert\.exists\((\w+)\.GetConvResponse,\s*'GetConvResponse should exist'\);/g;
    content = content.replace(getConvPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}assert.exists(${varName}.GetConvResponse.c,\n` +
            `${indent}\t'GetConvResponse should contain c');`;
    });

    // Pattern 15: assert.exists(VARNAME.GetInfoResponse, 'GetInfoResponse should exist');
    const getInfoPattern = /(\t+)assert\.exists\((\w+)\.GetInfoResponse,\s*'GetInfoResponse should exist'\);/g;
    content = content.replace(getInfoPattern, (match, indent, varName) => {
        fileChanges++;
        return `${indent}assert.exists(${varName}.GetInfoResponse.name || ${varName}.GetInfoResponse.id,\n` +
            `${indent}\t'GetInfoResponse should contain identity data');`;
    });

    if (fileChanges > 0) {
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles.push({ file: path.relative(targetDir, filePath), changes: fileChanges });
        totalChanges += fileChanges;
    }
}

console.log(`\nScanned ${files.length} files in ${path.relative(process.cwd(), targetDir)}`);
console.log(`Total changes: ${totalChanges} across ${changedFiles.length} files\n`);
changedFiles.forEach(f => console.log(`  ${f.changes} changes in ${f.file}`));
