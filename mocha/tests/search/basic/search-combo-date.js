import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Basic > Combo Date', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const content = { name: `content_${common.getUniqueString()}`, subject: `content_${common.getUniqueString()}`, from: accountEmail, content: `content_${common.getUniqueString()}`, value: `content_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `content_id`, toString() { return this.name; } };
	const copy = { name: `copy_${common.getUniqueString()}`, subject: `copy_${common.getUniqueString()}`, from: accountEmail, content: `copy_${common.getUniqueString()}`, value: `copy_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `copy_id`, toString() { return this.name; } };
	const defaultlocale = { name: `defaultlocale_${common.getUniqueString()}`, subject: `defaultlocale_${common.getUniqueString()}`, from: accountEmail, content: `defaultlocale_${common.getUniqueString()}`, value: `defaultlocale_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `defaultlocale_id`, toString() { return this.name; } };
	const origination = { name: `origination_${common.getUniqueString()}`, subject: `origination_${common.getUniqueString()}`, from: accountEmail, content: `origination_${common.getUniqueString()}`, value: `origination_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `origination_id`, toString() { return this.name; } };
	const subject = { name: `subject_${common.getUniqueString()}`, subject: `subject_${common.getUniqueString()}`, from: accountEmail, content: `subject_${common.getUniqueString()}`, value: `subject_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `subject_id`, toString() { return this.name; } };
	const to = { name: `to_${common.getUniqueString()}`, subject: `to_${common.getUniqueString()}`, from: accountEmail, content: `to_${common.getUniqueString()}`, value: `to_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `to_id`, toString() { return this.name; } };

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
Subject: test message
MIME-Version: 1.0

Test content</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Login as the appropriate test account', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});


	it('Functional | Verify the results are correct for query using to - and date - , before - , after - (Bug: 2344)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>to:(${to.user}) before:5/5/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');


		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>to:(${to.user}) before:5/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>to:(${to.user}) before:4/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>to:(${to.user}) date:5/15/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');


		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>to:(${to.user}) date:5/14/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>to:(${to.user}) before:5/16/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03A', 'su should match');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03B', 'su should match');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>to:(${to.user}) after:5/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');


		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>to:(${to.user}) after:5/31/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>to:(${to.user}) after:6/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Functional | Verify the results are correct for query using from - and date - , before - , after - 1 (Bug: 2344)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>from:(${origination.user}) before:5/5/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');


		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>from:(${origination.user}) before:5/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>from:(${origination.user}) before:4/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>from:(${origination.user}) date:5/15/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');


		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>from:(${origination.user}) date:5/14/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>from:(${origination.user}) before:5/16/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03E', 'su should match');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03D', 'su should match');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>from:(${origination.user}) after:5/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');


		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>from:(${origination.user}) after:5/31/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>from:(${origination.user}) after:6/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Functional | Verify the results are correct for query using from - and date - , before - , after - 2 (Bug: 2344)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>cc:(${copy.user}) before:5/5/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');


		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>cc:(${copy.user}) before:5/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>cc:(${copy.user}) before:4/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			  <tz id="${defaultlocale.timezone}"/>
			   <query>cc:(${copy.user}) date:5/15/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');


		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>cc:(${copy.user}) date:5/14/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>cc:(${copy.user}) before:5/16/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03Q', 'su should match');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03P', 'su should match');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>cc:(${copy.user}) after:5/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');


		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>cc:(${copy.user}) after:5/31/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>cc:(${copy.user}) after:6/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Functional | Verify the results are correct for query using subject - and date - , before - , after - (Bug: 2344)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>subject:(${subject.text}) before:5/5/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /.*email03G.*/, 'su should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /.*email03G.*/, 'su should match pattern');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>subject:(${subject.text}) before:5/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>subject:(${subject.text}) before:4/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>subject:(${subject.text}) date:5/15/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.match(String(res4.SearchResponse?.m?.[0].su), /.*email03H.*/, 'su should match pattern');
		assert.match(String(res4.SearchResponse?.m?.[0].su), /.*email03H.*/, 'su should match pattern');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>subject:(${subject.text}) date:5/14/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>subject:(${subject.text}) before:5/16/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.match(String(res6.SearchResponse?.m?.[0].su), /.*email03G.*/, 'su should match pattern');
		assert.match(String(res6.SearchResponse?.m?.[0].su), /.*email03H.*/, 'su should match pattern');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>subject:(${subject.text}) after:5/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.match(String(res7.SearchResponse?.m?.[0].su), /.*email03I.*/, 'su should match pattern');
		assert.match(String(res7.SearchResponse?.m?.[0].su), /.*email03I.*/, 'su should match pattern');
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>subject:(${subject.text}) after:5/31/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>subject:(${subject.text}) after:6/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Functional | Verify the results are correct for query using content - and date - , before - , after - (Bug: 2344)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) before:5/5/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');


		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) before:5/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) before:4/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) date:5/15/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');


		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) date:5/14/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) before:5/16/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03J', 'su should match');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03K', 'su should match');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) after:5/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');


		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) after:5/31/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) after:6/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Functional | Verify the results are correct for query using content - , in the attachment, and date - , before - , after - (Bug: 2344)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) before:5/5/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');


		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) before:5/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) before:4/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) date:5/15/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');


		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) date:5/14/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) before:5/16/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03N', 'su should match');
		assert.equal(res6.SearchResponse?.m?.[0].su, 'email03M', 'su should match');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) after:5/30/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');


		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) after:5/31/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>content:(${content.text}) after:6/1/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});
});
