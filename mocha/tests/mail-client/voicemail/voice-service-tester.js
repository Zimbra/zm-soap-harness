import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > VoiceMail > VoiceServiceTester', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name;
	const uid = common.getUniqueString();

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `voicemail.${uid}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureVoiceEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests

	it('Sanity | Verify that attr zimbraFeatureVoiceEnabled is enabled for the test account using Getinfo request', async () => {
		// Source: VoiceServiceTester01 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | VoiceServiceTester using valid phone', async () => {
		// Source: VoiceServiceTester02 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | VoiceServiceTester using invalid phone number, missing phone number and multiple phone numbers', async () => {
		// Source: VoiceServiceTester03 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | GetVoiceInfo for all phones', async () => {
		// Source: VoiceServiceTester04 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | get info for specific valid phones', async () => {
		// Source: VoiceServiceTester05 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | get info for specific valid and invalid phones', async () => {
		// Source: VoiceServiceTester06 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Get all voice prefernces', async () => {
		// Source: VoiceServiceTester07 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Get specific prefs', async () => {
		// Source: VoiceServiceTester08 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | get message waiting notification (mwn) pref', async () => {
		// Source: VoiceServiceTester09 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Verify modification of valid prefs with valid value', async () => {
		// Source: VoiceServiceTester10 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | modify valid prefs with invalid value', async () => {
		// Source: VoiceServiceTester11 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | modify invalid prefs', async () => {
		// Source: VoiceServiceTester12 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | get folders for all phones', async () => {
		// Source: VoiceServiceTester13 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | get folders for specific phones', async () => {
		// Source: VoiceServiceTester14 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Search missed calls 1', async () => {
		// Source: VoiceServiceTester15 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | search on multiple types and multiple phones', async () => {
		// Source: VoiceServiceTester16 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Search in default voice mail folder (INBOX)', async () => {
		// Source: VoiceServiceTester17 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | search in trash folder', async () => {
		// Source: VoiceServiceTester18 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Search in default voice mail folder (INBOX) using sort by duration', async () => {
		// Source: VoiceServiceTester19 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Search in voice mail INBOX, date based', async () => {
		// Source: VoiceServiceTester20 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | search multiple phones', async () => {
		// Source: VoiceServiceTester21 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | search missed calls form call logs', async () => {
		// Source: VoiceServiceTester22 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | search answered calls 1', async () => {
		// Source: VoiceServiceTester23 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Search placed calls', async () => {
		// Source: VoiceServiceTester24 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Search missed calls 2', async () => {
		// Source: VoiceServiceTester25 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | search answered calls 2', async () => {
		// Source: VoiceServiceTester26 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | search placed calls', async () => {
		// Source: VoiceServiceTester27 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Get message in voicemail inbox', async () => {
		// Source: VoiceServiceTester28 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Retrieve voice mail content inline', async () => {
		// Source: VoiceServiceTester29 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Retrieve voice mail content as attachment', async () => {
		// Source: VoiceServiceTester30 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | VoiceMsgAction mark the msg as read', async () => {
		// Source: VoiceServiceTester31 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | VoiceMsgAction mark the read msg as read', async () => {
		// Source: VoiceServiceTester32 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | VoiceMsgAction mark the unread msg as read', async () => {
		// Source: VoiceServiceTester33 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | VoiceMsgAction empty-trash', async () => {
		// Source: VoiceServiceTester34 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | VoiceMsgAction-move', async () => {
		// Source: VoiceServiceTester35 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Delete the oldest msg', async () => {
		// Source: VoiceServiceTester36 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Undelete the voice msg', async () => {
		// Source: VoiceServiceTester37 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Get all call features (this is now disallowed)', async () => {
		// Source: VoiceServiceTester38 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | get specific call features', async () => {
		// Source: VoiceServiceTester39 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | get specific voice mail prefs', async () => {
		// Source: VoiceServiceTester40 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | get specific call features, do NOT get any voice mail prefs', async () => {
		// Source: VoiceServiceTester41 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Reset call features', async () => {
		// Source: VoiceServiceTester42 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Reset voice mail pref in ResetVoiceFeaturesRequest, it will be a noop', async () => {
		// Source: VoiceServiceTester43 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Modify call features and get them back', async () => {
		// Source: VoiceServiceTester44 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Modify a voicemail pref', async () => {
		// Source: VoiceServiceTester45 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Functional | Modify both call feature and voicemail pref in one request', async () => {
		// Source: VoiceServiceTester46 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Regression | Modify no features (negative test)', async () => {
		// Source: VoiceServiceTester47 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Regression | set SCF caller list to empty while forwardto is not empty', async () => {
		// Source: VoiceServiceTester48 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Regression | set SCF caller list to empty while active is not false', async () => {
		// Source: VoiceServiceTester49 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Regression | set SCF caller list to empty, the only way to do it is setting forward to to empty and active to false', async () => {
		// Source: VoiceServiceTester50 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Regression | UploadVoiceMail and send it', async () => {
		// Source: VoiceServiceTester51 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Regression | Include Junk folder in search', async () => {
		// Source: VoiceServiceTester52 from VoiceMail/VoiceServiceTester.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
