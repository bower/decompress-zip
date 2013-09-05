var fs = require('fs');
var request = require('request');
var tmp = require('tmp');
var exec = require('child_process').exec;
var path = require('path');

var url = 'https://drive.google.com/uc?id=0Bxxp2pVhWG1DTFNWQ1hsSkZKZmM&export=download';

tmp.file({prefix: 'assets', postfix: '.tgz'}, function (err, filename, fd) {
    console.log('Downloading ' + url + ' to ' + filename);

    var out = fs.createWriteStream(filename);
    var pipe = request(url).pipe(out);

    pipe.on('finish', function () {
        exec('tar -xvzf ' + filename, {cwd: path.join(__dirname, 'test')}, function (err, stdout, stderr) {
            if (err) {
                throw err;
            }

            console.log('Done');
        });
    });

    pipe.on('error', function (err) {
        throw err;
    });
});
