import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('iCal > MS Outlook 2003 > Basic', function () {
	this.timeout(30 * 1000);

	before(async function () {
		await main.before(this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it.skip('Smoke | Verify the basic iCal format invitation with basic information' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic01
	});


	it.skip('Functional | Verify the basic iCal format invitation without subject from Outlook2003' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic02
	});


	it.skip('Functional | Verify the basic iCal format invitation without location from Outlook2003' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic03
	});


	it.skip('Functional | Verify the basic iCal format invitation with two invitees from Outlook2003' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic04
	});


	it.skip('Functional | Verify the basic iCal format invitation with One hour meeting from Outlook2003' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic05
	});


	it.skip('Functional | Verify the basic iCal format invitation for all day meeting from Outlook2003' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic06
	});


	it.skip('Functional | Verify the basic iCal format invitation without enabling the reminder from Outlook2003' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic07
	});


	it.skip('Functional | Verify the basic iCal format for an appointment with status of an appointment busy' +
        ' (Show Time as busy) [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic08
	});


	it.skip('Functional | Verify the basic iCal format for an appointment with status of an appointment =' +
        ' free/tentative/out of office [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic09
	});


	it.skip('Functional | Verify the basic iCal format for an appointment without alarm enable' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic10
	});


	it.skip('Functional | Verify the basic iCal format for an appointment which send as a private from Outlook2003' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic11
	});


	it.skip('Functional | Verify the basic iCal format for an appointment which send as a public from Outlook2003' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic12
	});


	it.skip('Functional | Verify the basic iCal format for an appointment which is sent with low priority' +
        ' from Outlook2003 [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic13
	});


	it.skip('Functional | Verify the basic iCal format for an appointment which is sent with high priority' +
        ' from Outlook2003 [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic14
	});


	it.skip('Functional | Verify the basic iCal format for an appointment which is sent as a meeting request' +
        ' from Outlook2003 [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic15
	});


	it.skip('Functional | Verify the basic iCal format for an appointment which is sent from different timezone' +
        ' of Outlook2003 [LMTP inject not supported in JS framework]', async () => {
		// outlook_ical_basic16
	});
});
