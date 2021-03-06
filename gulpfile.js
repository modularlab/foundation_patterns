'use strict';

// Load Gulp and tools we will use.
var $          = require('gulp-load-plugins')(),
    del        = require('del'),
    extend     = require('extend'),
    fs         = require("fs"),
    gulp       = require('gulp'),
    importOnce = require('node-sass-import-once'),
    sassGlob   = require('gulp-sass-glob'),
    exec       = require('child_process').exec;

var options = {};

options.gulpWatchOptions = {};

// The root paths are used to construct all the other paths in this
// configuration. The "project" root path is where this gulpfile.js is located.
// While ZURB Foundation distributes this in the theme root folder, you can also
// put this (and the package.json) in your project's root folder and edit the
// paths accordingly.
options.rootPath = {
  project     : __dirname + '/',
  theme       : __dirname + '/'
};

options.theme = {
  root       : options.rootPath.theme,
  scss       : options.rootPath.theme + 'scss/',
  patterns   : options.rootPath.theme + 'templates/patterns/',
  css        : options.rootPath.theme + 'css/'
};

// Define the node-scss configuration.
options.scss = {
  importer: importOnce,
  includePaths: [
    options.rootPath.project + 'bower_components/foundation-sites/scss',
    options.rootPath.project + 'bower_components/motion-ui/src'
  ],
};

// Define which browsers to add vendor prefixes for.
options.autoprefixer = {
  browsers: [
    'last 2 versions',
    'ie >= 9'
  ]
};

// If config.js exists, load that config and overriding the options object.
if (fs.existsSync(options.rootPath.project + "/config.js")) {
  var config = {};
  config = require("./config");
  extend(true, options, config);
}

var scssFiles = [
  options.theme.scss + '**/*.scss',
  // Do not open scss partials as they will be included as needed.
  '!' + options.theme.scss + '**/_*.scss',
];

var patternScssFiles = [
  options.theme.patterns + '**/*.scss',
  // Do not open scss partials as they will be included as needed.
  '!' + options.theme.patterns + '**/_*.scss',
];

// The default task.
gulp.task('default', ['build']);

// Build everything.
gulp.task('build', ['sass', 'drush:cc', 'lint']);

// Default watch task.
// @todo needs to add a javascript watch task.
gulp.task('watch', ['watch:css']);

// Watch for changes for scss files and rebuild.
gulp.task('watch:css', ['sass', 'drush:cc', 'lint:sass'], function () {
  return gulp.watch(options.theme.scss + '**/*.scss', options.gulpWatchOptions, ['sass', 'drush:cc', 'lint:sass']);
});

// Lint Sass and JavaScript.
// @todo needs to add a javascript lint task.
gulp.task('lint', ['lint:sass']);

// Build CSS for development environment.
gulp.task('sass', ['clean:css'], function () {
  return gulp.src(scssFiles)
    .pipe(sassGlob())
    .pipe($.sourcemaps.init())
    // Allow the options object to override the defaults for the task.
    .pipe($.sass(extend(true, {
      noCache: true,
      outputStyle: 'compressed',
      sourceMap: true
    }, options.scss)).on('error', $.sass.logError))
    .pipe($.autoprefixer(options.autoprefixer))
    .pipe($.rename({dirname: ''}))
    .pipe($.size({showFiles: true}))
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest(options.theme.css));
});

// Build CSS for patterns.
gulp.task('sass-patterns', function () {
  return gulp.src(patternScssFiles)
    .pipe(sassGlob())
    // Allow the options object to override the defaults for the task.
    .pipe($.sass(extend(true, {
      noCache: true,
      outputStyle: 'compressed',
      sourceMap: true
    }, options.scss)).on('error', $.sass.logError))
    .pipe($.autoprefixer(options.autoprefixer))
    .pipe($.size({showFiles: true}))
    .pipe(gulp.dest(options.theme.patterns));
});

// Clean CSS files.
gulp.task('clean:css', function () {
  return del([
    options.theme.css + '**/*.css',
    options.theme.css + '**/*.map'
  ], {force: true});
});

// Clean Pattern CSS files.
gulp.task('clean:patterns', function () {
  return del([
    options.theme.patterns + '**/*.css',
    options.theme.patterns + '**/*.map'
  ], {force: true});
});

// Defines a task that triggers a Drush cache clear (css-js), you need to edit
// config.js to be able to use this task.
gulp.task('drush:cc', function () {
  if (!config.drush.enabled) {
    return;
  }

  return gulp.src('', {read: false})
    .pipe($.shell([
      config.drush.alias.css_js
    ]));
});

// Lint Sass.
gulp.task('lint:sass', function () {
  return gulp.src(options.theme.scss + '**/*.scss')
    // use gulp-cached to check only modified files.
    .pipe($.cached('scsslint'))
    .pipe($.sassLint())
    .pipe($.sassLint.format());
});

// Generates pattern library.
gulp.task('patternlab', function (cb) {
  exec('php pattern-lab/core/console --generate', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});


// Clears all Drupal caches.
gulp.task('drushcr', function (cb) {
  exec('drush cr all', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

// watch:patterns - watch for changes in patterns, compile css and build pattern library
gulp.task('watch:patterns', function() {
  gulp.watch(['scss/**/*.scss'], ['sass', 'patternlab']);
  gulp.watch(['templates/patterns/**/*.*'], ['sass-patterns', 'patternlab']);
  gulp.watch(['pattern-lab/source/_patterns/**/*.*'], ['patternlab']);
});