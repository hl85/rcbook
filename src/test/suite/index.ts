import * as path from 'path';

export function run(): Promise<void> {
    console.log('Running tests from:', __dirname);
    
    const projectRoot = path.resolve(__dirname, '../../..');
    const mochaPath = path.resolve(projectRoot, 'node_modules/mocha');
    const globPath = path.resolve(projectRoot, 'node_modules/glob');

    console.log('Attempting to require mocha from:', mochaPath);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Mocha = require(mochaPath);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const glob = require(globPath);

	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((resolve, reject) => {
		glob('suite/**.test.js', { cwd: testsRoot }, (err: any, files: any[]) => {
			if (err) {
				return reject(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run((failures: number) => {
					if (failures > 0) {
						reject(new Error(`${failures} tests failed.`));
					} else {
						resolve();
					}
				});
			} catch (err) {
				console.error(err);
				reject(err);
			}
		});
	});
}
