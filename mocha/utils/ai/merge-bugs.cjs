const fs = require('fs');
const b1Path = 'tests/folders/sharing/bugs/bug-23590.js';
const b2Path = 'tests/folders/sharing/bugs/bug-30049.js';
const dstPath = 'tests/folders/sharing/bugs/bugs.js';

let b1Content = fs.readFileSync(b1Path, 'utf8');
let b2Content = fs.readFileSync(b2Path, 'utf8');

const inner1 = b1Content.match(/describe\s*\([^\{]*\{([\s\S]*)\}\s*\);\s*$/);
const inner2 = b2Content.match(/describe\s*\([^\{]*\{([\s\S]*)\}\s*\);\s*$/);

const newContent = `import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Bugs', function () {
${inner1[1]}
${inner2[1]}
});
`;

fs.writeFileSync(dstPath, newContent);
fs.unlinkSync(b1Path);
fs.unlinkSync(b2Path);
