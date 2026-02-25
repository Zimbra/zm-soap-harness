import config from '../conf/config.js';
import common from '../framework/core/common.js';

class Main {
	async before(ctx) {
		await common.configuration(import.meta.url, ctx);
	}

	async beforeEach(ctx) {
		common.log(`++++++++++++++ Starting ${ctx.currentTest.title} ++++++++++++++`);
	}

	async afterEach(ctx) {
		common.log(`++++++++++++++ Ending ${ctx.currentTest.title} ++++++++++++++`);
	}

	// Matching tests
	isZimbra101OrX() {
		const env = String(config.serverEnvironment).toUpperCase();
		return /ZIMBRA101|ZIMBRAX/.test(env);
	}
	isSerial() {
		return String(config.serial).toUpperCase() === 'TRUE';
	}
	isZimbra101OrXAndSerial() {
		return this.isZimbra101OrX() && this.isSerial();
	}
	isZimbra101OrXAndNotSerial() {
		return this.isZimbra101OrX() && !this.isSerial();
	}

	async createAccountAndLogin() {
	}
}

export const main = new Main();