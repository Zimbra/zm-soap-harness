import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('DAV > Caldav Meeting Requests', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1NameEncoded;
	let account1Token;
	let account1Server;
	let account2Name;
	let account2Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const account1User = 'test' + common.getUniqueString();
		account1Name = account1User + '@' + config.testDomain;
		account1NameEncoded = account1User + '%40' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		const attrs1 = Array.isArray(acct1.a) ? acct1.a : [acct1.a];
		const mailHost1 = attrs1.find(a => a.n === 'zimbraMailHost');
		account1Server = mailHost1 ? (mailHost1._content || mailHost1) : config.serverHost;

		// Send the message
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		const account2User = 'test' + common.getUniqueString();
		account2Name = account2User + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');

		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;
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
	it('Sanity | Create a basic Meeting Request using CalDav', async () => {
		const uid = common.getUniqueString();
		const subject = 'Meeting' + uid;

		const icsBody = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:Zimbra-Calendar-Provider',
			'BEGIN:VEVENT',
			`UID:${uid}`,
			`SUMMARY:${subject}`,
			`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${account2Name}`,
			`ORGANIZER:mailto:${account1Name}`,
			'DTSTART:20180601T120000Z',
			'DTEND:20180601T140000Z',
			'STATUS:CONFIRMED',
			'CLASS:PUBLIC',
			'TRANSP:OPAQUE',
			'DTSTAMP:20180601T100000Z',
			'SEQUENCE:0',
			'END:VEVENT',
			'END:VCALENDAR',
		].join('\r\n');

		const putRes = await makeDavRequest({
			method: 'PUT',
			uri: `/dav/${account1NameEncoded}/Calendar/${uid}.ics`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
			headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
			body: icsBody,
		});

		// Verify response
		assert.equal(putRes.status, 201, 'PUT should return 201 Created');

		// Verify appointment exists via SOAP search
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" calExpandInstStart="1527638400000" calExpandInstEnd="1527897600000" types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify the meeting attendee receives an invitation to a meeting request', async () => {
		const uid = common.getUniqueString();
		const subject = 'Invite' + uid;

		const icsBody = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:Zimbra-Calendar-Provider',
			'BEGIN:VEVENT',
			`UID:${uid}`,
			`SUMMARY:${subject}`,
			`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${account2Name}`,
			`ORGANIZER:mailto:${account1Name}`,
			'DTSTART:20180701T120000Z',
			'DTEND:20180701T140000Z',
			'STATUS:CONFIRMED',
			'CLASS:PUBLIC',
			'TRANSP:OPAQUE',
			'DTSTAMP:20180701T100000Z',
			'SEQUENCE:0',
			'END:VEVENT',
			'END:VCALENDAR',
		].join('\r\n');

		await makeDavRequest({
			method: 'PUT',
			uri: `/dav/${account1NameEncoded}/Calendar/${uid}.ics`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
			headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
			body: icsBody,
		});

		// Wait briefly for invite delivery
		await new Promise(resolve => setTimeout(resolve, 2000));

		// account2 searches for the meeting invite
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox subject:${subject}</query>
			</SearchRequest>`, account2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
	});
});
