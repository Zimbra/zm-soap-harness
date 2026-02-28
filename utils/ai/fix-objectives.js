const fs = require('fs');
const path = require('path');

function walk(d) {
	const r = [];
	try {
		fs.readdirSync(d).forEach(f => {
			const p = path.join(d, f);
			fs.statSync(p).isDirectory() ? r.push(...walk(p)) : r.push(p);
		});
	} catch (e) { }
	return r;
}

// Scope: pass directory as argument, default to Admin/Accounts
const xmlDir = process.argv[2] || 'data/soapvalidator/Admin/Accounts';
const files = walk(xmlDir).filter(f => f.endsWith('.xml'));

let totalFiles = 0;
let totalFixed = 0;

files.forEach(filePath => {
	const content = fs.readFileSync(filePath, 'utf8');
	let changed = false;

	const newContent = content.replace(/<t:objective>([\s\S]*?)<\/t:objective>/g, (match, text) => {
		let cleaned = text;

		// 1. Remove smart quotes, backticks, acute accents
		cleaned = cleaned.replace(/[\u2018\u2019\u201C\u201D\u0060\u00B4]/g, '');

		// 2. Remove single and double quotes
		cleaned = cleaned.replace(/['"]/g, '');

		// 3. Remove backslashes
		cleaned = cleaned.replace(/\\/g, '');

		// 4. Replace full-width spaces with regular spaces
		cleaned = cleaned.replace(/\u3000/g, ' ');

		// 5. Collapse newlines and tabs to single space (make single-line)
		cleaned = cleaned.replace(/[\r\n\t]+/g, ' ');

		// 6. Collapse multiple spaces to single space
		cleaned = cleaned.replace(/  +/g, ' ');

		// 7. Trim leading/trailing whitespace
		cleaned = cleaned.trim();

		if (cleaned !== text.trim()) {
			changed = true;
			totalFixed++;
			console.log(path.relative(xmlDir, filePath) + ': ' + text.trim().substring(0, 60));
		}

		return '<t:objective>' + cleaned + '</t:objective>';
	});

	if (changed) {
		fs.writeFileSync(filePath, newContent);
		totalFiles++;
	}
});

console.log('\nFiles modified: ' + totalFiles);
console.log('Objectives fixed: ' + totalFixed);
