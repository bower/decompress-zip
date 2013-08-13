'use strict';

var EndOfCentralDirectoryRecord = function (buffer) {
	var index = 0;
	this.signature = buffer.readUInt32LE(index);
	index += 4;
	this.diskNumber = buffer.readUInt16LE(index);
	index += 2;
	this.directoryStartDisk = buffer.readUInt16LE(index);
	index += 2;
	this.directoryEntryCountDisk = buffer.readUInt16LE(index);
	index += 2;
	this.directoryEntryCount = buffer.readUInt16LE(index);
	index += 2;
	this.directorySize = buffer.readUInt16LE(index);
	index += 4;
	this.directoryOffset = buffer.readUInt32LE(index);
	index += 4;
	this.commentLength = buffer.readUInt16LE(index);
	index += 2;
	if (this.commentLength > 0) {
		this.comment = buffer.toString('utf-8', index, index + this.commentLength);
	} else {
		this.comment = '';
	}
};

module.exports = EndOfCentralDirectoryRecord;
