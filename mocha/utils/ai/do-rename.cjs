const fs = require('fs');
const path = require('path');

const renames = [
    { from: 'tests/folders/bugs/bug-40759.js', to: 'tests/folders/bugs/bug40759.js' },
    { from: 'tests/folders/bugs/bug-61913.js', to: 'tests/folders/bugs/bug61913.js' },
    { from: 'tests/folders/bugs/bug-66715.js', to: 'tests/folders/bugs/bug66715.js' },
    { from: 'tests/folders/bugs/bug-85404.js', to: 'tests/folders/bugs/bug85404.js' },
    { from: 'tests/folders/bugs/bug-95572.js', to: 'tests/folders/bugs/bug95572.js' },
    { from: 'tests/folders/sharing/bugs/bug-31113.js', to: 'tests/folders/sharing/bugs/bug31113.js' },
    { from: 'tests/folders/sharing/bugs/bug-39804.js', to: 'tests/folders/sharing/bugs/bug39804.js' },
    { from: 'tests/folders/mountpoint/folder-action-request-mountpoint.js', to: 'tests/folders/mountpoint/folderactionrequest-mountpoint.js' },
    { from: 'tests/folders/sharing/bugs/bug-77298.js', to: 'tests/folders/sharing/bugs/bug77298.js' },
    { from: 'tests/folders/sharing/bugs/bug-92407.js', to: 'tests/folders/sharing/bugs/bug92407.js' },
    { from: 'tests/folders/sharing/get-effective-folder-perms-basic.js', to: 'tests/folders/sharing/geteffectivefolderpermsrequest-basic.js' },
    { from: 'tests/folders/sharing/sharing-to-admin.js', to: 'tests/folders/sharing/sharing-toadmin.js' },
    { from: 'tests/folders/sharing/sharing-to-domain-admin.js', to: 'tests/folders/sharing/sharing-todomainadmin.js' },
    { from: 'tests/folders/virtualhost/virtual-host-get-info-request.js', to: 'tests/folders/virtualhost/virtualhost-getinforequest.js' }
];

let count = 0;
for (const r of renames) {
    if (fs.existsSync(r.from)) {
        fs.renameSync(r.from, r.to);
        console.log(`Renamed: ${r.from} -> ${r.to}`);
        count++;
    } else {
        console.log(`Skipped (not found): ${r.from}`);
    }
}
console.log(`Total renamed: ${count}`);
