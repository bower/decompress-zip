var fs = require('fs');
var Q = require('q');
var path = require('path');
var zlib = require('zlib');
var touch = Q.denodeify(require('touch'));
var mkpath = Q.denodeify(require('mkpath'));
var cache = {};

// Use a cache of promises for building the directory tree. This allows us to
// correctly queue up file extractions for after their path has been created,
// avoid trying to create the path twice and still be async.
var mkdir = function (dir) {
    dir = path.normalize(dir + path.sep);

    if (!cache[dir]) {
        var parent;

        if (dir === '/') {
            parent = new Q();
        } else {
            parent = mkdir(path.dirname(dir));
        }

        cache[dir] = parent.then(function () {
            return mkpath(dir);
        });
    }

    return cache[dir];
};

// Utility methods for writing output files
var extractors = {
    folder: function (folder, destination) {
        return mkdir(destination)
        .then(function () {
            return {folder: folder.name};
        });
    },
    store: function (file, destination, sourceFile) {
        var writer;

        if (file.directoryEntry.uncompressedSize === 0) {
            writer = touch.bind(null, destination);
        } else {
            var input = fs.createReadStream(sourceFile, {start: file.dataOffset, end: file.dataOffset + file.directoryEntry.uncompressedSize - 1});
            writer = pipePromise.bind(null, input, destination);
        }

        return mkdir(path.dirname(destination))
        .then(writer)
        .then(function () {
            return {stored: file.name};
        });
    },
    deflate: function (file, destination, sourceFile) {
        // For Deflate you don't actually need to specify the end offset - and in
        // fact many ZIP files don't include compressed file sizes for Deflated
        // files so we don't even know what the end offset is.
        var input = fs.createReadStream(sourceFile, {start: file.dataOffset});
        var inflater = input.pipe(zlib.createInflateRaw());

        return mkdir(path.dirname(destination))
        .then(pipePromise.bind(null, inflater, destination))
        .then(function () {
            return {deflated: file.name};
        });
    }
};

var pipePromise = function (input, destination) {
    var deferred = Q.defer();
    var output = fs.createWriteStream(destination);
    var errorHandler = function (error) {
        deferred.reject(error);
    };

    input.on('error', errorHandler);
    output.on('error', errorHandler);

    // For node 0.8 we can't just use the 'finish' event of the pipe
    input.on('end', function () {
        output.end(function () {
            deferred.resolve();
        });
    });

    input.pipe(output, {end: false});

    return deferred.promise;
};


module.exports = extractors;
