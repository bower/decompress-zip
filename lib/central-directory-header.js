'use strict';

var CentralDirectoryHeader = function (buffer) {
	var index = 0;
	this.signature = buffer.readUInt32LE(index);
	index += 4;
	this.versionMadeBy = buffer.readUInt16LE(index);
	index += 2;
	this.versionNeededToExtract = buffer.readUInt16LE(index);
	index += 2;
	this.generalPurposeBitFlag = buffer.readUInt16LE(index);
	index += 2;
	this.compressionMethod = buffer.readUInt16LE(index);
	index += 2;
	this.lastModFileTime = buffer.readUInt16LE(index);
	index += 2;
	this.lastModFileDate = buffer.readUInt16LE(index);
	index += 2;
	this.crc32 = buffer.readUInt32LE(index);
	index += 4;
	this.compressedSize = buffer.readUInt32LE(index);
	index += 4;
	this.uncompressedSize = buffer.readUInt32LE(index);
	index += 4;
	this.fileNameLength = buffer.readUInt16LE(index);
	index += 2;
	this.extraFieldLength = buffer.readUInt16LE(index);
	index += 2;
	this.fileCommentLength = buffer.readUInt16LE(index);
	index += 2;
	this.diskNumberStart = buffer.readUInt16LE(index);
	index += 2;
	this.internalFileAttributes = buffer.readUInt16LE(index);
	index += 2;
	this.externalFileAttributes = buffer.readUInt32LE(index);
	index += 4;
	this.relativeOffsetOfLocalHeader = buffer.readUInt32LE(index);
	index += 4;

	if (this.fileNameLength > 0) {
		this.fileName = buffer.toString('utf-8', index, index + this.fileNameLength);
		index += this.fileNameLength;
	} else {
		this.fileName = '';
	}

	if (this.extraFieldLength > 0) {
		this.extraField = buffer.toString('hex', index, index + this.extraFieldLength);
		index += this.extraFieldLength;
	} else {
		this.extraField = '';
	}

	if (this.fileCommentLength > 0) {
		this.fileComment = buffer.toString('utf-8', index, index + this.fileCommentLength);
		index += this.fileCommentLength;
	} else {
		this.fileComment = '';
	}

	this.headerLength = index;
};

module.exports = CentralDirectoryHeader;
