import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Basic > Combo Tag', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const emailSubject = `emailSubject_${common.getUniqueString()}`;
	const mail1 = { name: `mail1_${common.getUniqueString()}`, subject: `mail1_${common.getUniqueString()}` };
	const mail2 = { name: `mail2_${common.getUniqueString()}`, subject: `mail2_${common.getUniqueString()}` };
	const mail3 = { name: `mail3_${common.getUniqueString()}`, subject: `mail3_${common.getUniqueString()}` };
	const mail4 = { name: `mail4_${common.getUniqueString()}`, subject: `mail4_${common.getUniqueString()}` };
	const mail5 = { name: `mail5_${common.getUniqueString()}`, subject: `mail5_${common.getUniqueString()}` };
	const mail6 = { name: `mail6_${common.getUniqueString()}`, subject: `mail6_${common.getUniqueString()}` };
	const mail7 = { name: `mail7_${common.getUniqueString()}`, subject: `mail7_${common.getUniqueString()}` };
	const mail8 = { name: `mail8_${common.getUniqueString()}`, subject: `mail8_${common.getUniqueString()}` };
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
	const tag = {};
	const tag1 = { name: `tag1_${common.getUniqueString()}` };
	const tag2 = { name: `tag2_${common.getUniqueString()}` };

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
	it('Functional | Create setup for the Search', async () => {
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

		// GetTagRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<GetTagRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');

		// CreateTagRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tag1.name}" color="0"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.CreateTagResponse, 'CreateTagResponse should exist');
		tag.id1 = res11.CreateTagResponse?.tag?.[0].id;

		// CreateTagRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tag2.name}" color="1"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.CreateTagResponse, 'CreateTagResponse should exist');
		tag.id2 = res12.CreateTagResponse?.tag?.[0].id;

		// MsgActionRequest
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id1}" op="tag" tag="${tag.id1}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res13.Fault, 'Response should not be a Fault');
		assert.exists(res13.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res14 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id2}" op="tag" tag="${tag.id2}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res14.Fault, 'Response should not be a Fault');
		assert.exists(res14.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res15 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id3}" op="tag" tag="${tag.id1}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res15.Fault, 'Response should not be a Fault');
		assert.exists(res15.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res16 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id4}" op="tag" tag="${tag.id2}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res16.Fault, 'Response should not be a Fault');
		assert.exists(res16.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res17 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id5}" op="tag" tag="${tag.id1}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res17.Fault, 'Response should not be a Fault');
		assert.exists(res17.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res18 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id6}" op="tag" tag="${tag.id2}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res18.Fault, 'Response should not be a Fault');
		assert.exists(res18.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res19 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id7}" op="tag" tag="${tag.id1}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res19.Fault, 'Response should not be a Fault');
		assert.exists(res19.MsgActionResponse, 'MsgActionResponse should exist');

		// MsgActionRequest
		const res20 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
				<action id = "${message.id8}" op="tag" tag="${tag.id2}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res20.Fault, 'Response should not be a Fault');
		assert.exists(res20.MsgActionResponse, 'MsgActionResponse should exist');
	});


	it('Functional | Verify the results are correct for query using from - and tag -', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) tag:(tagtext16.01) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) tag:("tagtext16.01" OR "tagtext16.02") </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(foo) tag:("tagtext16.01" OR "tagtext16.02") tag:"tagtext16.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using To - and tag -', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> (to:(foo) OR cc:(foo)) tag:"tagtext16.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> (to:(foo) OR cc:(foo)) tag:("tagtext16.01" OR "tagtext16.02")</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> (to:(foo) OR cc:(foo)) tag:("tagtext16.01" OR "tagtext16.02") tag:"tagtext16.02" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using Subject - and tag - 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${emailSubject}) tag:"tagtext16.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${emailSubject}) tag:("tagtext16.01" OR "tagtext16.02")</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${emailSubject}) tag:("tagtext16.01" OR "tagtext16.02") tag:"tagtext16.02"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify the results are correct for query using Subject - and tag - 2', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(attachment) tag:"tagtext16.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(attachment) tag:("tagtext16.01" OR "tagtext16.02") </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(attachment) tag:("tagtext16.01" OR "tagtext16.02") tag:"tagtext16.01" </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});
});
