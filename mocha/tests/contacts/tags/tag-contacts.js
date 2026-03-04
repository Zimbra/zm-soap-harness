import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Tags > Tag Contacts', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountToken = await soap.getAccountAuthToken(accountEmail);
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
	// XML: contacts_TagActionRequest1 (sanity)
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
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		assert.notExists(tagRes.Fault, 'CreateTag should not be a Fault');
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		// XML: t:select attr="id" set="tag.id"
		assert.exists(tag.id, 'Tag id should exist');
		// XML: t:select attr="color" match="${tag.color.default}" emptyset="1" — color=0 means no color attr returned
		assert.notExists(tag.color, 'Tag color=0 should not return color attr (emptyset)');

		// Tag the contact
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Tag action should not fault');
		// XML: t:select path="//mail:ContactActionResponse/mail:action"
		assert.exists(actionRes.ContactActionResponse.action, 'Tag action should exist');

		// Search for the tagged contact
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>tag:"${tagName}"</query>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		// XML: t:select attr="id" match="${contact1.id}"
		assert.equal(searchCn.id, cn.id, 'Search result id should match contact id');
	});


	// XML: contacts_TagActionRequest2 (regression)
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
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Delete the contact
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="delete"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(deleteRes.Fault, 'Delete should not fault');
		// XML: t:select path="//mail:ContactActionResponse/mail:action"
		assert.exists(deleteRes.ContactActionResponse.action, 'Delete action should exist');

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		assert.notExists(tagRes.Fault, 'CreateTag should not fault');
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		// XML: t:select attr="id" set="tag3.id"
		assert.exists(tag.id, 'Tag id should exist');
		// XML: t:select attr="color" match="${tag.color.default}" emptyset="1"
		assert.notExists(tag.color, 'Tag color=0 should not return color attr (emptyset)');

		// Try to tag the deleted contact
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);

		// XML: t:select path="//zimbra:Code" match="^mail.NO_SUCH_CONTACT"
		assert.isString(actionRes.Fault.Detail.Error.Code, 'Tag deleted contact should be a Fault');
		assert.match(actionRes.Fault.Detail.Error.Code, /^mail.NO_SUCH_CONTACT/, 'Error code should match mail.NO_SUCH_CONTACT');
	});


	// XML: contacts_TagActionRequest3 (regression)
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
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// XML: spaces -> service.INVALID_REQUEST
		const r1 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="       "/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r1.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'spaces tag should be service.INVALID_REQUEST');

		// XML: blank -> service.INVALID_REQUEST
		const r2 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag=""/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r2.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'blank tag should be service.INVALID_REQUEST');

		// XML: spchar -> service.INVALID_REQUEST
		const r3 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="~!@#%"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r3.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'spchar tag should be service.INVALID_REQUEST');

		// XML: sometext -> service.INVALID_REQUEST
		const r4 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="some text"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r4.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'sometext tag should be service.INVALID_REQUEST');

		// XML: negative (-1) -> t:select path="//zimbra:Code | //mail:ContactActionResponse/mail:action"
		const r5 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="-1"/>
			</ContactActionRequest>`, accountToken, false
		);
		const r5HasFault = r5.Fault && r5.Fault.Detail && r5.Fault.Detail.Error;
		const r5HasAction = r5.ContactActionResponse && r5.ContactActionResponse.action;
		assert.isTrue(!!r5HasFault || !!r5HasAction, 'negative tag should return either fault code or action');

		// XML: zero (0) -> mail.NO_SUCH_TAG
		const r6 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="0"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r6.Fault.Detail.Error.Code, /^mail.NO_SUCH_TAG/, 'zero tag should be mail.NO_SUCH_TAG');

		// XML: largenumber (1234567890) -> mail.NO_SUCH_TAG
		const r7 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="1234567890"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r7.Fault.Detail.Error.Code, /^mail.NO_SUCH_TAG/, 'largenumber tag should be mail.NO_SUCH_TAG');

		// XML: decimal (12.34) -> service.INVALID_REQUEST
		const r8 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="12.34"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r8.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'decimal tag should be service.INVALID_REQUEST');
	});


	// XML: contacts_TagActionRequest4 (functional)
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
		assert.notExists(c1.Fault, 'Create1 should not be a Fault');
		const cn1 = Array.isArray(c1.CreateContactResponse.cn)
			? c1.CreateContactResponse.cn[0] : c1.CreateContactResponse.cn;
		assert.exists(cn1.id, 'Contact1 id should exist');

		const c2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@${config.testDomain}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c2.Fault, 'Create2 should not be a Fault');
		const cn2 = Array.isArray(c2.CreateContactResponse.cn)
			? c2.CreateContactResponse.cn[0] : c2.CreateContactResponse.cn;
		assert.exists(cn2.id, 'Contact2 id should exist');

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		assert.notExists(tagRes.Fault, 'CreateTag should not be a Fault');
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		// XML: t:select attr="id" set="tag3.id"
		assert.exists(tag.id, 'Tag id should exist');
		// XML: t:select attr="color" match="${tag.color.default}" emptyset="1"
		assert.notExists(tag.color, 'Tag color=0 should not return color attr (emptyset)');

		// Tag both contacts at once
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn1.id},${cn2.id}" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Tag multiple contacts should not be a Fault');
		// XML: t:select path="//mail:ContactActionResponse/mail:action" attr="id" match=".*${contact5.id}.*"
		assert.match(actionRes.ContactActionResponse.action.id, new RegExp(cn1.id), 'Action id should contain contact1 id');
		// XML: t:select path="//mail:ContactActionResponse/mail:action" attr="id" match=".*${contact6.id}.*"
		assert.match(actionRes.ContactActionResponse.action.id, new RegExp(cn2.id), 'Action id should contain contact2 id');
	});


	// XML: contacts_TagActionRequest5 (regression)
	it('Regression | Tag invalid contact id values', async () => {
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		assert.notExists(tagRes.Fault, 'CreateTag should not fault');
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		assert.exists(tag.id, 'Tag id should exist');

		// XML: spaces -> service.INVALID_REQUEST
		const r1 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="       " op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r1.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'spaces id should be service.INVALID_REQUEST');

		// XML: blank -> service.INVALID_REQUEST
		const r2 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r2.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'blank id should be service.INVALID_REQUEST');

		// XML: spchar -> service.INVALID_REQUEST
		const r3 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="~!@#%" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r3.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'spchar id should be service.INVALID_REQUEST');

		// XML: sometext -> service.INVALID_REQUEST
		const r4 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="some text" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r4.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'sometext id should be service.INVALID_REQUEST');

		// XML: negative (-1) -> t:select path="//zimbra:Code | //mail:ContactActionResponse/mail:action"
		const r5 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="-1" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);
		const r5HasFault = r5.Fault && r5.Fault.Detail && r5.Fault.Detail.Error;
		const r5HasAction = r5.ContactActionResponse && r5.ContactActionResponse.action;
		assert.isTrue(!!r5HasFault || !!r5HasAction, 'negative id should return either fault code or action');

		// XML: zero (0) -> mail.NO_SUCH_CONTACT
		const r6 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="0" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r6.Fault.Detail.Error.Code, /^mail.NO_SUCH_CONTACT/, 'zero id should be mail.NO_SUCH_CONTACT');

		// XML: largenumber (1234567890) -> mail.NO_SUCH_CONTACT
		const r7 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="1234567890" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r7.Fault.Detail.Error.Code, /^mail.NO_SUCH_CONTACT/, 'largenumber id should be mail.NO_SUCH_CONTACT');

		// XML: decimal (12.34) -> service.INVALID_REQUEST
		const r8 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="12.34" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken, false
		);
		assert.match(r8.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'decimal id should be service.INVALID_REQUEST');
	});


	// XML: contacts_TagActionRequest6 (regression)
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
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Create two tags
		const t1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		assert.notExists(t1.Fault, 'CreateTag1 should not fault');
		const tag1 = Array.isArray(t1.CreateTagResponse.tag)
			? t1.CreateTagResponse.tag[0] : t1.CreateTagResponse.tag;
		// XML: t:select attr="id" set="tag7.id"
		assert.exists(tag1.id, 'Tag1 id should exist');
		// XML: t:select attr="color" match="${tag.color.default}" emptyset="1"
		assert.notExists(tag1.color, 'Tag1 color=0 should not return color attr (emptyset)');

		const t2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, accountToken
		);
		assert.notExists(t2.Fault, 'CreateTag2 should not fault');
		const tag2 = Array.isArray(t2.CreateTagResponse.tag)
			? t2.CreateTagResponse.tag[0] : t2.CreateTagResponse.tag;
		// XML: t:select attr="id" set="tag8.id"
		assert.exists(tag2.id, 'Tag2 id should exist');
		// XML: t:select attr="color" match="${tag.color.default}" emptyset="1"
		assert.notExists(tag2.color, 'Tag2 color=0 should not return color attr (emptyset)');

		// Try to tag with multiple tags at once
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="${tag1.id},${tag2.id}"/>
			</ContactActionRequest>`, accountToken, false
		);

		// XML: t:select path="//zimbra:Code" match="^service.INVALID_REQUEST"
		assert.isString(res.Fault.Detail.Error.Code, 'Tag with multiple tags should be a Fault');
		assert.match(res.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'Error code should be service.INVALID_REQUEST');
	});
});
