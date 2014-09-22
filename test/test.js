'use strict';

var assert = require('chai').assert;
var DecompressZip = require('../lib/decompress-zip');
var pkg = require('../package.json');
var tmp = require('tmp');
var jetpack = require('fs-jetpack');

var assetsDir = jetpack.cwd(__dirname, 'assets');

var samples = [
    // main-test-pack
    // Most common stuff you may want to extract.
    {
        // Default deflate algorithm
        file: 'main-test-pack/deflate.zip',
        treeInspect: 'main-test-pack/spec.json'
    },
    {
        // "Store" (no compression, just merge stuff together)
        file: 'main-test-pack/store.zip',
        treeInspect: 'main-test-pack/spec.json'
    },
];

describe('Smoke test', function () {
    it('should find the public interface', function () {
        assert.strictEqual(DecompressZip.version, pkg.version, 'DecompressZip.version is correct');
        assert.isFunction(DecompressZip, 'constructor is a function');
        assert.isFunction(DecompressZip.prototype.list, 'decompress.list is a function');
        assert.isFunction(DecompressZip.prototype.extract, 'decompress.extract is a function');
    });
});

describe('Extract', function () {
    describe('errors', function () {
        var tmpDir;

        before(function (done) {
            tmp.dir({unsafeCleanup: true}, function (err, dir) {
                if (err) {
                    throw err;
                }

                tmpDir = jetpack.cwd(dir, 'extracted');
                done();
            });
        });

        it('should emit an error when the file does not exist', function (done) {
            var zip = new DecompressZip('/my/non/existant/file.zip');

            zip.on('extract', function () {
                assert(false, '"extract" event should not fire');
                done();
            });

            zip.on('error', function (error) {
                assert(true, '"error" event should fire');
                done();
            });

            zip.extract({path: tmpDir.path()});
        });

        it('should emit an error when stripping deeper than the path structure', function (done) {
            var zip = new DecompressZip(assetsDir.path(samples[0].file));

            zip.on('extract', function () {
                assert(false, '"extract" event should not fire');
                done();
            });

            zip.on('error', function (error) {
                assert(true, '"error" event should fire');
                done();
            });

            zip.extract({path: tmpDir.path(), strip: 3});
        });
    });

    samples.forEach(function (sample) {
        describe(sample.file, function () {
            var tmpDir;

            before(function (done) {
                tmp.dir({unsafeCleanup: true}, function (err, dir) {
                    if (err) {
                        throw err;
                    }

                    tmpDir = jetpack.cwd(dir, 'extracted');
                    done();
                });
            });

            it('should extract without any errors', function (done) {
                this.timeout(60000);
                var zip = new DecompressZip(assetsDir.path(sample.file));

                zip.on('extract', function () {
                    assert(true, 'success callback should be called');
                    done();
                });

                zip.on('error', function () {
                    assert(false, 'error callback should not be called');
                    done();
                });

                zip.extract({path: tmpDir.path()});
            });

            it('should have the same output files as expected', function (done) {
                tmpDir.inspectTreeAsync('.', { checksum: 'sha1' })
                .then(function (inspect) {
                    var validInspect = assetsDir.read(sample.treeInspect, 'json');
                    assert.deepEqual(inspect, validInspect, 'extracted files matches the spec');
                    done();
                }).catch(done);
            });
        });
    });
});
