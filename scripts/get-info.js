const path = require('path');
const { randomBytes } = require('crypto');
const { appendFileSync, readFileSync } = require('fs');

const root = path.resolve(__dirname, '../');

const outfile = process.argv.slice(2).join(' ');
const output = (key, value) => {
    let data = "";
    if (/[\r\n]/.test(value)) {
        const delimiter = randomBytes(32).toString('base64');
        data = `${key}<<${delimiter}\n${value}\n${delimiter}`
    } else {
        data = `${key}=${value}`
    }

    appendFileSync(outfile, data + '\n', { encoding: 'utf-8' });
}

const packagePath = path.resolve(root, './package.json');
const package = JSON.parse(readFileSync(packagePath, 'utf-8'));

output('scriptname', package.scriptOutputName);
