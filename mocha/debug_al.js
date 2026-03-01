import soap from './framework/backend/soap-client.js';
import config from './conf/config.js';
import common from './framework/core/common.js';

const adminAuthToken = await soap.getAdminAuthToken();
const uid = common.getUniqueString();
const domain1Name = `testdomain1.${uid}.com`;

// Create domain
const domRes = await soap.makeSOAPEnvelopeAdmin(
    `<CreateDomainRequest xmlns="urn:zimbraAdmin">
		<name>${domain1Name}</name>
	</CreateDomainRequest>`, adminAuthToken
);
console.log('DOMAIN:', JSON.stringify(domRes.Fault || 'OK'));

// Create address list
const al1Name = `al1_${uid}`;
const res = await soap.makeSOAPEnvelopeAdmin(
    `<CreateAddressListRequest type="account" xmlns="urn:zimbraAdmin">
		<name>${al1Name}</name>
		<desc>test desc</desc>
		<searchFilter>
			<conds not="false" or="1">
				<conds />
				<cond not="false" attr="department" op="has" value="QA" />
			</conds>
		</searchFilter>
		<domain by="name">${domain1Name}</domain>
	</CreateAddressListRequest>`, adminAuthToken
);
console.log('CREATE AL FAULT:', JSON.stringify(res.Fault, null, 2));
console.log('CREATE AL RESPONSE:', JSON.stringify(res.CreateAddressListResponse, null, 2));
