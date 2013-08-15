# decompress-zip [![Build Status](https://secure.travis-ci.org/bower/decompress-zip.png?branch=master)](http://travis-ci.org/bower/decompress-zip)

Extract files from a ZIP archive

## Usage

### .extract(file, options)

Extracts the contents of the ZIP archive `file`.

Returns a promise for an array containing details of what was extracted.

The default value for `options` is `{ path: '.' }`. Currently `path` is the
only option, and is the output path for the extraction.

```js
var decompress = require('decompress-zip');

decompress.extract('example.zip', {
	path: 'some/path'
});
```

If `path` does not exist, decompress-zip will attempt to create it first.

### .list(file)

Returns a promise for an array of the paths of the files stored in the archive.

```js
decompress.list('example.zip'); // ['file.txt', 'dir/', 'dir/another-file.txt']
```

## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).
