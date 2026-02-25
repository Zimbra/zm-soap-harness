import config from '../../conf/config.js';
import common from '../core/common.js';
import calDavClient from 'dav';

const xhr = userDetails => {
	return new calDavClient.transport.Basic(
		new calDavClient.Credentials({
			username: userDetails.userEmailAddress,
			password: userDetails.userPassword
		})
	);
};

const caldav = {
	async createCalDavAccount(userDetails) {
		try {
			const account = await calDavClient.createAccount({
				server: `https://${config.serverHost}:${config.clientPort}/dav/${userDetails.userEmailAddress}/Calendar`,
				accountType: 'caldav',
				loadObjects: true,
				xhr: xhr(userDetails)
			});
			return account;

		} catch (error) {
			common.error('Error occurred at getCalendar', error);
			return null;
		}
	},

	async getCalendars(userDetails) {
		try {
			const account = await this.createCalDavAccount(userDetails);
			if (account === null || account.calendars === null) {
				common.log(`Account or calendar not found account = ${account} and calendar = ${account.calendars}`);
				return null;
			}

			const userCalendars = [];
			for (let i = 0; i < account.calendars.length; i++) {
				userCalendars.push(account.calendars[i].displayName);
				common.log(`Fetched folder: ${account.calendars[i].displayName}`);
			}
			return userCalendars;

		} catch (error) {
			common.error('Error occurred at getCalendar', error);
			return null;
		}
	},

	async searchEvent(eventName, userDetails) {
		try {
			const account = await this.createCalDavAccount(userDetails);

			// Sync Calendar in CalDAV account
			common.log('Syncing CalDAV - Calendar folder');
			const synced = await calDavClient.syncCaldavAccount(account, { xhr: xhr(userDetails) });
			const defaultCalendar = synced.calendars[0];
			const objects = defaultCalendar.objects;

			for (let index = 0; index < objects.length; index++) {
				if (objects[index].calendarData.includes(eventName)) {
					common.log(`Found event ${eventName} in CalDAV - Calendar folder`);
					return true;
				}
			}
			return false;

		} catch (error) {
			common.error('Error occurred at searchEvent', error);
			return null;
		}
	}
};

export default caldav;
