'use strict';
module.exports = function (grunt) {
    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            files: [
                'Gruntfile.js',
                'bin/*',
                'lib/**/*.js',
                'test/*.js'
            ]
        },
        simplemocha: {
            options: {
                reporter: 'spec',
                timeout: '5000'
            },
            full: {
                src: [
                    'test/*.js'
                ]
            },
            short: {
                options: {
                    reporter: 'dot'
                },
                src: [
                    '<%= simplemocha.full.src %>'
                ]
            }
        },
        exec: {
            coverage: {
                command: 'node node_modules/istanbul/lib/cli.js cover --dir ./coverage node_modules/mocha/bin/_mocha -- -R dot test/*.js'
            },
            coveralls: {
                command: 'node node_modules/.bin/coveralls < coverage/lcov.info'
            }
        },
        watch: {
            files: [
                '<%= jshint.files %>'
            ],
            tasks: [
                'jshint',
                'simplemocha:short'
            ]
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-exec');

    grunt.registerTask('test', ['jshint', 'simplemocha:full']);
    grunt.registerTask('coverage', 'exec:coverage');
    grunt.registerTask('travis', ['exec:coverage', 'exec:coveralls']);
    grunt.registerTask('default', 'test');
};
