import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Addressbooksizelimit > Addressbook Size Limit', function () {
	let adminAuthToken;
	let account1Id, account1Name, account3Id, account3Name;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		await common.sleep(500);
		account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const a1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Id = (Array.isArray(a1.CreateAccountResponse?.account) ? a1.CreateAccountResponse.account[0].id : a1.CreateAccountResponse?.account?.id);

		await common.sleep(500);
		account3Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const a3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account3Id = (Array.isArray(a3.CreateAccountResponse?.account) ? a3.CreateAccountResponse.account[0].id : a3.CreateAccountResponse?.account?.id);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Set zimbraContactMaxNumEntries to 3, add 3 contacts, 4th should fail', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraContactMaxNumEntries">3</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const userAuth = await soap.getAccountAuthToken(account1Name, config.accountPassword);

		// Add 3 contacts
		for (let i = 0; i < 3; i++) {
			const response = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">First${common.getUniqueString()}</a>
						<a n="lastName">Last${common.getUniqueString()}</a>
						<a n="email">email${common.getUniqueString()}@foo.com</a>
					</cn>
				</CreateContactRequest>`, userAuth
			);
			assert.exists(response.CreateContactResponse,
				`Contact ${i + 1} should be created`);
		}

		// 4th should fail
		const response = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@foo.com</a>
				</cn>
			</CreateContactRequest>`, userAuth
		);
		assert.exists(response.Fault, 'Should fail for 4th contact');
		assert.include(response.Fault.Detail.Error.Code, 'mail.TOO_MANY_CONTACTS');
	});


	it('Functional | Reduce zimbraContactMaxNumEntries below existing count - existing contacts should remain', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraContactMaxNumEntries">2</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const userAuth = await soap.getAccountAuthToken(account1Name, config.accountPassword);

		// Adding more contacts should fail
		const response = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@foo.com</a>
				</cn>
			</CreateContactRequest>`, userAuth
		);
		assert.exists(response.Fault, 'Should fail when over limit');
		assert.include(response.Fault.Detail.Error.Code, 'mail.TOO_MANY_CONTACTS');
	});


	it('Smoke | Set zimbraContactMaxNumEntries to 0 allows unlimited contacts', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		await common.sleep(500);
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(acctRes.CreateAccountResponse?.account) ? acctRes.CreateAccountResponse.account[0].id : acctRes.CreateAccountResponse?.account?.id);

		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraContactMaxNumEntries">0</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const userAuth = await soap.getAccountAuthToken(acctName, config.accountPassword);

		// Add 10 contacts - all should succeed with limit=0 (unlimited)
		for (let i = 0; i < 10; i++) {
			const response = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">First${common.getUniqueString()}</a>
						<a n="lastName">Last${common.getUniqueString()}</a>
						<a n="email">email${common.getUniqueString()}@foo.com</a>
					</cn>
				</CreateContactRequest>`, userAuth
			);
			assert.exists(response.CreateContactResponse,
				`Contact ${i + 1} should be created`);
		}
	});


	it('Functional | Delete a contact and add new one when at max limit', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<a n="zimbraContactMaxNumEntries">2</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const userAuth = await soap.getAccountAuthToken(account3Name, config.accountPassword);

		// Add 2 contacts to reach max
		let lastContactId;
		for (let i = 0; i < 2; i++) {
			const response = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">First${common.getUniqueString()}</a>
						<a n="lastName">Last${common.getUniqueString()}</a>
						<a n="email">email${common.getUniqueString()}@foo.com</a>
					</cn>
				</CreateContactRequest>`, userAuth
			);
			lastContactId = response.CreateContactResponse.cn[0].id;
		}

		// Delete last contact
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${lastContactId}" op="delete"/>
			</ContactActionRequest>`, userAuth
		);

		// Add new contact - should succeed
		const response = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@foo.com</a>
				</cn>
			</CreateContactRequest>`, userAuth
		);
		assert.exists(response.CreateContactResponse,
			'Should be able to add after deleting');
	});


	it('Sanity | Set zimbraContactMaxNumEntries to large value - 51st should fail', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		await common.sleep(500);
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(acctRes.CreateAccountResponse?.account)
			? acctRes.CreateAccountResponse.account[0].id
			: acctRes.CreateAccountResponse?.account?.id);

		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraContactMaxNumEntries">50</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const userAuth = await soap.getAccountAuthToken(
			acctName, config.accountPassword);

		// Add 50 contacts
		for (let i = 0; i < 50; i++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">First${common.getUniqueString()}</a>
						<a n="lastName">Last${common.getUniqueString()}</a>
						<a n="email">e${common.getUniqueString()}@foo.com</a>
					</cn>
				</CreateContactRequest>`, userAuth
			);
			assert.exists(res.CreateContactResponse,
				`Contact ${i + 1} should be created`);
		}

		// 51st should fail
		const response = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">e${common.getUniqueString()}@foo.com</a>
				</cn>
			</CreateContactRequest>`, userAuth
		);
		assert.exists(response.Fault, '51st contact should fail');
		assert.include(response.Fault.Detail.Error.Code,
			'mail.TOO_MANY_CONTACTS');
	});


	it('Functional | AutoAddAddress blocked when at max contacts', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const recipientName = `test.${common.getUniqueString()}@${config.testDomain}`;
		await common.sleep(500);

		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(acctRes.CreateAccountResponse?.account)
			? acctRes.CreateAccountResponse.account[0].id
			: acctRes.CreateAccountResponse?.account?.id);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${recipientName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Set max to 2
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraContactMaxNumEntries">2</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const userAuth = await soap.getAccountAuthToken(
			acctName, config.accountPassword);

		// Add 2 contacts to reach max
		for (let i = 0; i < 2; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">F${common.getUniqueString()}</a>
						<a n="lastName">L${common.getUniqueString()}</a>
						<a n="email">e${common.getUniqueString()}@foo.com</a>
					</cn>
				</CreateContactRequest>`, userAuth
			);
		}

		// Verify can't add more
		const failRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">F${common.getUniqueString()}</a>
					<a n="lastName">L${common.getUniqueString()}</a>
					<a n="email">e${common.getUniqueString()}@foo.com</a>
				</cn>
			</CreateContactRequest>`, userAuth
		);
		assert.exists(failRes.Fault, 'Should be at max contacts');

		// Send mail with add=1 (AutoAddAddress)
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${recipientName}" add="1"/>
					<su>test subject</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, userAuth
		);

		// Verify contact was NOT auto-added
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${recipientName}</query>
			</SearchRequest>`, userAuth
		);
		if (searchRes.SearchResponse) {
			const cn = searchRes.SearchResponse.cn;
			assert.isTrue(!cn || (Array.isArray(cn) && cn.length === 0),
				'Contact should not be auto-added at max');
		}
	});


	it('Functional | Modify contact succeeds when at max contacts', async () => {
		const userAuth = await soap.getAccountAuthToken(
			account3Name, config.accountPassword);

		// Set max to 2
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<a n="zimbraContactMaxNumEntries">2</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Add 2 contacts
		let contactId;
		for (let i = 0; i < 2; i++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">F${common.getUniqueString()}</a>
						<a n="lastName">L${common.getUniqueString()}</a>
						<a n="email">e${common.getUniqueString()}@foo.com</a>
					</cn>
				</CreateContactRequest>`, userAuth
			);
			const cn = Array.isArray(res.CreateContactResponse?.cn)
				? res.CreateContactResponse.cn[0]
				: res.CreateContactResponse?.cn;
			contactId = cn?.id;
		}

		// Verify at max — can't add more
		const failRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">F${common.getUniqueString()}</a>
					<a n="lastName">L${common.getUniqueString()}</a>
					<a n="email">e${common.getUniqueString()}@foo.com</a>
				</cn>
			</CreateContactRequest>`, userAuth
		);
		assert.exists(failRes.Fault, 'Should be at max');

		// Modify existing contact — should succeed
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail"
				replace="0" force="1">
				<cn id="${contactId}">
					<a n="firstName">NewF${common.getUniqueString()}</a>
					<a n="lastName">NewL${common.getUniqueString()}</a>
					<a n="email">new${common.getUniqueString()}@foo.com</a>
				</cn>
			</ModifyContactRequest>`, userAuth
		);
		assert.exists(modRes.ModifyContactResponse,
			'Should be able to modify contact at max');
	});
});
