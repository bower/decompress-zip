'use strict';

// The zip file spec is at http://www.pkware.com/documents/casestudies/APPNOTE.TXT

var fs = require('fs'),
	Q = require('q'),
	path = require('path'),
	zlib = require('zlib'),
	EndOfCentralDirectoryRecord = require('./end-of-central-directory-record'),
	CentralDirectoryHeader = require('./central-directory-header'),
	FileEntry = require('./file-entry');

var signatures = {
		LOCAL_FILE_HEADER: 0x04034b50,
		DATA_DESCRIPTOR_RECORD: 0x08074b50,
		ARCHIVE_EXTRA_DATA: 0x08064b50,
		CENTRAL_FILE_HEADER: 0x02014b50,
		HEADER: 0x05054b50,
		ZIP64_END_OF_CENTRAL_DIRECTORY: 0x06064b50,
		ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR: 0x07064b50,
		END_OF_CENTRAL_DIRECTORY: 0x06054b50
	},
	huntSize = 32 * 1024;

// Denodify some node lib methods

var fstat = Q.denodeify(fs.fstat),
	mkpath = Q.denodeify(require('mkpath')),
	read = Q.denodeify(fs.read),
	fopen = Q.denodeify(fs.open),
	writeFile = Q.denodeify(fs.writeFile),
	inflateRaw = Q.denodeify(zlib.inflateRaw);

// Utility methods

// Directory here means the ZIP Central Directory, not a folder
var readDirectory = function (fd) {
	var files = [],
		self = this;

	return this._p.fstat
		.then(function (stats) {
			// We're going to read the whole fine into a buffer. This may need
			// to change in the future.
			return read(fd, new Buffer(stats.size), 0, stats.size, 0);
		})
		.then(function (result) {
			var bytesRead = result[0],
				index = Math.max(bytesRead - huntSize, 0),
				chunk = '',
				directoryEntry,
				fileEntry;

			self.fileBuffer = result[1];

			// Hunt in the last 32k for the central directory signature.
			// Apparently the ZIP spec is not very good and it is impossible to
			// guarantee that you have read a zip file correctly, or to determine
			// the location of the CD without hunting.
			while (index < bytesRead - 4 && chunk !== signatures.END_OF_CENTRAL_DIRECTORY) {
				chunk = self.fileBuffer.readUInt32LE(index);
				index++;
			}

			if (chunk !== signatures.END_OF_CENTRAL_DIRECTORY) {
				throw new Error('Could not find the End of Central Directory Record');
			}

			index--;

			var record = new EndOfCentralDirectoryRecord(self.fileBuffer.slice(index));

			index = 0;

			var directoryBuffer = self.fileBuffer.slice(record.directoryOffset, record.directoryOffset + record.directorySize);

			for (var i = 0; i < record.directoryEntryCount; i++) {
				directoryEntry = new CentralDirectoryHeader(directoryBuffer.slice(index));
				fileEntry = new FileEntry(self.fileBuffer.slice(directoryEntry.relativeOffsetOfLocalHeader));
				index += directoryEntry.headerLength;
				files[i] = {
					name: directoryEntry.fileName,
					directoryEntry: directoryEntry,
					fileEntry: fileEntry,
					dataOffset: directoryEntry.relativeOffsetOfLocalHeader + fileEntry.entryLength
				};
			}

			return files;

		});
};


var extractFolder = function (folder, destination) {
	return mkpath(destination)
		.then(function () {
			return {folder: folder.name};
		});
};

var extractUncompressed = function (file, destination) {
	var content = this.fileBuffer.slice(file.dataOffset, file.dataOffset + file.directoryEntry.uncompressedSize);

	return mkpath(path.dirname(destination))
		.then(writeFile.bind(null, destination, content))
		.then(function () {
			return {uncompressed: file.name, content: content.toString().substring(0, 20)};
		});
};

var extractDeflated = function (file, destination) {
	return inflateRaw(this.fileBuffer.slice(file.dataOffset))
		.then(function (content) {
			return mkpath(path.dirname(destination))
				.then(writeFile.bind(null, destination, content))
				.then(function () {
					return {deflated: file.name, content: content.toString().substring(0, 20)};
				});
		});

};

var extract = function (file, destination) {
	destination = path.join(destination, file.name);

	if (file.name.substr(-1) === '/') {
		return extractFolder(file, destination);
	}

	switch (file.directoryEntry.compressionMethod) {
	case 0:
		return extractUncompressed.bind(this)(file, destination);

	case 8:
		return extractDeflated.bind(this)(file, destination);

	default:
		throw new Error('Unsupported compression type');
	}
};

// Class definition

var Zip = function (filename) {
	this.filename = filename;
	this.fileBuffer = null;

	// When we need a resource, we should check if there is a promise for it
	// already and use that. If the promise is already fulfilled we don't do the
	// async work again and we get to queue up dependant tasks.
	this._p = {}; // _p instead of _promises because it is a lot easier to read
	this._p.fd = fopen(filename, 'r');
	this._p.fstat = this._p.fd
		.then(fstat);
	this._p.directory = this._p.fd
		.then(readDirectory.bind(this));
};

Zip.prototype = {
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
						.then(extract.bind(self, file, options.path))
						.then(function (result) {
							results.push(result);
						});
				});

				return promise.then(function () {
					return results;
				});
			});
	}
};

module.exports = Zip;
