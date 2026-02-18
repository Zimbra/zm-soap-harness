/* Mocha spec and junit reporter */

import path from 'node:path';
import Spec from 'mocha/lib/reporters/spec.js';
import MochaJUnitReporter from 'mocha-junit-reporter';

class mochaReporter {
	constructor(runner, options = {}) {
		new Spec(runner, options);

		const reporterOptions = {
			...options.reporterOptions,
			mochaFile: options.reporterOptions?.mochaFile
				? path.resolve(process.cwd(), options.reporterOptions.mochaFile)
				: path.join(process.cwd(), 'test-reports', 'test-report.xml')
		};

		let hasTests = false;
		runner.on('test', () => {
			hasTests = true;
		});

		runner.once('suite', suite => {
			if (!suite.root || !hasTests) return;
			new MochaJUnitReporter(runner, { reporterOptions });
		});
	}
}

export default mochaReporter;