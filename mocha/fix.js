const fs = require('fs');
const file = 'c:/git/zm-soap-harness/mocha/tests/search/basic/search-combo-folders.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const content = \{\};/, "const content = { text: 'Content' };");

content = content.replace(/foldertext13\.01\/foldertext13\.05/g, '${folder1.name}/${folder5.name}');
content = content.replace(/foldertext13\.01/g, '${folder1.name}');
content = content.replace(/foldertext13\.02/g, '${folder2.name}');
content = content.replace(/foldertext13\.03/g, '${folder3.name}');
content = content.replace(/foldertext13\.04/g, '${folder4.name}');
content = content.replace(/foldertext13\.06/g, '${folder6.name}');

content = content.replace(/email13A/g, '${mail1.subject}');
content = content.replace(/email13B/g, '${mail2.subject}');
content = content.replace(/email13C/g, '${mail3.subject}');
content = content.replace(/email13D/g, '${mail4.subject}');
content = content.replace(/email13E/g, '${mail5.subject}');
content = content.replace(/email13H/g, '${mail8.subject}');
content = content.replace(/email13I/g, '${mail9.subject}');
content = content.replace(/email13J/g, '${mail10.subject}');
content = content.replace(/email13L/g, '${mail12.subject}');

fs.writeFileSync(file, content);
