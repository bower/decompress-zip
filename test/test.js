'use strict';

var assert = require('chai').assert;
var decompress = require('../lib/decompress-zip');
var pkg = require('../package.json');
var samples = [];

describe('Smoke test', function () {
    it('should find the public interface', function () {
        assert.strictEqual(decompress.version, pkg.version, 'decompress.version is correct');
        assert.isFunction(decompress.extract, 'decompress.extract is a function');
        assert.isFunction(decompress.extract, 'decompress.list is a function');
    });
});

describe('Extract', function () {
    samples.forEach(function (sample) {
        describe(sample, function () {
            it('should have the same output files as expected');
            it('should correctly produce the file contents');
            it('should set the correct permissions and ownership');
        });
    });
});
