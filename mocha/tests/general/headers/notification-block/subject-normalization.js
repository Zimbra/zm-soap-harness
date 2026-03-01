import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('General > Headers > Notification Block > Subject Normalization', function () {
	this.timeout(120 * 1000);
	let accountAuthToken;
	let accountEmail;
	let inboxId;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();
		accountEmail = `account${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get inbox folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		inboxId = inbox.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Exclude mailing list prefixes during subject normalization', async () => {
		const subject = `subject${common.getUniqueString()}`;
		const content1 = `content${common.getUniqueString()}`;
		const content2 = `content${common.getUniqueString()}`;

		// Inject the message
		const addRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>From: foo@example.com
To: mailinglist@example.com
Subject: RE: [mailing-list] ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

${content1}

</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(addRes1.Fault, 'First AddMsgRequest should not fault');

		// Inject the message
		const addRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>From: foo@example.com
To: mailinglist@example.com
Subject: RE: [mailing-list] ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

${content2}

</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(addRes2.Fault, 'Second AddMsgRequest should not fault');

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:"${subject}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find messages');
	});
});
