module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['container-terminal.js'],
        dest: 'dist/container-terminal.js'
      },
      css: {
        src: ['container-terminal.css'],
        dest: 'dist/container-terminal.css'
      },
      xtermDist: {
        src: ['node_modules/xterm/dist/xterm.js'],
        dest: 'dist/xterm.js'
      },
      xtermCSS: {
        src: ['node_modules/xterm/dist/xterm.css'],
        dest: 'dist/xterm.css'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/container-terminal.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          define: true,
          console: true,
          document: true
        }
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint', 'qunit'],
      css: {
        files: 'container-terminal.css'
      },
      js: {
        files: [
          'container-terminal.js',
          'container-terminal.css',
          'index.html'
        ],
        tasks: ['build']
      }
    },
    // The actual grunt server settings
    connect: {
      options: {
        protocol: grunt.option('scheme') || 'http',
        port: grunt.option('port') || 9000,
        hostname: grunt.option('hostname') || 'localhost'
      },
      server: {}
    },
    run: {
      bower: {
        cmd: 'node_modules/.bin/bower',
        args: [ "update" ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-run');

  grunt.registerTask('serve', [
    'build',
    'connect:server',
    "watch"
  ]);

  grunt.registerTask('build', [
    'concat',
    'jshint'
  ]);

  grunt.registerTask('default', ['serve']);

  grunt.registerTask('depends', [ "run:bower" ]);
};
