import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Basic > Combo Folders', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const content = {};
	const folder = {};
	const folder1 = { name: `folder1_${common.getUniqueString()}`, id: `folder1_id` };
	const folder2 = { name: `folder2_${common.getUniqueString()}`, id: `folder2_id` };
	const folder3 = { name: `folder3_${common.getUniqueString()}`, id: `folder3_id` };
	const folder4 = { name: `folder4_${common.getUniqueString()}`, id: `folder4_id` };
	const folder5 = { name: `folder5_${common.getUniqueString()}`, id: `folder5_id` };
	const folder6 = { name: `folder6_${common.getUniqueString()}`, id: `folder6_id` };
	const mail1 = { name: `mail1_${common.getUniqueString()}`, subject: `mail1_${common.getUniqueString()}` };
	const mail10 = { name: `mail10_${common.getUniqueString()}`, subject: `mail10_${common.getUniqueString()}` };
	const mail11 = { name: `mail11_${common.getUniqueString()}`, subject: `mail11_${common.getUniqueString()}` };
	const mail12 = { name: `mail12_${common.getUniqueString()}`, subject: `mail12_${common.getUniqueString()}` };
	const mail2 = { name: `mail2_${common.getUniqueString()}`, subject: `mail2_${common.getUniqueString()}` };
	const mail3 = { name: `mail3_${common.getUniqueString()}`, subject: `mail3_${common.getUniqueString()}` };
	const mail4 = { name: `mail4_${common.getUniqueString()}`, subject: `mail4_${common.getUniqueString()}` };
	const mail5 = { name: `mail5_${common.getUniqueString()}`, subject: `mail5_${common.getUniqueString()}` };
	const mail6 = { name: `mail6_${common.getUniqueString()}`, subject: `mail6_${common.getUniqueString()}` };
	const mail7 = { name: `mail7_${common.getUniqueString()}`, subject: `mail7_${common.getUniqueString()}` };
	const mail8 = { name: `mail8_${common.getUniqueString()}`, subject: `mail8_${common.getUniqueString()}` };
	const mail9 = { name: `mail9_${common.getUniqueString()}`, subject: `mail9_${common.getUniqueString()}` };
	const message = {};
	const op = {
		name: 'op',
		move: 'move',
		flag: 'flag',
		unflag: '!flag',
		read: 'read',
		unread: '!read',
		update: 'update',
		delete: 'delete',
		trash: 'trash',
		toString() { return this.name; }
	};
	const root = { name: 'root', id: '1', toString() { return this.name; } };

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Inject test messages
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail1.subject}
MIME-Version: 1.0
Content for ${mail1.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail10.subject}
MIME-Version: 1.0
Content for ${mail10.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail11.subject}
MIME-Version: 1.0
Content for ${mail11.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail12.subject}
MIME-Version: 1.0
Content for ${mail12.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail2.subject}
MIME-Version: 1.0
Content for ${mail2.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail3.subject}
MIME-Version: 1.0
Content for ${mail3.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail4.subject}
MIME-Version: 1.0
Content for ${mail4.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail5.subject}
MIME-Version: 1.0
Content for ${mail5.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail6.subject}
MIME-Version: 1.0
Content for ${mail6.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail7.subject}
MIME-Version: 1.0
Content for ${mail7.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail8.subject}
MIME-Version: 1.0
Content for ${mail8.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail9.subject}
MIME-Version: 1.0
Content for ${mail9.name}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Create setup for the Search Request', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail1.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id1 = res2.SearchResponse?.m?.[0].id;
		assert.exists(res2.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail2.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id2 = res3.SearchResponse?.m?.[0].id;
		assert.exists(res3.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail3.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id3 = res4.SearchResponse?.m?.[0].id;
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail4.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id4 = res5.SearchResponse?.m?.[0].id;
		assert.exists(res5.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail5.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id5 = res6.SearchResponse?.m?.[0].id;
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail6.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id6 = res7.SearchResponse?.m?.[0].id;
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail7.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id7 = res8.SearchResponse?.m?.[0].id;
		assert.exists(res8.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail8.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id8 = res9.SearchResponse?.m?.[0].id;
		assert.exists(res9.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail9.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id9 = res10.SearchResponse?.m?.[0].id;
		assert.exists(res10.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail10.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id10 = res11.SearchResponse?.m?.[0].id;
		assert.exists(res11.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail11.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id11 = res12.SearchResponse?.m?.[0].id;
		assert.exists(res12.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail12.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res13.Fault, 'Response should not be a Fault');
		assert.exists(res13.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id12 = res13.SearchResponse?.m?.[0].id;
		assert.exists(res13.SearchResponse?.m, 'Response element should exist');

		// GetFolderRequest
		const res14 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res14.Fault, 'Response should not be a Fault');

		// CreateFolderRequest
		const res15 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1.name}" l="${root.id}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res15.Fault, 'Response should not be a Fault');
		const folder1_id = res15.CreateFolderResponse?.folder?.[0].id;
		folder1.id = folder1_id;

		// CreateFolderRequest
		const res16 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder2.name}" l="${folder.inbox}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res16.Fault, 'Response should not be a Fault');
		const folder2_id = res16.CreateFolderResponse?.folder?.[0].id;
		folder2.id = folder2_id;

		// CreateFolderRequest
		const res17 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder3.name}" l="${folder.trash}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res17.Fault, 'Response should not be a Fault');
		const folder3_id = res17.CreateFolderResponse?.folder?.[0].id;
		folder3.id = folder3_id;

		// CreateFolderRequest
		const res18 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder4.name}" l="${folder.sent}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res18.Fault, 'Response should not be a Fault');
		const folder4_id = res18.CreateFolderResponse?.folder?.[0].id;
		folder4.id = folder4_id;

		// CreateFolderRequest
		const res19 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder5.name}" l="${folder1.id}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res19.Fault, 'Response should not be a Fault');
		const folder5_id = res19.CreateFolderResponse?.folder?.[0].id;
		folder5.id = folder5_id;

		// CreateFolderRequest
		const res20 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder6.name}" l="${root.id}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res20.Fault, 'Response should not be a Fault');
		const folder6_id = res20.CreateFolderResponse?.folder?.[0].id;
		folder6.id = folder6_id;

		// MsgActionRequest
		const res21 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id1}" op="${op.move}" l="${folder.inbox}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res21.Fault, 'Response should not be a Fault');
		assert.exists(res21.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res22 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id2}" op="${op.move}" l="${folder2.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res22.Fault, 'Response should not be a Fault');
		assert.exists(res22.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res23 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id3}" op="${op.move}" l="${folder3.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res23.Fault, 'Response should not be a Fault');
		assert.exists(res23.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res24 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id4}" op="${op.move}" l="${folder4.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res24.Fault, 'Response should not be a Fault');
		assert.exists(res24.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res25 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id5}" op="${op.move}" l="${folder5.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res25.Fault, 'Response should not be a Fault');
		assert.exists(res25.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res26 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id6}" op="${op.move}" l="${folder.trash}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res26.Fault, 'Response should not be a Fault');
		assert.exists(res26.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res27 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id7}" op="${op.move}" l="${folder.spam}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res27.Fault, 'Response should not be a Fault');
		assert.exists(res27.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res28 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id8}" op="${op.move}" l="${folder6.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res28.Fault, 'Response should not be a Fault');
		assert.exists(res28.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res29 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id9}" op="${op.move}" l="${folder.sent}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res29.Fault, 'Response should not be a Fault');
		assert.exists(res29.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res30 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id10}" op="${op.move}" l="${folder1.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res30.Fault, 'Response should not be a Fault');
		assert.exists(res30.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res31 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id11}" op="${op.move}" l="${folder.inbox}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res31.Fault, 'Response should not be a Fault');
		assert.exists(res31.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res32 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id12}" op="${op.move}" l="${folder.trash}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res32.Fault, 'Response should not be a Fault');
		assert.exists(res32.MsgActionResponse, 'MsgActionResponse should exist');
	});


	it('Functional | Verify the results are correct for query using cc - and all folders 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using to - and all folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using cc - and all folders 2', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using subject - and all folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13A) in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13A) in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13I) in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13L) in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13A) in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13A) in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13J) in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13B) in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13C) in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13D) in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13E) in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13H) in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using content - and all folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Functional | Verify the results are correct for query using from - OR any folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) OR in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using to - OR any folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> to:(foo) OR in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using cc - OR any folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> cc:(foo) OR in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using subject - OR all folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13A) OR in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13A) OR in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13I) OR in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13L) OR in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13A) OR in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13A) OR in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13J) OR in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13B) OR in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13C) OR in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13D) OR in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13E) OR in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(email13H) OR in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using content - OR all folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:inbox </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:drafts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:sent </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:calendar </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:contacts </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:"foldertext13.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:"Inbox/foldertext13.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:"Trash/foldertext13.03"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text})  OR in:"Sent/foldertext13.04" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:"foldertext13.01/foldertext13.05" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(${content.text}) OR in:"foldertext13.06" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});
});
