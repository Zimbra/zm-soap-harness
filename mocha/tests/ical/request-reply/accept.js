import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('iCal > Request Reply > Accept', function () {
	this.timeout(30 * 1000);

	before(async function () {
		await main.before(this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Accept-100
	it.skip('Smoke | Verify REPLY message' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-100: Basic accept reply verification
	});


	// Accept-101
	it.skip('Functional | Verify REPLY message (Accept-101)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-101
	});


	// Accept-102
	it.skip('Functional | Verify REPLY message (Accept-102)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-102
	});


	// Accept-103
	it.skip('Functional | Verify REPLY message (Accept-103)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-103
	});


	// Accept-104
	it.skip('Functional | Verify REPLY message (Accept-104)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-104
	});


	// Accept-105
	it.skip('Functional | Verify REPLY message (Accept-105)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-105
	});


	// Accept-107
	it.skip('Functional | Verify that TRANSP - OPAQUE is the default' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-107
	});


	// Accept-108
	it.skip('Functional | Verify existence of alternative message for low fidelity clients (Accept-108)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-108
	});


	// Accept-109
	it.skip('Functional | Verify existence of alternative message for low fidelity clients (Accept-109)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-109
	});


	// Accept-110
	it.skip('Functional | Verify that TRANSP - OPAQUE is preserved in REPLY' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-110
	});


	// Accept-111
	it.skip('Functional | Verify that TZID must be used when DTSTART is neither absolute not local time' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-111
	});


	// Accept-112
	it.skip('Functional | Verify that DTSTART w, o TZID is interpreted as local time' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-112
	});


	// Accept-113
	it.skip('Functional | Verify that TZID must not be applied to UTC time in DTSTART, DTEND' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-113
	});


	// Accept-115
	it.skip('Functional | Verify REPLY message (Accept-115)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-115
	});


	// Accept-200
	it.skip('Functional | Verify VEVENT MUST contain Organizer' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-200
	});


	// Accept-201
	it.skip('Functional | Verify in VEVENT attribute ATTENDEE is not compulsary' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-201
	});


	// Accept-202
	it.skip('Functional | Verify the required attributes for VTIMEZONE (BEGIN - STANDARD)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-202
	});


	// Accept-203
	it.skip('Functional | Verify that multiple RRULES can be set' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-203
	});


	// Accept-204
	it.skip('Functional | To Verify CALSCALE 0 or 1 (rfc 2446)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-204
	});


	// Accept-205
	it.skip('Functional | Verify version is required and it occurs only once' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-205
	});


	// Accept-500
	it.skip('Functional | Verify REPLY message (Accept-500)' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Accept-500
	});
});
