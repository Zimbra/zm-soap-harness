const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '../../mocha/tests');

function getAllJsFiles(dir) {
	const results = [];
	const items = fs.readdirSync(dir);
	for (const item of items) {
		const full = path.join(dir, item);
		const stat = fs.statSync(full);
		if (stat.isDirectory()) results.push(...getAllJsFiles(full));
		else if (item.endsWith('.js')) results.push(full);
	}
	return results;
}

let totalFixes = 0;
const files = getAllJsFiles(TARGET_DIR);

for (const file of files) {
	let content = fs.readFileSync(file, 'utf8');
	const original = content;
	const newline = content.includes('\r\n') ? '\r\n' : '\n';
	const lines = content.split(newline);
	const newLines = [];

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];

		// Convert leading spaces to tabs (4 spaces = 1 tab)
		// Only convert the leading whitespace portion
		const match = line.match(/^( +)/);
		if (match) {
			const spaces = match[1];
			const tabCount = Math.floor(spaces.length / 4);
			const remainingSpaces = spaces.length % 4;
			const newIndent = '\t'.repeat(tabCount) + ' '.repeat(remainingSpaces);
			line = newIndent + line.substring(spaces.length);
		}

		newLines.push(line);
	}

	const newContent = newLines.join(newline);
	if (newContent !== original) {
		fs.writeFileSync(file, newContent, 'utf8');
		totalFixes++;
		console.log('FIXED: ' + path.relative(TARGET_DIR, file));
	}
}

console.log('\nDone! Fixed ' + totalFixes + ' files');
