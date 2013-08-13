#!/usr/bin/env node
'use strict';

var decompress = require('../decompress');

var zip = new decompress.Zip(process.argv[2]);

zip.extract().then(function (files) {
	console.log(files);

}).done();
