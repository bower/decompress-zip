// This script generates zip files inside this folder.

'use strict';

var jetpack = require('fs-jetpack');
var archiver = require('archiver');

var mainDir = jetpack.cwd(__dirname);

// -------------------------------------------------------
// Generate files and folders which we next will compress
// -------------------------------------------------------

var fillWithSillyBytes = function (buf) {
    // Very predictable pattern leads to high compression
    // and not blowing up the size of this repo.
    for (var i = 0; i < buf.length; i += 1) {
        buf[i] = i % 256;
    }
    return buf;
};

var zero = new Buffer(0);
var oneKib = fillWithSillyBytes(new Buffer(1024));
var twoMib = fillWithSillyBytes(new Buffer(1024 * 1024 * 2));

var extractedDir = mainDir.dir('extracted', { empty: true });
extractedDir
    .dir('empty')
        .cwd('..')
    .dir('dir1')
        .dir('dir2')
            .file('0B', { content: zero })
            .file('1KiB', { content: oneKib })
            .file('2MiB', { content: twoMib });

// -------------------------------------------------------
// Generate spec file
// -------------------------------------------------------

// Generate spec file to which we can later compare
// our extracted stuff during tests.
var spec = mainDir.inspectTree('extracted', { checksum: 'sha1' });
mainDir.write('spec.json', spec, { jsonIndent: 2 });

// -------------------------------------------------------
// Compress to zip files
// -------------------------------------------------------

var compress = function (dest, useStore) {
    var output = mainDir.createWriteStream(dest);
    output.on('close', function () {
        console.log('Archive ' + dest + ' created.');
    });
    var archive = archiver('zip', { store: useStore });
    archive.on('error', function (err){
        console.log(err);
    });
    archive.pipe(output);
    archive.bulk([
        { expand: true, cwd: extractedDir.path(), src: ['**'] }
    ]);
    archive.finalize();
};

compress('store.zip', true);
compress('deflate.zip', false);
