import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Mail > bug-43359', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account3Name, account4Name;
	const uid = common.getUniqueString();
	const message1Subject = `subject1.${uid}`;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `account1.${uid}@${config.testDomain}`;
		account3Name = `account3.${uid}@${config.testDomain}`;
		account4Name = `account4.${uid}@${config.testDomain}`;

		// Create accounts
		for (const name of [account1Name, account3Name, account4Name]) {
			await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
		}
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
	it('Sanity | Verify if the externalmail fetch for IMap folders having large mails work properly', async () => {
		// Login as account1
		const acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Create a folder for external mail
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="extMail${uid}" fie="1"/>
			</CreateFolderRequest>`, acct1Auth
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		assert.exists(folderRes.CreateFolderResponse, 'CreateFolderResponse should exist');
	});


	it('Sanity | Verify if the externalmail fetch for IMap folders work properly with local accounts', async () => {
		// Login as account3 and send a message to self
		const acct3Auth = await soap.getAccountAuthToken(account3Name);

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Name}"/>
					<su>${message1Subject}</su>
					<mp ct="text/plain">
						<content>This is important. Test external mail import.</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct3Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await new Promise(r => setTimeout(r, 3000));

		// Verify message arrived
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${message1Subject})</query>
			</SearchRequest>`, acct3Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		// Login as account4 and create a folder for external IMAP
		const acct4Auth = await soap.getAccountAuthToken(account4Name);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="acct3${uid}" fie="1"/>
			</CreateFolderRequest>`, acct4Auth
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		assert.exists(folderRes.CreateFolderResponse, 'CreateFolderResponse should exist');
	});
});
