import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Folder > Folder', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const folder = { name: `folder_${common.getUniqueString()}`, subject: `folder_${common.getUniqueString()}`, from: accountEmail, content: `folder_${common.getUniqueString()}`, value: `folder_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder_id`, inbox: '2', trash: '3', spam: '4', sent: '5', drafts: '6', toString() { return this.name; } };
	const folder1 = { name: `folder1_${common.getUniqueString()}`, subject: `folder1_${common.getUniqueString()}`, from: accountEmail, content: `folder1_${common.getUniqueString()}`, value: `folder1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder1_id`, toString() { return this.name; } };
	const folder2 = { name: `folder2_${common.getUniqueString()}`, subject: `folder2_${common.getUniqueString()}`, from: accountEmail, content: `folder2_${common.getUniqueString()}`, value: `folder2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder2_id`, toString() { return this.name; } };
	const folder3 = { name: `folder3_${common.getUniqueString()}`, subject: `folder3_${common.getUniqueString()}`, from: accountEmail, content: `folder3_${common.getUniqueString()}`, value: `folder3_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder3_id`, toString() { return this.name; } };
	const folder4 = { name: `folder4_${common.getUniqueString()}`, subject: `folder4_${common.getUniqueString()}`, from: accountEmail, content: `folder4_${common.getUniqueString()}`, value: `folder4_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder4_id`, toString() { return this.name; } };
	const folder5 = { name: `folder5_${common.getUniqueString()}`, subject: `folder5_${common.getUniqueString()}`, from: accountEmail, content: `folder5_${common.getUniqueString()}`, value: `folder5_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder5_id`, toString() { return this.name; } };
	const folder6 = { name: `folder6_${common.getUniqueString()}`, subject: `folder6_${common.getUniqueString()}`, from: accountEmail, content: `folder6_${common.getUniqueString()}`, value: `folder6_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder6_id`, toString() { return this.name; } };
	const globals = { name: 'globals', inbox: 'inbox', sent: 'sent', trash: 'trash', spam: 'junk', drafts: 'drafts', calendar: 'calendar', contacts: 'contacts', true: 'TRUE', false: 'FALSE', toString() { return this.name; } };
	const mail1 = { name: `mail1_${common.getUniqueString()}`, subject: `mail1_${common.getUniqueString()}`, from: accountEmail, content: `mail1_${common.getUniqueString()}`, value: `mail1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail1_id`, toString() { return this.name; } };
	const mail10 = { name: `mail10_${common.getUniqueString()}`, subject: `mail10_${common.getUniqueString()}`, from: accountEmail, content: `mail10_${common.getUniqueString()}`, value: `mail10_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail10_id`, toString() { return this.name; } };
	const mail11 = { name: `mail11_${common.getUniqueString()}`, subject: `mail11_${common.getUniqueString()}`, from: accountEmail, content: `mail11_${common.getUniqueString()}`, value: `mail11_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail11_id`, toString() { return this.name; } };
	const mail12 = { name: `mail12_${common.getUniqueString()}`, subject: `mail12_${common.getUniqueString()}`, from: accountEmail, content: `mail12_${common.getUniqueString()}`, value: `mail12_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail12_id`, toString() { return this.name; } };
	const mail2 = { name: `mail2_${common.getUniqueString()}`, subject: `mail2_${common.getUniqueString()}`, from: accountEmail, content: `mail2_${common.getUniqueString()}`, value: `mail2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail2_id`, toString() { return this.name; } };
	const mail3 = { name: `mail3_${common.getUniqueString()}`, subject: `mail3_${common.getUniqueString()}`, from: accountEmail, content: `mail3_${common.getUniqueString()}`, value: `mail3_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail3_id`, toString() { return this.name; } };
	const mail4 = { name: `mail4_${common.getUniqueString()}`, subject: `mail4_${common.getUniqueString()}`, from: accountEmail, content: `mail4_${common.getUniqueString()}`, value: `mail4_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail4_id`, toString() { return this.name; } };
	const mail5 = { name: `mail5_${common.getUniqueString()}`, subject: `mail5_${common.getUniqueString()}`, from: accountEmail, content: `mail5_${common.getUniqueString()}`, value: `mail5_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail5_id`, toString() { return this.name; } };
	const mail6 = { name: `mail6_${common.getUniqueString()}`, subject: `mail6_${common.getUniqueString()}`, from: accountEmail, content: `mail6_${common.getUniqueString()}`, value: `mail6_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail6_id`, toString() { return this.name; } };
	const mail7 = { name: `mail7_${common.getUniqueString()}`, subject: `mail7_${common.getUniqueString()}`, from: accountEmail, content: `mail7_${common.getUniqueString()}`, value: `mail7_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail7_id`, toString() { return this.name; } };
	const mail8 = { name: `mail8_${common.getUniqueString()}`, subject: `mail8_${common.getUniqueString()}`, from: accountEmail, content: `mail8_${common.getUniqueString()}`, value: `mail8_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail8_id`, toString() { return this.name; } };
	const mail9 = { name: `mail9_${common.getUniqueString()}`, subject: `mail9_${common.getUniqueString()}`, from: accountEmail, content: `mail9_${common.getUniqueString()}`, value: `mail9_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail9_id`, toString() { return this.name; } };
	const message = { name: `message_${common.getUniqueString()}`, subject: `message_${common.getUniqueString()}`, from: accountEmail, content: `message_${common.getUniqueString()}`, value: `message_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `message_id`, toString() { return this.name; } };
	const op = { name: 'op', move: 'move', flag: 'flag', unflag: '!flag', read: 'read', unread: '!read', update: 'update', delete: 'delete', trash: 'trash', toString() { return this.name; } };
	const root = { name: 'root', id: '1', toString() { return this.name; } };

	before(async function () {
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Create setup for the Search Request (Bug: 2395)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// Account
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">${globals.true}</pref>
				<pref name="zimbraPrefIncludeTrashInSearch">${globals.true}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.ModifyPrefsResponse, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail1.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id1 = res3.SearchResponse?.m?.[0].id;
		assert.exists(res3.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail2.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id2 = res4.SearchResponse?.m?.[0].id;
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail3.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id3 = res5.SearchResponse?.m?.[0].id;
		assert.exists(res5.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail4.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id4 = res6.SearchResponse?.m?.[0].id;
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail5.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id5 = res7.SearchResponse?.m?.[0].id;
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail6.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id6 = res8.SearchResponse?.m?.[0].id;
		assert.exists(res8.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail7.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id7 = res9.SearchResponse?.m?.[0].id;
		assert.exists(res9.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail8.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id8 = res10.SearchResponse?.m?.[0].id;
		assert.exists(res10.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail9.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id9 = res11.SearchResponse?.m?.[0].id;
		assert.exists(res11.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail10.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id10 = res12.SearchResponse?.m?.[0].id;
		assert.exists(res12.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail11.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res13.Fault, 'Response should not be a Fault');
		assert.exists(res13.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id11 = res13.SearchResponse?.m?.[0].id;
		assert.exists(res13.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res14 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail12.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res14.Fault, 'Response should not be a Fault');
		assert.exists(res14.SearchResponse?.m?.[0].su, 'su should match pattern');
		message.id12 = res14.SearchResponse?.m?.[0].id;
		assert.exists(res14.SearchResponse?.m, 'Response element should exist');

		// GetFolderRequest
		const res15 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res15.Fault, 'Response should not be a Fault');

		// CreateFolderRequest
		const res16 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1.name}" l="${root.id}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res16.Fault, 'Response should not be a Fault');
		folder1.id = res16.CreateFolderResponse?.folder?.[0].id;

		// CreateFolderRequest
		const res17 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder2.name}" l="${folder.inbox}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res17.Fault, 'Response should not be a Fault');
		folder2.id = res17.CreateFolderResponse?.folder?.[0].id;

		// CreateFolderRequest
		const res18 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder3.name}" l="${folder.trash}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res18.Fault, 'Response should not be a Fault');
		folder3.id = res18.CreateFolderResponse?.folder?.[0].id;

		// CreateFolderRequest
		const res19 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder4.name}" l="${folder.sent}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res19.Fault, 'Response should not be a Fault');
		folder4.id = res19.CreateFolderResponse?.folder?.[0].id;

		// CreateFolderRequest
		const res20 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder5.name}" l="${folder1.id}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res20.Fault, 'Response should not be a Fault');
		folder5.id = res20.CreateFolderResponse?.folder?.[0].id;

		// CreateFolderRequest
		const res21 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder6.name}" l="${root.id}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res21.Fault, 'Response should not be a Fault');
		folder6.id = res21.CreateFolderResponse?.folder?.[0].id;

		// MsgActionRequest
		const res22 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id1}" op="${op.move}" l="${folder.inbox}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res22.Fault, 'Response should not be a Fault');
		assert.exists(res22.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res23 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id2}" op="${op.move}" l="${folder2.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res23.Fault, 'Response should not be a Fault');
		assert.exists(res23.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res24 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id3}" op="${op.move}" l="${folder3.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res24.Fault, 'Response should not be a Fault');
		assert.exists(res24.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res25 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id4}" op="${op.move}" l="${folder4.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res25.Fault, 'Response should not be a Fault');
		assert.exists(res25.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res26 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id5}" op="${op.move}" l="${folder5.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res26.Fault, 'Response should not be a Fault');
		assert.exists(res26.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res27 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id6}" op="${op.move}" l="${folder.trash}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res27.Fault, 'Response should not be a Fault');
		assert.exists(res27.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res28 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id7}" op="${op.move}" l="${folder.spam}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res28.Fault, 'Response should not be a Fault');
		assert.exists(res28.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res29 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id8}" op="${op.move}" l="${folder6.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res29.Fault, 'Response should not be a Fault');
		assert.exists(res29.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res30 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id9}" op="${op.move}" l="${folder.sent}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res30.Fault, 'Response should not be a Fault');
		assert.exists(res30.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res31 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id10}" op="${op.move}" l="${folder1.id}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res31.Fault, 'Response should not be a Fault');
		assert.exists(res31.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res32 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id11}" op="${op.move}" l="${folder.inbox}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res32.Fault, 'Response should not be a Fault');
		assert.exists(res32.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res33 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id12}" op="${op.move}" l="${folder.trash}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res33.Fault, 'Response should not be a Fault');
		assert.exists(res33.MsgActionResponse, 'MsgActionResponse should exist');
	});


	it('Functional | Verify that a search for query in - DEFAULTFOLDER is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${globals.inbox} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${globals.sent} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${globals.trash} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${globals.spam} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query in - CUSTOMFOLDER is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${folder1.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${folder6.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query in - DEFAULTFOLDER, CUSTOMFOLDER is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${globals.inbox}/${folder2.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${globals.trash}/${folder3.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${globals.sent}/${folder4.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query in - CUSTOMFOLDER, CUSTOMFOLDER is successful', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${folder1.name}/${folder5.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query in - (DEFAULTFOLDER, CUSTOMFOLDER OR DEFAULTFOLDER)is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:(${globals.inbox}/${folder2.name} OR ${globals.inbox})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:(${globals.trash}/${folder3.name} OR ${globals.trash})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:(${globals.sent}/${folder4.name} OR ${globals.sent})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:(${globals.sent}/${folder4.name} OR ${globals.inbox})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:(${globals.inbox}/${folder2.name} OR ${globals.trash})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query in - (CUSTOMFOLDER, CUSTOMFOLDER OR CUSTOMFOLDER)is successful', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:(${folder1.name}/${folder5.name} OR ${folder1.name})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query in - (DEFAULTFOLDER OR CUSTOMFOLDER) is successful', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:(${globals.inbox} OR ${folder1.name})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query in - (FOLDER, CUSTOMFOLDER OR FOLDER, CUSTOMFOLDER) where FOLDER can be DEFAULT or CUSTOM is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:(${globals.inbox}/${folder2.name} OR ${globals.trash}/${folder3.name})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:(${globals.sent}/${folder4.name} OR ${folder1.name}/${folder5.name})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for conversation for query in - DEFAULTFOLDER is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${globals.inbox} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${globals.sent} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${globals.trash} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${globals.spam} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for conversation for query in - CUSTOMFOLDER is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${folder1.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${folder6.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for conversation for query in - DEFAULTFOLDER, CUSTOMFOLDER is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${globals.inbox}/${folder2.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${globals.trash}/${folder3.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${globals.sent}/${folder4.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for conversation for query in - CUSTOMFOLDER, CUSTOMFOLDER is successful', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${folder1.name}/${folder5.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for conversation for query in - (DEFAULTFOLDER, CUSTOMFOLDER OR DEFAULTFOLDER)is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:(${globals.inbox}/${folder2.name} OR ${globals.inbox})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:(${globals.trash}/${folder3.name} OR ${globals.trash})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:(${globals.sent}/${folder4.name} OR ${globals.sent})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:(${globals.sent}/${folder4.name} OR ${globals.inbox})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:(${globals.inbox}/${folder2.name} OR ${globals.trash})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for conversation for query in - (CUSTOMFOLDER, CUSTOMFOLDER OR CUSTOMFOLDER)is successful', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:(${folder1.name}/${folder5.name} OR ${folder1.name})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for conversation for query in - (DEFAULTFOLDER OR CUSTOMFOLDER) is successful', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:(${globals.inbox} OR ${folder1.name})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for conversation for query in - (FOLDER, CUSTOMFOLDER OR FOLDER, CUSTOMFOLDER) where FOLDER can be DEFAULT or CUSTOM is successful', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:(${globals.inbox}/${folder2.name} OR ${globals.trash}/${folder3.name})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:(${globals.sent}/${folder4.name} OR ${folder1.name}/${folder5.name})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that the messages in trash folder is not included in search results if zimbraPrefIncludeTrashInSearch FALSE', async () => {
		// Account
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeTrashInSearch">${globals.false}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.ModifyPrefsResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail3.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Functional | Verify that the conversation in trash folder is not included in search results if zimbraPrefIncludeTrashInSearch FALSE', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> subject:(${mail3.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		// Verify empty result set
	});


	it('Functional | Verify that the messages in spam folder is not included in search results if zimbraPrefIncludeSpamInSearch FALSE', async () => {
		// Account
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">${globals.false}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.ModifyPrefsResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail7.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Functional | Verify that the conversation in spam folder is not included in search results if zimbraPrefIncludeSpamInSearch FALSE', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> subject:(${mail7.subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		// Verify empty result set
	});


	it('Functional | Verify that a search for query in:DEFAULT_FOLDER /CUSTOM_FOLDER i.e. with spaces is successful. Spaces after default folder should get stripped. (Bug: 12689)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> in:${globals.inbox}   /${folder2.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> in:${globals.inbox}    /${folder2.name} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'Response element should exist');
	});
});
