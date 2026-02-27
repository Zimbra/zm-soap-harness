import { assert } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.resolve(__dirname, '../../../../data/soapvalidator/RestServlet/Contacts/Post');

describe('Rest Servlet > Contacts > Post VCF', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;

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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Post a Contact VCF to the REST servlet', async () => {
		const vcfFilePath = path.join(dataRoot, 'contact1.vcf');

		const postRes = await soap.makeRestPostRequest(account1Token, {
			user: account1Email,
			folder: 'contacts',
			fmt: 'vcf',
			filePath: vcfFilePath
		});
		assert.equal(postRes.status, 200, 'REST POST should return 200');

		// Search for the imported contact
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>email@foo.com</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const contacts = searchRes.SearchResponse?.cn;
		const contactArr = Array.isArray(contacts) ? contacts : (contacts ? [contacts] : []);
		assert.isAtLeast(contactArr.length, 1, 'Should find at least one imported contact');
		const contactId = contactArr[0].id;

		// Verify contact details
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, account1Token
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const cn = getRes.GetContactsResponse?.cn;
		const contact = Array.isArray(cn) ? cn[0] : cn;
		const attrs = {};
		if (contact?._attrs) {
			Object.assign(attrs, contact._attrs);
		} else if (contact?.a) {
			const aArr = Array.isArray(contact.a) ? contact.a : [contact.a];
			aArr.forEach(a => {
				attrs[a.n] = a._content;
			});
		}
		assert.equal(attrs.email, 'email@foo.com', 'Email should match');
		assert.equal(attrs.firstName, 'First', 'First name should match');
		assert.equal(attrs.lastName, 'Last', 'Last name should match');
	});
});
