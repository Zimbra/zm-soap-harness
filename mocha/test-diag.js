import soap from './framework/backend/soap-client.js';
import config from './conf/config.js';
import common from './framework/core/common.js';

async function test() {
    try {
        const adminAuth = await soap.getAdminAuthToken();
        const name = 'test.' + common.getUniqueString() + '@' + config.testDomain;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth
        );
        const authRes = await soap.makeSOAPEnvelopeAccount(
            `<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
        );
        const token = Array.isArray(authRes.AuthResponse.authToken)
            ? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
            : authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', token
        );
        const root = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
        const subfolders = Array.isArray(root.folder) ? root.folder : [root.folder];
        const briefcase = subfolders.find(f => f && f.name === 'Briefcase');
        const bfId = briefcase.id;

        const docName = 'doc.' + common.getUniqueString() + '.txt';

        // v1
        const s1 = await soap.makeSOAPEnvelopeAccount(
            `<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${bfId}">
					<content>Version 1</content>
				</doc>
			</SaveDocumentRequest>`, token
        );
        const doc = Array.isArray(s1.SaveDocumentResponse.doc)
            ? s1.SaveDocumentResponse.doc[0] : s1.SaveDocumentResponse.doc;

        // v2
        await soap.makeSOAPEnvelopeAccount(
            `<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc ver="1" l="${bfId}" id="${doc.id}" desc="rev 2.0">
					<content>Version 2</content>
				</doc>
			</SaveDocumentRequest>`, token
        );

        // v3
        await soap.makeSOAPEnvelopeAccount(
            `<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc ver="2" l="${bfId}" id="${doc.id}" desc="rev 3.0">
					<content>Version 3</content>
				</doc>
			</SaveDocumentRequest>`, token
        );

        // List all revisions  
        const listRes = await soap.makeSOAPEnvelopeAccount(
            `<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${doc.id}"/>
			</ListDocumentRevisionsRequest>`, token
        );
        console.log('FULL ListDocumentRevisions response:');
        console.log(JSON.stringify(listRes, null, 2).substring(0, 1500));

        // Also try with count parameter
        const listRes2 = await soap.makeSOAPEnvelopeAccount(
            `<ListDocumentRevisionsRequest xmlns="urn:zimbraMail" count="10">
				<doc id="${doc.id}"/>
			</ListDocumentRevisionsRequest>`, token
        );
        console.log('\nWith count=10:');
        console.log(JSON.stringify(listRes2, null, 2).substring(0, 1500));

        // PurgeRevision with invalid version
        const purgeRes = await soap.makeSOAPEnvelopeAccount(
            `<PurgeRevisionRequest xmlns="urn:zimbraMail">
				<revision id="${doc.id}" ver="999" includeOlderRevisions="false"/>
			</PurgeRevisionRequest>`, token
        );
        console.log('\nPurge invalid ver:', JSON.stringify(purgeRes).substring(0, 300));

    } catch (e) {
        console.log('ERROR:', e.message);
    }
}
test();
