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

	async createAccountAndLogin() {
	}
}

export let main = new Main();