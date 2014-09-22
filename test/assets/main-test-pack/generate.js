// This is how this pack was generated.
// You can use this code to amend it, or to create other packs for different
// test (then of course you have manually compress it).
// This chain of commands does the compression on Ubuntu:
/*
node generate.js
cd extracted
zip -r -0 ../store.zip .
zip -r ../deflate.zip .
cd ..

*/

'use strict';

var jetpack = require('fs-jetpack');

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

// Generate the files structure
var root = jetpack.dir('extracted', { empty: true });
root
    .dir('dir1')
        .dir('dir2')
            .file('0B', { content: zero })
            .file('1KiB', { content: oneKib })
            .file('2MiB', { content: twoMib })
root
    .dir('empty');

// Generate spec file to which we can later compare
// our extracted stuff during tests.
var spec = jetpack.inspectTree('extracted', { checksum: 'sha1' });
jetpack.write('spec.json', spec, { jsonIndent: 2 });