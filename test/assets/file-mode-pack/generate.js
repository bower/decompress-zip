// This script generates zip files inside this folder.

'use strict';

var jetpack = require('fs-jetpack');
var archiver = require('archiver');

var mainDir = jetpack.cwd(__dirname);

// -------------------------------------------------------
// Generate files and folders which we next will compress
// -------------------------------------------------------

var extractedDir = mainDir.dir('extracted', { empty: true, mode: '755' });
extractedDir
    .dir('dir1', { mode: '755' })
        .cwd('..')
    .dir('dir2', { mode: '711' })
        .cwd('..')
    .file('file1', { content: 'abc', mode: '755' })
    .file('file2', { content: 'xyz', mode: '711' });

// -------------------------------------------------------
// Generate spec file
// -------------------------------------------------------

// Generate spec file to which we can later compare
// our extracted stuff during tests.
var spec = mainDir.inspectTree('extracted', { checksum: 'sha1', mode: true });
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
