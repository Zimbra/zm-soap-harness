import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > Tags > Tag Contacts', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Search for a tagged contact', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@${config.testDomain}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Send contact action request
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>tag:"${tagName}"</query>
			</SearchRequest>`, accountToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Regression | Tag a deleted contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@${config.testDomain}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Send contact action request
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="delete"/>
			</ContactActionRequest>`, accountToken
		);

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Send contact action request
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);

		// Verify response
		assert.exists(actionRes.Fault, 'Tag deleted contact should be a Fault');
	});


	it('Regression | Tag a contact with invalid tag values', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@${config.testDomain}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const invalidTags = ['       ', '', '~!@#%', 'some text', '0', '1234567890', '12.34'];
		for (const tagVal of invalidTags) {

			// Send contact action request
			const res = await soap.makeSOAPEnvelopeAccount(
				`<ContactActionRequest xmlns="urn:zimbraMail">
					<action id="${cn.id}" op="tag" tag="${tagVal}"/>
				</ContactActionRequest>`, accountToken, false
			);

			// Verify response
			assert.exists(res.Fault, `tag="${tagVal}" should be a Fault`);
		}
	});


	it('Functional | Tag more than one contact at a time', async () => {
		const c1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@${config.testDomain}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn1 = Array.isArray(c1.CreateContactResponse.cn)
			? c1.CreateContactResponse.cn[0] : c1.CreateContactResponse.cn;
		const c2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@${config.testDomain}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn2 = Array.isArray(c2.CreateContactResponse.cn)
			? c2.CreateContactResponse.cn[0] : c2.CreateContactResponse.cn;

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Send contact action request
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn1.id},${cn2.id}" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);

		// Verify response
		assert.notExists(actionRes.Fault, 'Tag multiple contacts should not be a Fault');
	});


	it('Regression | Tag invalid contact id values', async () => {
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		const invalidIds = ['       ', '', '~!@#%', 'some text', '0', '1234567890', '12.34'];
		for (const id of invalidIds) {

			// Send contact action request
			const res = await soap.makeSOAPEnvelopeAccount(
				`<ContactActionRequest xmlns="urn:zimbraMail">
					<action id="${id}" op="tag" tag="${tag.id}"/>
				</ContactActionRequest>`, accountToken, false
			);

			// Verify response
			assert.exists(res.Fault, `id="${id}" should be a Fault`);
		}
	});


	it('Regression | Tag a contact with more than one tag at the same time', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@${config.testDomain}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Create a tag
		const t1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		const tag1 = Array.isArray(t1.CreateTagResponse.tag)
			? t1.CreateTagResponse.tag[0] : t1.CreateTagResponse.tag;
		const t2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		const tag2 = Array.isArray(t2.CreateTagResponse.tag)
			? t2.CreateTagResponse.tag[0] : t2.CreateTagResponse.tag;

		// Send contact action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="${tag1.id},${tag2.id}"/>
			</ContactActionRequest>`, accountToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Tag with multiple tags should be a Fault');
	});
});
