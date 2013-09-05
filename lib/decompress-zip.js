'use strict';

// The zip file spec is at http://www.pkware.com/documents/casestudies/APPNOTE.TXT
// TODO: There is fair chunk of the spec that I have ignored. Need to add
// assertions everywhere to make sure that we are not dealing with a ZIP type
// that I haven't designed for. Things like spanning archives, non-DEFLATE
// compression, encryption, etc.
var fs = require('fs');
var Q = require('q');
var path = require('path');
var structures = require('./structures');
var signatures = require('./signatures');
var extractors = require('./extractors');
var huntSize = 1024; // We will search the last 1kb for END_OF_CENTRAL_DIRECTORY

// Denodify some node lib methods

var fstat = Q.denodeify(fs.fstat);
var read = Q.denodeify(fs.read);
var fopen = Q.denodeify(fs.open);

// Class definition

function Zip(filename) {
    this.filename = filename;
    this.fileBuffer = null;

    // When we need a resource, we should check if there is a promise for it
    // already and use that. If the promise is already fulfilled we don't do the
    // async work again and we get to queue up dependant tasks.
    this._p = {}; // _p instead of _promises because it is a lot easier to read
    this._p.fd = fopen(filename, 'r');
    this._p.fstat = this._p.fd
    .then(fstat);

    this._p.fileBuffer = this._p.fd
    .then(this.getSearchBuffer.bind(this));

    this._p.directory = this._p.fileBuffer
    .then(this.findEndOfDirectory.bind(this))
    .then(this.readDirectory.bind(this));
}

Zip.prototype = {
    list: function () {
        return this._p.directory
        .then(function (files) {
            var result = [];

            files.forEach(function (file) {
                result.push(file.name);
            });

            return result;
        });
    },
    extract: function (options) {
        var self = this;

        options = options || {};
        options.path = options.path || '.';

        return this._p.directory
        .then(function (files) {
            var promise = Q.fcall(function () { return 10; });
            var results = [];

            files.forEach(function (file) {
                promise = promise
                .then(self._extract.bind(self, file, options.path))
                .then(function (result) {
                    results.push(result);
                });
            });

            return promise.then(function () {
                return results;
            });
        });
    },
    // Utility methods
    getSearchBuffer: function (fd) {
        return this._p.fstat
        .then(function (stats) {
            var size = Math.min(stats.size, huntSize);
            return read(fd, new Buffer(size), 0, size, stats.size - size);
        })
        .then(function (result) {
            return result[1];
        });
    },
    findEndOfDirectory: function (buffer) {
        var index = buffer.length - 3;
        var chunk = '';

        // Apparently the ZIP spec is not very good and it is impossible to
        // guarantee that you have read a zip file correctly, or to determine
        // the location of the CD without hunting.
        // Search backwards through the buffer, as it is very likely to be near the
        // end of the file.
        while (index > Math.max(buffer.length - huntSize, 0) && chunk !== signatures.END_OF_CENTRAL_DIRECTORY) {
            index--;
            chunk = buffer.readUInt32LE(index);
        }

        if (chunk !== signatures.END_OF_CENTRAL_DIRECTORY) {
            throw new Error('Could not find the End of Central Directory Record');
        }

        return buffer.slice(index);
    },
    // Directory here means the ZIP Central Directory, not a folder
    readDirectory: function (recordBuffer) {
        var files = [];
        var self = this;
        var record = structures.readEndRecord(recordBuffer);

        var directoryStream = fs.createReadStream(self.filename, {
            start: record.directoryOffset,
            end: record.directoryOffset + record.directorySize
        });

        return structures.readDirectory(directoryStream, record.directoryEntryCount)
        .then(function (directory) {
            var promises = [];

            directory.forEach(function (directoryEntry, index) {
                var fileStream = fs.createReadStream(self.filename, {
                    start: directoryEntry.relativeOffsetOfLocalHeader
                });
                var promise = structures.readFileEntry(fileStream, directoryEntry.relativeOffsetOfLocalHeader)
                .then(function (fileEntry) {
                    files[index] = {
                        name: directoryEntry.fileName,
                        directoryEntry: directoryEntry,
                        fileEntry: fileEntry,
                        dataOffset: directoryEntry.relativeOffsetOfLocalHeader + fileEntry.entryLength
                    };
                });

                promises.push(promise);
            });

            return Q.all(promises)
            .then(function () {
                return files;
            });
        });
    },
    _extract: function (file, destination) {
        destination = path.join(destination, file.name);

        // TODO: This actually needs to come from the externalAttributes
        if (file.name.substr(-1) === '/') {
            return extractors.folder(file, destination);
        }

        // Possible compression methods:
        //    0 - The file is stored (no compression)
        //    1 - The file is Shrunk
        //    2 - The file is Reduced with compression factor 1
        //    3 - The file is Reduced with compression factor 2
        //    4 - The file is Reduced with compression factor 3
        //    5 - The file is Reduced with compression factor 4
        //    6 - The file is Imploded
        //    7 - Reserved for Tokenizing compression algorithm
        //    8 - The file is Deflated
        //    9 - Enhanced Deflating using Deflate64(tm)
        //   10 - PKWARE Data Compression Library Imploding (old IBM TERSE)
        //   11 - Reserved by PKWARE
        //   12 - File is compressed using BZIP2 algorithm
        //   13 - Reserved by PKWARE
        //   14 - LZMA (EFS)
        //   15 - Reserved by PKWARE
        //   16 - Reserved by PKWARE
        //   17 - Reserved by PKWARE
        //   18 - File is compressed using IBM TERSE (new)
        //   19 - IBM LZ77 z Architecture (PFS)
        //   97 - WavPack compressed data
        //   98 - PPMd version I, Rev 1

        switch (file.directoryEntry.compressionMethod) {
        case 0:
            return extractors.store(file, destination, this.filename);

        case 8:
            return extractors.deflate(file, destination, this.filename);

        default:
            throw new Error('Unsupported compression type');
        }
    }
};

module.exports = {
    extract: function (filename, options) {
        var zip = new Zip(filename);
        return zip.extract(options);
    },
    list: function (filename) {
        var zip = new Zip(filename);
        return zip.list();
    },
    version: require('../package.json').version
};

