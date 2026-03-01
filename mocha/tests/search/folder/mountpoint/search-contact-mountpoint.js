import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Search > Folder > Mountpoint > Contact Mountpoint', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountAuthToken, accountAuthToken2;
	let accountEmail, accountEmail2;
	const mountpointName = `mp_${common.getUniqueString()}`;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 (owner)
		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create account2 (grantee)
		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Create contacts in account1's Contacts folder (id=7)
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="7">
					<a n="firstName">contact1_${common.getUniqueString()}</a>
					<a n="lastName">test</a>
					<a n="email">contact1@example.com</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="7">
					<a n="firstName">contact2_${common.getUniqueString()}</a>
					<a n="lastName">test</a>
					<a n="email">contact2@example.com</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Share account1's Contacts folder with account2
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="7" op="grant">
					<grant d="${accountEmail2}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, accountAuthToken
		);

		// Create mountpoint in account2
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountpointName}" view="contact" rid="7" owner="${accountEmail}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify a mountpoint (containing contact) can be searched', async () => {
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:${mountpointName}</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest with quotes
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:"${mountpointName}"</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest with parens
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:(${mountpointName})</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify a mountpoint (containing contact) can offset and limit', async () => {
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" offset="0"  limit="25">
				<query>in:${mountpointName}</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify a mountpoint (containing contact) can be sorted by dateDesc and nameAsc', async () => {
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" sortBy="dateDesc" >
				<query>in:${mountpointName}</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" sortBy="nameAsc" >
				<query>in:${mountpointName}</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});
});
