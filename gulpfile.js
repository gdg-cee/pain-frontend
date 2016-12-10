'use strict'

// utils
const gulp = require('gulp')
const gulpif = require('gulp-if')
const rename = require('gulp-rename')
const del = require('del')
const template = require('gulp-template')
const mergeStream = require('merge-stream')
const argv = require('yargs').argv
const notify = require('gulp-notify')
const filter = require('gulp-filter')
const uglify = require('gulp-uglify')
const htmlmin = require('gulp-htmlmin')
const minifyInline = require('gulp-minify-inline')
const logging = require('plylog')
const crypto = require('crypto')
const modRewrite  = require('connect-modrewrite')

// babel
const babel = require('gulp-babel')

// image minifier
const imagemin = require('gulp-imagemin')

// polymer
const polymer = require('polymer-build')

// browser sync
const browserSync = require('browser-sync').create()

// Got problems? Try logging 'em
// logging.setVerbose()

const PolymerProject = polymer.PolymerProject
const fork = polymer.forkStream

let polymerJSON = require('./polymer.json')
let project = new PolymerProject(polymerJSON)

function waitFor (stream) {
  return new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })
}

function appendBuildVars (appConfig) {
  appConfig[ 'version_code' ] = Date.now() + '#' + crypto.randomBytes(10).toString('hex')
  appConfig[ 'version_string' ] = ''
  appConfig[ 'build_timestamp' ] = Date.now()
}

gulp.task('default', [ 'build' ])

gulp.task('config', () => {
  let targetEnv = argv.prod ? 'prod' : 'dev'
  let pipe = gulp.src('./scripts/helper/config.tmpl.js')

  let sharedConfig = require('./config/shared.json')
  let envConfig = require('./config/' + targetEnv + '.json')

  let appConfig = Object.assign(sharedConfig, envConfig)

  appendBuildVars(appConfig)

  return pipe.pipe(template({
    app_config: JSON.stringify(appConfig)
  }))
    .pipe(rename('config.js'))
    .pipe(gulp.dest('./scripts/helper/'))
})

gulp.task('serve', [ 'browser-sync', 'watch', 'config' ])

gulp.task('browser-sync', () => {
  let targetEnv = argv.prod ? 'prod' : 'dev'
  let baseDir = targetEnv === 'prod' ? argv.unbundled ? './build/unbundled' : './build/bundled' : './'
  browserSync.init({
    server: {
      baseDir: baseDir,
      middleware: [
        modRewrite([
          '!\\.\\w+$ /index.html [L]'
        ])
      ]
    },
    port: argv.prod ? 8081 : 3000
  })
})

gulp.task('watch', () => {
  gulp.watch('./data/**/*', () => browserSync.reload())
  gulp.watch('./libs/**/*', () => browserSync.reload())
  gulp.watch('./scripts/**/*', () => browserSync.reload())
  gulp.watch('./lang/**/*', () => browserSync.reload())
  gulp.watch('./images/**/*', () => browserSync.reload())
  gulp.watch('./src/**/*', () => browserSync.reload())
})

gulp.task('clean', () => {
  return del('build')
})

gulp.task('build', [ 'polymer-build' ])

gulp.task('polymer-build', [ 'config', 'clean' ], () => {
  let swConfig = {
    staticFileGlobs: [
      '/index.html',
      '/src/**/*',
      '/images/**/*',
      '/scripts/**/*',
      '/data/**/*',
      '/libs/**/*',
      'manifest.json'
    ],
    navigateFallback: '/index.html'
  }

  let sources = project.sources()
    .pipe(project.splitHtml())
    .pipe(gulpif('*.js', babel({
      presets: [ 'es2015' ]
    })))
    .pipe(gulpif('*.js', uglify({
      mangle: false
    })))
    .pipe(gulpif('*.html', htmlmin({
      collapseWhitespace: true,
      caseSensitive: true,
      minifyCSS: true
    })))
    .pipe(gulpif('*.{png,gif,jpg,svg}', imagemin({
      progressive: true, interlaced: true
    })))
    .pipe(project.rejoinHtml())

  console.log('sources processed')

  // process dependencies
  let dependencies = project.dependencies()
    .pipe(project.splitHtml())
    .pipe(project.rejoinHtml())

  console.log('deps processed')

  // merge the source and dependencies streams to we can analyze the project
  let allFiles = mergeStream(sources, dependencies)
    .pipe(project.analyzer)

  console.log('stream merged')

  // fork the stream in case downstream transformers mutate the files
  // this fork will vulcanize the project
  let bundledPhase = fork(allFiles)
    .pipe(project.bundler)
    // write to the bundled folder
    .pipe(gulp.dest('build/bundled'))

  let unbundledPhase = fork(allFiles)
  // write to the unbundled folder
    .pipe(gulp.dest('build/unbundled'))

  return Promise.all([ waitFor(unbundledPhase), waitFor(bundledPhase) ])
})
