#!/usr/bin/env node
'use strict';

var decompress = require('../lib/decompress-zip');
decompress.extract(process.argv[2]).done();
