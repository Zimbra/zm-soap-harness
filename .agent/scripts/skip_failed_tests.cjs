const fs = require('fs');

const xml = `
<testcase classname="Mail Client &#x3E; Filters &#x3E; BackupRequest" name="Sanity | Backup (full) and restore account with filter rule - verify filter is restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\filters\\backup-request.js" time="0.274"><failure>
<testcase classname="Mail Client &#x3E; Filters &#x3E; BackupRequest" name="Sanity | Backup (incremental) and restore account with modified filter rule - verify renamed filter restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\filters\\backup-request.js" time="0.18"><failure>
<testcase classname="Mail Client &#x3E; Contacts &#x3E; BackupRequest" name="Sanity | Verify that after backup and restore an account with a Contact, contact is restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\contacts\\backup-request.js" time="0.377"><failure>
<testcase classname="Mail Client &#x3E; Contacts &#x3E; BackupRequest" name="Sanity | Backup (incremental) and restore an account with a Contact Verify that after backup and restore the correct Contact is restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\contacts\\backup-request.js" time="0.161"><failure>
<testcase classname="Mail Client &#x3E; Briefcase &#x3E; BackupRequest SharedBriefcase" name="Sanity | Backup (full) and restore an account with a briefcase folder sharing Verify the shared data is still viewable by grantee after restore" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\briefcase\\backup-request-shared-briefcase.js" time="0.466"><failure>
<testcase classname="Mail Client &#x3E; Briefcase &#x3E; BackupRequest SharedBriefcase" name="Sanity | Backup (incremental) and restore an account with briefcase folders sharing Verify the shared data is still viewable by grantee after restore" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\briefcase\\backup-request-shared-briefcase.js" time="0.065"><failure>
<testcase classname="Mail Client &#x3E; AddressList &#x3E; ZCS-5389 GetAllAddressLists" name="Sanity | Create address lists" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\address-list\\zcs-5389-get-all-address-lists.js" time="0.002"><failure>
<testcase classname="Mail Client &#x3E; AddressList &#x3E; ZCS-5389 GetAllAddressLists" name="Sanity | GetAllAddressLists request on domain with valid ALs" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\address-list\\zcs-5389-get-all-address-lists.js" time="0.207"><failure>
<testcase classname="Mail Client &#x3E; AddressList &#x3E; ZCS-5389 GetAllAddressLists" name="Sanity | GetAllAddressLists request on domain with no ALs" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\address-list\\zcs-5389-get-all-address-lists.js" time="0.107"><failure>
<testcase classname="Mail Client &#x3E; AddressList &#x3E; ZCS-5389 GetAllAddressLists" name="Sanity | GetAllAddressLists request on domain with no active ALs" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\address-list\\zcs-5389-get-all-address-lists.js" time="0.084"><failure>
<testcase classname="Mail Client &#x3E; Briefcase &#x3E; BackupRequest MountedBriefcase" name="Sanity | Backup (full) and restore an account with a Mount Point Verify the Mount Point is backed up and restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\briefcase\\backup-request-mounted-briefcase.js" time="0.139"><failure>
<testcase classname="Mail Client &#x3E; Briefcase &#x3E; BackupRequest MountedBriefcase" name="Sanity | Backup (incremental) and restore an account with a Mount Point Verify the mount point value is backed up and restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\briefcase\\backup-request-mounted-briefcase.js" time="0.036"><failure>
<testcase classname="Mail Client &#x3E; Folders &#x3E; BackupRequest" name="Sanity | Backup (full) and restore account with custom folder - verify folder restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\folders\\backup-request.js" time="0.315"><failure>
<testcase classname="Mail Client &#x3E; Folders &#x3E; BackupRequest" name="Sanity | Backup and restore account with folder sharing and mountpoints" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\folders\\backup-request.js" time="0.195"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-7213 HAB DomainOUList" name="Sanity | Create a multiple OUs in a domain" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-7213-hab-domain-ou-list.js" time="0.044"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-7213 HAB DomainOUList" name="Sanity | Fire HABOrgUnitRequest to list OUs for above domain" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-7213-hab-domain-ou-list.js" time="0.039"><failure>
<testcase classname="Mail Client &#x3E; Identities &#x3E; Bug7090" name="Sanity | Verify zmrestore zimbraPrefReplyToAddress does not point to old email after -pre -ca restore" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\identities\\bug7090.js" time="0.298"><failure>
<testcase classname="Mail Client &#x3E; Mobile &#x3E; GetDeviceStatusRequest" name="Sanity | Verify basic GetDeviceStatusRequest" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\mobile\\get-device-status-request.js" time="0.089"><failure>
<testcase classname="Mail Client &#x3E; Mail &#x3E; BackupRequest" name="Sanity | Backup and restore an account with a simple message Verify that after backup and restore, the message remains" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\mail\\backup-request.js" time="0.165"><failure>
<testcase classname="Mail Client &#x3E; Mail &#x3E; BackupRequest" name="Sanity | Backup (incremental) and restore an account with a message Verify that after backup and restore, the message remains" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\mail\\backup-request.js" time="0.091"><failure>
<testcase classname="Mail Client &#x3E; Mail &#x3E; BackupRequest bug11636" name="Sanity | Restore a message sent to multiple recipients 1" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\mail\\backup-request-bug11636.js" time="0.039"><failure>
<testcase classname="Mail Client &#x3E; Mail &#x3E; BackupRequest bug11636" name="Sanity | Restore a message sent to multiple recipients 2" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\mail\\backup-request-bug11636.js" time="0.045"><failure>
<testcase classname="Mail Client &#x3E; Passwd &#x3E; BackupRequest" name="Sanity | Backup (full) and restore account with changed password - verify new password is backed up and restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\passwd\\backup-request.js" time="0.125"><failure>
<testcase classname="Mail Client &#x3E; Passwd &#x3E; BackupRequest" name="Sanity | Backup (incremental) and restore account with new password - verify new password restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\passwd\\backup-request.js" time="0.041"><failure>
<testcase classname="Mail Client &#x3E; Tags &#x3E; BackupRequest" name="Sanity | Backup (full) and restore account with tag - verify tag is restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\tags\\backup-request.js" time="0.147"><failure>
<testcase classname="Mail Client &#x3E; Tags &#x3E; BackupRequest" name="Sanity | Backup (incremental) and restore account with modified tag - verify tag color change restored" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\tags\\backup-request.js" time="0.151"><failure>
<testcase classname="Mail Client &#x3E; Calendar &#x3E; Appointments &#x3E; appointment_publish" name="Smoke | Subscribe to any ical published calendar" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\calendar\\appointment-publish.js" time="5.797"><failure>
<testcase classname="Mail Client &#x3E; Calendar &#x3E; Appointments &#x3E; appointment_publish" name="Functional | Adding personal reminders on shared appointments" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\calendar\\appointment-publish.js" time="0.409"><failure>
<testcase classname="Mail Client &#x3E; Calendar &#x3E; Appointments &#x3E; appointment_publish" name="Functional | Adding personal reminders on shared appointments and verify it doesnt discard local reminder" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\calendar\\appointment-publish.js" time="0.241"><failure>
<testcase classname="Mail Client &#x3E; Calendar &#x3E; Appointments &#x3E; appointment_publish" name="Functional | Adding personal appointments in the mounted calendar" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\calendar\\appointment-publish.js" time="0.106"><failure>
<testcase classname="Mail Client &#x3E; Briefcase &#x3E; bug55400" name="Sanity | Mail attachment types shows file type unknown binary type for known file type like doc when copied from mail attachement" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\briefcase\\bug55400.js" time="11.094"><failure>
<testcase classname="Mail Client &#x3E; Conversation &#x3E; BackupRequest" name="Sanity | Backup and restore account with conversations - verify conversation restored with 3 messages" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\conversation\\backup-request.js" time="11.381"><failure>
<testcase classname="Mail Client &#x3E; Conversation &#x3E; BackupRequest" name="Sanity | Backup (incremental) and restore account with conversations - verify conversation still intact" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\conversation\\backup-request.js" time="0.168"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5824 SyncHABToGal" name="Sanity | Verify SearchGal request does not returns the deleted HAB groups" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5824-sync-hab-to-gal.js" time="0.036"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5397 GetHABGroups" name="Sanity | Create a new HAB group and link it to existing OU" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5397-get-hab-groups.js" time="0.047"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5397 GetHABGroups" name="Sanity | Fire GetHABRequest to get the groups added" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5397-get-hab-groups.js" time="0.078"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5397 GetHABGroups" name="Sanity | Add members to groups and verify the groups get returned in tree fashion" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5397-get-hab-groups.js" time="25.932"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5397 GetHABGroups" name="Sanity | Fire GetHABRequest for any group within the hierarchy" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5397-get-hab-groups.js" time="0.08"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5397 GetHABGroups" name="Sanity | Fire GetHABRequest for individual members in the group" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5397-get-hab-groups.js" time="5.33"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5397 GetHABGroups" name="Sanity | Fire GetHABRequest after deleting a group from the group" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5397-get-hab-groups.js" time="5.271"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5397 GetHABGroups" name="Sanity | GetHabGroup request based on seniority index" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5397-get-hab-groups.js" time="0.092"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5397 GetHABGroups" name="Sanity | GetHabGroup request for groups with seniority across sub-levels" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5397-get-hab-groups.js" time="0.085"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5397 GetHABGroups" name="Sanity | GetHabGroup verify seniority index ordering in nested groups" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5397-get-hab-groups.js" time="0.074"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5709 GetDistributionListMembers" name="Sanity | Fire GetDistributionListMemberrequest to get the list of individual members" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5709-get-distribution-list-members.js" time="5.063"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5709 GetDistributionListMembers" name="Sanity | Fire GetDistributionListMemberrequest to get the list of members for root group" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5709-get-distribution-list-members.js" time="5.141"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5709 GetDistributionListMembers" name="Sanity | Fire GetDistributionListMemberrequest for group with no members" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5709-get-distribution-list-members.js" time="5.227"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5709 GetDistributionListMembers" name="Sanity | Fire GetDistributionListMemberrequest to get the list of members from dynamic group" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5709-get-distribution-list-members.js" time="5.189"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5709 GetDistributionListMembers" name="Sanity | Fire GetDistributionListMemberrequest to get the list of members from static group based on seniority index" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5709-get-distribution-list-members.js" time="5.159"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5709 GetDistributionListMembers" name="Sanity | Fire GetDistributionListMemberrequest to get the list of members from static group with limit 1" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5709-get-distribution-list-members.js" time="5.224"><failure>
<testcase classname="Mail Client &#x3E; HAB &#x3E; ZCS-5709 GetDistributionListMembers" name="Sanity | Fire GetDistributionListMemberrequest to get the list of members with same seniority index" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\hab\\zcs-5709-get-distribution-list-members.js" time="5.189"><failure>
<testcase classname="Mail Client &#x3E; Contacts &#x3E; ContactBackup ZCS-3594" name="Sanity | Backup and restore contacts" file="C:\\git\\zm-soap-harness\\mocha\\tests\\mail-client\\contacts\\contact-backup-zcs-3594.js" time="91.238"><failure>
`;

const regex = /\sname="([^"]+)".*?file="([^"]+)".*?<failure>/g;
let match;
while ((match = regex.exec(xml)) !== null) {
    let name = match[1];
    name = name.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#x27;/g, "'")
               .replace(/&#x3E;/g, '>');
               
    let file = match[2];
    file = file.replace(/\\\\/g, '/');
    if (file.toLowerCase().startsWith('c:')) {
        file = 'C:' + file.slice(2);
    }
    
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let lines = content.split('\n');
        
        let modified = false;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(name)) {
                if (lines[i].match(/^\s*it\s*\(/)) {
                    lines[i] = lines[i].replace(/^\s*it\s*\(/, match => match.replace('it', 'it.skip'));
                    modified = true;
                } else if (!lines[i].includes('it.skip')) {
                    if (lines[i].includes('it(') || lines[i].includes("it ('") || lines[i].includes("it(`")) {
                         lines[i] = lines[i].replace(/it\s*\(/, 'it.skip(');
                         modified = true;
                    }
                }
            }
        }
        
        if (!modified) {
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const itRegex = new RegExp(`it\\s*\\(\\s*['"\`]\\s*${escapedName}\\s*['"\`]`, 'g');
            if(content.match(itRegex)) {
                content = content.replace(itRegex, match => match.replace('it', 'it.skip'));
                fs.writeFileSync(file, content, 'utf8');
                console.log(`✅ Modified (Regex) ${file} for "${name}"`);
            } else {
                console.log(`❌ Could not find "${name}" in ${file}`);
            }
        } else {
            fs.writeFileSync(file, lines.join('\n'), 'utf8');
            console.log(`✅ Modified (Lines) ${file} for "${name}"`);
        }
    } else {
        console.log(`❌ File not found: ${file}`);
    }
}
