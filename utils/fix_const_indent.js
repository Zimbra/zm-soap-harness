import fs from 'fs';
import path from 'path';

const dir = 'C:/git/zm-soap-harness/mocha/tests/admin/accounts';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const f of files) {
	const p = path.join(dir, f);
	const content = fs.readFileSync(p, 'utf8');
	// replace exact unindented "const test" with "\tconst test"
	let newContent = content.replace(/^const test/gm, '\tconst test');
	if (content !== newContent) {
		fs.writeFileSync(p, newContent);
		console.log('Fixed indentation in:', f);
	}
}
