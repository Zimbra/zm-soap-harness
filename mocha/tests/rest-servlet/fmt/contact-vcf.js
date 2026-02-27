import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > Fmt > Contact VCF', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let contactId;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create a contact
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">VcfFirst</a>
					<a n="lastName">VcfLast</a>
					<a n="email">vcf@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(contactRes.Fault, 'Response should not be a Fault');
		const cn = contactRes.CreateContactResponse?.cn;
		contactId = (Array.isArray(cn) ? cn[0] : cn).id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Using the REST servlet, get a contact using vcf format', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: contactId,
			fmt: 'vcf'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'BEGIN:VCARD', 'Response should contain VCF format');
		assert.include(res.body, 'VcfFirst', 'VCF should contain first name');
		assert.include(res.body, 'VcfLast', 'VCF should contain last name');
	});


	it('Functional | Get all contacts folder in vcf format', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Contacts',
			fmt: 'vcf'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'BEGIN:VCARD', 'Response should contain VCF');
		assert.include(res.body, 'END:VCARD', 'Response should end VCF');
	});


	it('Functional | Verify VCF contains email address', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: contactId,
			fmt: 'vcf'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'vcf@domain.com', 'VCF should contain email');
	});


	it('Functional | Verify VCF contains proper N and FN fields', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: contactId,
			fmt: 'vcf'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'VcfLast', 'VCF N field should contain last name');
		assert.include(res.body, 'VcfFirst', 'VCF N field should contain first name');
	});


	it('Functional | Verify VCF export with multiple contacts', async () => {
		// Create second contact
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
                <cn>
                    <a n="firstName">VcfSecond</a>
                    <a n="lastName">VcfSecondLast</a>
                    <a n="email">vcf2@domain.com</a>
                </cn>
            </CreateContactRequest>`, account1Token
		);

		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Contacts',
			fmt: 'vcf'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'VcfFirst', 'Should contain first contact');
		assert.include(res.body, 'VcfSecond', 'Should contain second contact');
	});
});

