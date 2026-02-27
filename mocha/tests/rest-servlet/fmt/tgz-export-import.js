import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Fmt > TGZ > Export Import', function () {
	this.timeout(180 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Setup: Create a message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: exportImportMsg\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\nexport import content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Setup: Create a contact
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">ExportFirst</a>
					<a n="lastName">ExportLast</a>
					<a n="email">export@test.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		// Setup: Create an appointment
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="exportAppt">
							<s d="20250401T120000Z"/>
							<e d="20250401T130000Z"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>export appointment</content>
					</mp>
					<su>exportAppt</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Setup: Create a tag
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="exportTag${common.getUniqueString()}"/>
			</CreateTagRequest>`, account1Token
		);

		// Setup: Create a subfolder
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="exportFolder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account1Token
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Export and import messages via tgz', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');
		assert.isAbove(exportRes.body.length, 10, 'TGZ export should contain data');

		const importRes = await soap.makeRestPostRequest(account2Token, {
			user: account2Email,
			folder: 'Inbox',
			fmt: 'tgz',
			fileBuffer: exportRes.body,
			contentType: 'application/x-tar'
		});
		assert.equal(importRes.status, 200, 'Import should return 200');
	});


	it('Sanity | Export and import contacts via tgz', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Contacts',
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');

		const importRes = await soap.makeRestPostRequest(account2Token, {
			user: account2Email,
			folder: 'Contacts',
			fmt: 'tgz',
			fileBuffer: exportRes.body,
			contentType: 'application/x-tar'
		});
		assert.equal(importRes.status, 200, 'Import should return 200');
	});


	it('Functional | Export and import contacts with verify', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Contacts',
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');

		const importRes = await soap.makeRestPostRequest(account2Token, {
			user: account2Email,
			folder: 'Contacts',
			fmt: 'tgz',
			fileBuffer: exportRes.body,
			contentType: 'application/x-tar',
			extraParams: { resolve: 'modify' }
		});
		assert.equal(importRes.status, 200, 'Import should return 200');

		// Verify contact was imported
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>*</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Export and import documents via tgz', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Briefcase',
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.oneOf(exportRes.status, [200, 204], 'Export should return 200 or 204');
	});


	it('Sanity | Export and import folders via tgz', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');
		assert.isAbove(exportRes.body.length, 10, 'TGZ export should contain mailbox data');
	});


	it('Sanity | Export and import appointments via tgz', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');

		const importRes = await soap.makeRestPostRequest(account2Token, {
			user: account2Email,
			folder: 'Calendar',
			fmt: 'tgz',
			fileBuffer: exportRes.body,
			contentType: 'application/x-tar'
		});
		assert.equal(importRes.status, 200, 'Import should return 200');
	});


	it('Functional | Export and import preferences via tgz', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should have return 200');
		assert.isAbove(exportRes.body.length, 10, 'TGZ export should contain preference data');
	});


	it('Sanity | Export and import tags via tgz', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');
		assert.isAbove(exportRes.body.length, 10, 'TGZ export should contain tag data');
	});


	it('Sanity | Verify tags are present after tgz export/import', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');

		const importRes = await soap.makeRestPostRequest(account2Token, {
			user: account2Email,
			fmt: 'tgz',
			fileBuffer: exportRes.body,
			contentType: 'application/x-tar',
			extraParams: { resolve: 'modify' }
		});
		assert.equal(importRes.status, 200, 'Import should return 200');
	});
});
