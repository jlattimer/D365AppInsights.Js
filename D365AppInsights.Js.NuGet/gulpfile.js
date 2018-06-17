﻿/// <binding BeforeBuild='build:all' />
/*
This file is the main entry point for defining Gulp tasks and using Gulp plugins.
Click here to learn more. https://go.microsoft.com/fwlink/?LinkId=518007
*/

var gulp = require("gulp"),
    concat = require("gulp-concat"),
    sourcemaps = require("gulp-sourcemaps"),
    uglify = require("gulp-uglify"),
    rename = require("gulp-rename"),
    ts = require("gulp-typescript"),
    fs = require("fs");

var paths = {
    root: ""
};

var version;
paths.jsDest = paths.root + "./content";

gulp.task("build:ts", ["get:Version"], function () {
    const tsProject = ts.createProject("../D365AppInsights.Js/tsconfig.json");

    return tsProject.src().pipe(tsProject()).pipe(gulp.dest("../D365AppInsights.Js"));
});

gulp.task("move:js", ["build:ts"], function () {
    gulp.src([paths.root + "../D365AppInsights.Js/scripts/AiLogger.js", paths.root + "../D365AppInsights.Js/jlattimer.d365appinsights.js"])
        .pipe(concat(paths.jsDest + "/jlattimer.d365appinsights" + version + ".js"))
        .pipe(gulp.dest(""));

    gulp.src("../D365AppInsights.Js/scripts/ai.*.js").pipe(gulp.dest(paths.jsDest + "/scripts"));
});

gulp.task("min:js", ["move:js"], function () {
    gulp.src([paths.root + "../D365AppInsights.Js/scripts/AiLogger.js", paths.root + "../D365AppInsights.Js/jlattimer.d365appinsights.js"])
        .pipe(sourcemaps.init())
        .pipe(concat(paths.jsDest + "/jlattimer.d365appinsights" + version + ".min.js"))
        .pipe(gulp.dest(""))
        .pipe(uglify())
        .pipe(sourcemaps.write(""))
        .pipe(gulp.dest(""));
});

gulp.task("move:ts", ["min:js"], function () {
    gulp.src("../D365AppInsights.Js/jlattimer.d365appinsights.ts").pipe(rename(`jlattimer.d365appinsights${version}.ts`)).pipe(gulp.dest(paths.jsDest));
});

gulp.task("move:dts", ["move:ts"], function () {
    gulp.src("../D365AppInsights.Js/jlattimer.d365appinsights.d.ts").pipe(rename(`jlattimer.d365appinsights${version}.d.ts`)).pipe(gulp.dest(paths.jsDest));

    gulp.src("../D365AppInsights.Js/scripts/*.ts").pipe(gulp.dest(paths.jsDest + "/scripts"));
});

gulp.task("get:Version", function () {
    const fileContent = fs.readFileSync("Properties/VersionInfo.cs", "utf8");
    const regex = /(\d+\.)(\d+\.)(\d+)/g;

    version = `_${fileContent.match(regex)[0]}`;

    console.log(version);
});

gulp.task("build:all", ["get:Version", "build:ts", "move:js", "min:js", "move:ts", "move:dts"]);