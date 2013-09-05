'use strict';

var assert = require('chai').assert;
var decompress = require('../lib/decompress-zip');
var pkg = require('../package.json');
var path = require('path');
var glob = require('glob');
var exec = require('child_process').exec;
var tmp = require('tmp');
var assetsPath = path.join(__dirname, 'assets');

var samples = glob.sync('*/archive.zip', {cwd: assetsPath});

if (samples.length === 0) {
    console.log('No sample ZIP files were found. Run "grunt test-files" to download them.');
    process.exit(1);
}

describe('Smoke test', function () {
    it('should find the public interface', function () {
        assert.strictEqual(decompress.version, pkg.version, 'decompress.version is correct');
        assert.isFunction(decompress.extract, 'decompress.extract is a function');
        assert.isFunction(decompress.extract, 'decompress.list is a function');
    });
});

describe('Extract', function () {
    samples.forEach(function (sample) {
        var extracted = path.join(path.dirname(sample), 'extracted');

        describe(sample, function () {
            var tmpDir;

            before(function (done) {
                tmp.dir({unsafeCleanup: true}, function (err, dir) {
                    if (err) {
                        throw err;
                    }

                    tmpDir = dir;
                    done();
                });
            });

            it('should extract without any errors', function (done) {
                this.timeout(10000);
                decompress.extract(path.join(assetsPath, sample), {path: tmpDir})
                .then(function () {
                    assert(true, 'success callback executed');
                    done();
                })
                .done();
            });

            it('should have the same output files as expected', function (done) {
                exec('diff -qr ' + extracted + ' ' + tmpDir, {cwd: assetsPath}, function (err, stdout, stderr) {
                    if (err) {
                        if (err.code === 1) {
                            assert(false, 'output should match');
                        } else {
                            throw err;
                        }
                    }
                    assert.equal(stdout, '');
                    assert.equal(stderr, '');
                    done();
                });
            });
        });
    });
});
