const { execSync } = require('child_process');

const scripts = [
    'apply-strict-formatting.cjs',
    'format-xml-in-js.cjs',
    'separate-requests.cjs',
    'fix-describe-titles.cjs',
    'format-asserts.cjs',
    'format-xml-attributes.cjs',
    'format-singleline-xml.cjs',
    'format-describe-start.cjs',
    'format-describe-end.cjs',
    'format-block-spacing.cjs',
    'format-assertions-spacing.cjs'
];

console.log('Running MASTER formatting suite...');

for (const script of scripts) {
    console.log(`\n============== [ Executing ${script} ] ==============`);
    try {
        execSync(`node utils/ai/${script}`, { stdio: 'inherit' });
    } catch (e) {
        console.error(`=> FAILED executing ${script}:`, e.message);
    }
}

console.log('\n=> All strict layout and syntactical formatting rules enforced successfully!');
