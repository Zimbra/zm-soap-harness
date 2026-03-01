import path from 'node:path';
import { assert } from 'chai';
import config from '../conf/config.js';
import { soap } from '../framework/backend/soap-client.js';
import { main } from '../pages/main.js';

describe('Mail > Mime > Inject MIME', function () {
	this.timeout(30 * 1000);

	before(async () => {
		await main.before(this);
	});
	beforeEach(async () => {
		await main.beforeEach(this);
	});
	afterEach(async () => {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Inject message with attachments using REST upload and search it', async () => {
		const accountEmailAddress = soap.testAccounts.testAccount1.emailAddress;
		const accountAuthToken = await soap.getAccountAuthToken(accountEmailAddress);

		const subject = 'REST Upload - API automation subject';
		const filePath = path.join(config.projectRoot, 'mocha/data/file-attachments.txt');
		const attachmentFiles = 'htmFile.html,PDFFile.pdf,PlainTextFile.txt,WordDocFile.docx,ExcelDocFile.xlsx';

		// Inject mime
		await soap.injectMime(accountAuthToken, filePath);

		// Search message
		const searchResponse = await soap.searchMessage(accountAuthToken, subject);

		// Verify response
		assert.isNotNull(searchResponse, 'Verify search message response is not null');

		// Verify message content
		const getMessageResponse = await soap.getMessage(accountAuthToken, searchResponse);

		// Verify response
		assert.include(getMessageResponse.attachmentList, attachmentFiles,
			'Verify message response contains attachment files');
	});
});
