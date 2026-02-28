const fs = require('fs');
const path = require('path');

const xmlDir = 'data/soapvalidator/Folders';
const jsDir = 'mocha/tests/folders';

function countTests(filePath, type) {
	if (!fs.existsSync(filePath)) return 0;
	const content = fs.readFileSync(filePath, 'utf8');
	if (type === 'xml') {
		const matches = content.match(/<t:test_case/g);
		return matches ? matches.length : 0;
	} else {
		const matches = content.match(/it\s*\(/g);
		return matches ? matches.length : 0;
	}
}

function compare(xmlPath, jsPath, relPath = '') {
	const items = fs.readdirSync(xmlPath);

	console.log(`| File/Folder | XML Count | JS Count | Difference |`);
	console.log(`| :--- | :---: | :---: | :---: |`);

	items.forEach(item => {
		const xmlItemPath = path.join(xmlPath, item);
		const jsItemPath = path.join(jsPath, item.toLowerCase().replace('.xml', '.js'));
		const stat = fs.statSync(xmlItemPath);

		if (stat.isDirectory()) {
			// For now just mentioning directories, recurrence would be needed for full tree
			// But I'll stick to top level for this script or recurse if simple
			// Let's recurse
			// console.log(`| [DIR] ${path.join(relPath, item)} | - | - | - |`);
			// Actually, the structure matches, so let's just recurse
			// But JS filenames are lowercased.
		} else if (item.endsWith('.xml')) {
			const xmlCount = countTests(xmlItemPath, 'xml');
			const jsCount = countTests(jsItemPath, 'js');
			const diff = xmlCount - jsCount;
			if (diff !== 0) {
				console.log(`| ${path.join(relPath, item)} | ${xmlCount} | ${jsCount} | ${diff} |`);
			}
		}
	});
}

compare(xmlDir, jsDir);
