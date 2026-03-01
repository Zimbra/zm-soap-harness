import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Attach > Specific', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

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
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Inject messages with various attachment types

		// email04B: PDF attachment
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04B
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04b"
--sp04b
Content-Type: text/plain
Main body
--sp04b
Content-Type: application/pdf; name="test.pdf"
Content-Disposition: attachment; filename="test.pdf"
Content-Transfer-Encoding: base64
dGVzdCBwZGYgY29udGVudA==
--sp04b--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// text/calendar attachment
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04C calendar
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04c"
--sp04c
Content-Type: text/plain
Main body
--sp04c
Content-Type: text/calendar; name="invite.ics"
Content-Disposition: attachment; filename="invite.ics"
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Meeting
END:VEVENT
END:VCALENDAR
--sp04c--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// text/plain attachment
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04D plain
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04d"
--sp04d
Content-Type: text/plain
Main body
--sp04d
Content-Type: text/plain; name="readme.txt"
Content-Disposition: attachment; filename="readme.txt"
Just a text file
--sp04d--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// text/html attachment
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04E html
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04e"
--sp04e
Content-Type: text/plain
Main body
--sp04e
Content-Type: text/html; name="page.html"
Content-Disposition: attachment; filename="page.html"
						<html><body>test</body></html>
--sp04e--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// text/richtext attachment
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04F richtext
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04f"
--sp04f
Content-Type: text/plain
Main body
--sp04f
Content-Type: text/richtext; name="doc.rtf"
Content-Disposition: attachment; filename="doc.rtf"
Rich text content
--sp04f--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// image/jpeg attachment - email04J
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04J
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04j"
--sp04j
Content-Type: text/plain
Main body with image
--sp04j
Content-Type: image/jpeg; name="photo.jpg"
Content-Disposition: attachment; filename="photo.jpg"
Content-Transfer-Encoding: base64
/9j/4AAQSkZJRg==
--sp04j--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// image/gif attachment
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04K gif
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04k"
--sp04k
Content-Type: text/plain
Main body with gif
--sp04k
Content-Type: image/gif; name="icon.gif"
Content-Disposition: attachment; filename="icon.gif"
Content-Transfer-Encoding: base64
R0lGODlhAQABAIAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==
--sp04k--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// application/vnd.ms-excel
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04G excel
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04g"
--sp04g
Content-Type: text/plain
Main body
--sp04g
Content-Type: application/vnd.ms-excel; name="data.xls"
Content-Disposition: attachment; filename="data.xls"
Content-Transfer-Encoding: base64
dGVzdCBleGNlbA==
--sp04g--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// application/vnd.ms-powerpoint
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04H ppt
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04h"
--sp04h
Content-Type: text/plain
Main body
--sp04h
Content-Type: application/vnd.ms-powerpoint; name="slides.ppt"
Content-Disposition: attachment; filename="slides.ppt"
Content-Transfer-Encoding: base64
dGVzdCBwcHQ=
--sp04h--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// application/msword
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04I word
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04i"
--sp04i
Content-Type: text/plain
Main body
--sp04i
Content-Type: application/msword; name="spec.doc"
Content-Disposition: attachment; filename="spec.doc"
Content-Transfer-Encoding: base64
dGVzdCB3b3Jk
--sp04i--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// application/zip
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04Z zip
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04z"
--sp04z
Content-Type: text/plain
Main body
--sp04z
Content-Type: application/zip; name="archive.zip"
Content-Disposition: attachment; filename="archive.zip"
Content-Transfer-Encoding: base64
dGVzdCB6aXA=
--sp04z--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// image/pjpeg (Bug 4585) - email04K
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email04K pjpeg
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="sp04kp"
--sp04kp
Content-Type: text/plain
Main body with pjpeg
--sp04kp
Content-Type: image/pjpeg; name="photo2.jpg"
Content-Disposition: attachment; filename="photo2.jpg"
Content-Transfer-Encoding: base64
/9j/4AAQSkZJRg==
--sp04kp--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
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
	it('Functional | Login as the appropriate test account', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});


	it('Functional | Verify that a search for adobe PDF is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"application/pdf"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse?.m, 'Response element should exist');
	});


	it('Functional | Verify that a search for application, x-tar is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"application/x-tar"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for text, calendar is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"text/calendar"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for text, plain is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"text/plain"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for text, html is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"text/html"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for text, richtext is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"text/richtext"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for image is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"image"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for image, jpeg is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"image/jpeg"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse?.m, 'Response element should exist');
	});


	it('Functional | Verify that a search for image, gif is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"image/gif"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for application, vndms-excel is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"application/vnd.ms-excel"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for application, vndms-powerpoint is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"application/vnd.ms-powerpoint"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for application, msword is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"application/msword"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for application, zip is successful', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:("application/x-zip-compressed" OR "application/zip")</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for adobe PDF is successful (Content-Type - application, octet-stream) (Bug: 4533)', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"application/pdf"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for image, jpeg is successful (Content-Type - image, pjpeg) (Bug: 4585)', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>attachment:"image/jpeg"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse?.m, 'Response element should exist');
	});
});
