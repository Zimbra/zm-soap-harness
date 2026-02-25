import config from '../../conf/config.js';
import common from '../core/common.js';
import cardDavClient from 'dav';

const xhr = userDetails => {
	return new cardDavClient.transport.Basic(
		new cardDavClient.Credentials({
			username: userDetails.userEmailAddress,
			password: userDetails.userPassword
		})
	);
};

const carddav = {
	async getContacts(userDetails) {
		try {
			const client = new cardDavClient.Client(xhr(userDetails));
			const account = await client.createAccount({
				server: `https://${config.serverHost}:${config.clientPort}/dav/${userDetails.userEmailAddress}/Contacts`,
				accountType: 'carddav',
				loadObjects: true,
			});

			if (account === null || account.addressBooks === null) {
				common.log(`Account or contact not found account = ${account} and contact = ${account.addressBooks}`);
				return null;
			}

			const userContacts = [];
			for (let i = 0; i < account.addressBooks.length; i++) {
				userContacts.push(account.addressBooks[i].displayName);
				common.log(`Fetched folder: ${account.addressBooks[i].displayName}`);
			}
			return userContacts;

		} catch (error) {
			common.error('Error occurred at getContacts', error);
			return null;
		}
	}
};

export default carddav;
