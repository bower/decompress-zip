'use strict';

var binary = require('binary'),
	Q = require('q');

var readEndRecord = function (buffer) {
	var data = binary.parse(buffer)
		.word32lu('signature')
		.word16lu('diskNumber')
		.word16lu('directoryStartDisk')
		.word16lu('directoryEntryCountDisk')
		.word16lu('directoryEntryCount')
		.word32lu('directorySize')
		.word32lu('directoryOffset')
		.word16lu('commentLength')
		.buffer('comment', 'commentLength')
		.vars;

	data.comment = data.comment.toString();

	return data;
};

// Experimental, read a whole directory
var readDirectory = function (stream, count) {
	var deferred = Q.defer();

	var directory = [];

	var dataStream = binary().loop(function (end) {
			if (count-- <= 0) {
				return end();
			}
			this.flush();
			this.word32lu('signature')
				.word16lu('versionMadeBy')
				.word16lu('versionNeededToExtract')
				.word16lu('generalPurposeBitFlag')
				.word16lu('compressionMethod')
				.word16lu('lastModFileTime')
				.word16lu('lastModFileDate')
				.word32lu('crc32')
				.word32lu('compressedSize')
				.word32lu('uncompressedSize')
				.word16lu('fileNameLength')
				.word16lu('extraFieldLength')
				.word16lu('fileCommentLength')
				.word16lu('diskNumberStart')
				.word16lu('internalFileAttributes')
				.word32lu('externalFileAttributes')
				.word32lu('relativeOffsetOfLocalHeader')
				.buffer('fileName', 'fileNameLength')
				.buffer('extraField', 'extraFieldLength')
				.buffer('fileComment', 'fileCommentLength')
				.tap(function (data) {
					data.fileName = data.fileName.toString();
					data.fileComment = data.fileComment.toString();
					data.headerLength = 46 + data.fileNameLength + data.extraFieldLength + data.fileCommentLength;
					directory.push(data);
				});
		})
		.tap(function () {
			deferred.resolve(directory);
		});

	stream.pipe(dataStream);

	stream.on('error', deferred.reject.bind(deferred));
	dataStream.on('error', deferred.reject.bind(deferred));

	return deferred.promise;
};

var readFileEntry = function (stream) {
	var deferred = Q.defer();

	var dataStream = binary()
		.word32lu('signature')
		.word16lu('versionNeededToExtract')
		.word16lu('generalPurposeBitFlag')
		.word16lu('compressionMethod')
		.word16lu('lastModFileTime')
		.word16lu('lastModFileDate')
		.word32lu('crc32')
		.word32lu('compressedSize')
		.word32lu('uncompressedSize')
		.word16lu('fileNameLength')
		.word16lu('extraFieldLength')
		.buffer('fileName', 'fileNameLength')
		.buffer('extraField', 'extraFieldLength')
		.tap(function (data) {
			data.fileName = data.fileName.toString();
			data.entryLength = 30 + data.fileNameLength + data.extraFieldLength;
			deferred.resolve(data);
		});

	stream.pipe(dataStream);

	return deferred.promise;
};

module.exports = {
	readEndRecord: readEndRecord,
	readDirectory: readDirectory,
	readFileEntry: readFileEntry
};
