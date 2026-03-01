import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contacts Export', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

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
		accountToken = await soap.getAccountAuthToken(accountEmail);
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});


	it('Sanity | ExportContactsRequest from an account with 0 contacts', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ExportContactsResponse, 'ExportContactsResponse should exist');
	});


	it('Functional | ExportContactsRequest with one contact with all attributes', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
					<a n="company">Company${common.getUniqueString()}</a>
					<a n="workFax">wf${common.getUniqueString()}</a>
					<a n="workPhone">wp${common.getUniqueString()}</a>
					<a n="middleName">Mid${common.getUniqueString()}</a>
					<a n="jobTitle">Title${common.getUniqueString()}</a>
					<a n="mobilePhone">Mobile${common.getUniqueString()}</a>
					<a n="pager">Pager${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Export contacts
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ExportContactsResponse.content, 'Content should exist');
	});


	it('Functional | ExportContactsRequest with several contacts', async () => {
		for (let i = 0; i < 5; i++) {

			// Create a contact
			await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">First${common.getUniqueString()}</a>
						<a n="lastName">Last${common.getUniqueString()}</a>
						<a n="email">email${common.getUniqueString()}@domain.com</a>
					</cn>
				</CreateContactRequest>`, accountToken
			);
		}

		// Export contacts
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ExportContactsResponse.content, 'Content should exist');
	});


	it('Functional | ExportContactsRequest with contact without firstname and email', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="lastName">Last${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Export contacts
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ExportContactsResponse.content, 'Content should exist');
	});


	it('Functional | ExportContactsRequest with long fields', async () => {
		const longNotes = Array(11).fill(`Notes${common.getUniqueString()}`).join('');

		// Create a contact
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
					<a n="notes">${longNotes}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Export contacts
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ExportContactsResponse.content, 'Content should exist');
	});


	it('Regression | ExportContactsRequest with invalid ct values', async () => {
		const invalidTypes = ['abcd', '1234', '-1', '//\\\\|-', ''];
		for (const ct of invalidTypes) {

			// Export contacts
			const res = await soap.makeSOAPEnvelopeAccount(
				`<ExportContactsRequest xmlns="urn:zimbraMail" ct="${ct}"/>`, accountToken, false
			);

			// Verify response
			assert.exists(res.Fault, `ct="${ct}" should be a Fault`);
			const code = res.Fault?.Detail?.Error?.Code || '';
			assert.include(code, 'service.INVALID_REQUEST', `ct="${ct}" should be service.INVALID_REQUEST`);
		}
	});


	it('Regression | ExportContactsRequest without ct attribute', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail"/>`, accountToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		const code = res.Fault?.Detail?.Error?.Code || '';
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Export contacts in CSV format', async () => {
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv" csvfmt="yahoo-csv">
			</ExportContactsRequest>`, accountToken
		);

		// Verify response
		assert.notExists(exportRes.Fault, 'Export Yahoo CSV should not be a Fault');
		assert.exists(exportRes.ExportContactsResponse, 'ExportContactsResponse should exist');
	});


	it('Functional | Export all contacts without folder filter', async () => {
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv">
			</ExportContactsRequest>`, accountToken
		);

		// Verify response
		assert.notExists(exportRes.Fault, 'Export all contacts should not be a Fault');
		assert.exists(exportRes.ExportContactsResponse, 'ExportContactsResponse should exist');
	});


	it('Functional | Export contacts from empty folder', async () => {
		const folderName = `empty${common.getUniqueString()}`;

		// Create a folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="7" view="contact"/>
			</CreateFolderRequest>`, accountToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'CreateFolder should not be a Fault');
		const folder = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0] : folderRes.CreateFolderResponse.folder;

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv" l="${folder.id}">
			</ExportContactsRequest>`, accountToken
		);

		// Verify response
		assert.notExists(exportRes.Fault, 'Export empty folder should not be a Fault');
		assert.exists(exportRes.ExportContactsResponse, 'ExportContactsResponse should exist');
	});
});
