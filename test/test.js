'use strict';

var assert = require('chai').assert;
var jetpack = require('fs-jetpack');
var tmp = require('tmp');
var DecompressZip = require('../lib/decompress-zip');

var assetsDir = jetpack.cwd(__dirname, 'assets');

var samples = [];

// ------------------------------------------
// main-test-pack
// Most common stuff you may want to extract.

// Default deflate algorithm
samples.push({
    file: 'main-test-pack/deflate.zip',
    treeInspect: 'main-test-pack/spec.json',
    inspectOptions: {}
});
// "Store" (no compression, just merge stuff together)
samples.push({
    file: 'main-test-pack/store.zip',
    treeInspect: 'main-test-pack/spec.json',
    inspectOptions: {}
});

// ------------------------------------------
// file-mode-pack
// Test if files preserve theirs unix file mode when extracted.
// This test doesn't make sense on Windows platform, so exlude it there.
if (process.platform !== 'win32') {
    // Default deflate algorithm
    samples.push({
        file: 'file-mode-pack/deflate.zip',
        treeInspect: 'file-mode-pack/spec.json',
        inspectOptions: { mode: true }
    });
    // "Store" (no compression, just merge stuff together)
    samples.push({
        file: 'file-mode-pack/store.zip',
        treeInspect: 'file-mode-pack/spec.json',
        inspectOptions: { mode: true }
    });
}

describe('Smoke test', function () {
    it('should find the public interface', function () {
        assert.isFunction(DecompressZip, 'constructor is a function');
        assert.isFunction(DecompressZip.prototype.list, 'decompress.list is a function');
        assert.isFunction(DecompressZip.prototype.extract, 'decompress.extract is a function');
    });
});

describe('Extract', function () {
    describe('errors', function () {
        var tmpDir;

        beforeEach(function (done) {
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

        it('should emit a progress event on each file', function (done) {
            var zip = new DecompressZip(assetsDir.path(samples[0].file));
            var numProgressEvents = 0;
            var numTotalFiles = 6;

            zip.on('progress', function (i, numFiles) {
                assert.equal(numFiles, numTotalFiles, '"progress" event should include the correct number of files');
                assert(typeof i === 'number', '"progress" event should include the number of the current file');
                numProgressEvents++;
            });

            zip.on('extract', function () {
                assert(true, '"extract" event should fire');
                assert.equal(numProgressEvents, numTotalFiles, 'there should be a "progress" event for every file');
                done();
            });

            zip.on('error', done);

            zip.extract({path: tmpDir.path()});
        });
    });

    describe('directory creation', function () {
        var tmpDir;
        var rmdirSync;
        before(function (done) {
            tmp.dir({unsafeCleanup: true}, function (err, dir, cleanupCallback) {
                if (err) {
                    throw err;
                }

                tmpDir = jetpack.cwd(dir, 'extracted');
                rmdirSync = cleanupCallback;
                done();
            });
        });

        it('should create necessary directories, even on 2nd run', function (done) {
            var zip = new DecompressZip(assetsDir.path(samples[0].file));
            zip.on('error', done);
            zip.on('extract', function () {
                rmdirSync(tmpDir.path());
                var zip2 = new DecompressZip(assetsDir.path(samples[0].file));
                zip2.on('error', done);
                zip2.on('extract', function () {
                    done();
                });
                zip2.extract({path: tmpDir.path()});
            });

            zip.extract({path: tmpDir.path()});
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

                    tmpDir = jetpack.dir(dir + '/extracted', { mode: '755' });
                    done();
                });
            });

            it('should extract without any errors', function (done) {
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

            it('extracted files should match the spec', function (done) {
                var options = sample.inspectOptions;
                options.checksum = 'sha1';

                tmpDir.inspectTreeAsync('.', options)
                .then(function (inspect) {
                    var validInspect = assetsDir.read(sample.treeInspect, 'json');
                    assert.deepEqual(inspect, validInspect, 'extracted files are matching the spec');
                    done();
                })
                .catch(done);
            });
        });
    });
});
