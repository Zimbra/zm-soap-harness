import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > ZCO > Invite DL Including Self', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const uid = common.getUniqueString();
	const domainName = `zcodlself${uid}.test`;
	const organizerName = `organizer@${domainName}`;
	const attendee2Name = `attendee2@${domainName}`;
	const dlName = `list1@${domainName}`;
	const apptSubject = 'Meeting with DL containing self';

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${organizerName}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">The Organizer</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${attendee2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">Other Attendee</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="description">DL containing organizer</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		const dlId = dlRes.CreateDistributionListResponse?.dl?.id;

		if (dlId) {
			await soap.makeSOAPEnvelopeAdmin(
				`<AddDistributionListMemberRequest id="${dlId}" xmlns="urn:zimbraAdmin">
					<dlm>${organizerName}</dlm>
					<dlm>${attendee2Name}</dlm>
				</AddDistributionListMemberRequest>`, adminAuthToken
			);
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify invite to DL including self does not trigger calendar entry for organizer', async () => {
		const orgAuthToken = await soap.getAccountAuthToken(organizerName);

		// Search for the item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>in:Calendar AND subject:(${apptSubject})</query>
			</SearchRequest>`, orgAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify invite DL triggers calendar entry for other attendee', async () => {
		const att2AuthToken = await soap.getAccountAuthToken(attendee2Name);

		// Search for the item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${apptSubject})</query>
			</SearchRequest>`, att2AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
