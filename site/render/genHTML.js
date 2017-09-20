lang = "en";
landCode = (lang === "en") ? "en-US" : "zh-CN";
fs = require('fs');
_ = require('underscore');
dicts = require('../../assets/lang/' + lang + '/htmlTStr.js');

var tutorMap = {
    "datastoreTut1.html"        : "datastoreTut1",
    "datastoreTut1DemoMode.html": "datastoreTut1Demo",
    "datastoreTut2.html"        : "datastoreTut2",
    "workbookTut.html"          : "workbookTut"
};

function genHTML(srcDir, destMap, product, replaceJsFiles) {
    console.log("Generating HTML for product: " + product);
    files = fs.readdirSync(srcDir);
    for (var i = 0, len = files.length; i < len; i++) {
        genHTMLHelper(files[i], srcDir, destMap, product);
    }
    if (replaceJsFiles) {
        for (var oldLoc in replaceJsFiles) {
            var newLoc = replaceJsFiles[oldLoc];
            var newString = replaceProductName(fs.readFileSync(oldLoc)
                                                 .toString());
            fs.writeFileSync(newLoc, newString);
        }
    }
}

function genHTMLHelper(file, srcDir, destMap, product) {
    if (!destMap.hasOwnProperty(file)) {
        console.error(file, "has not dest");
        return;
    }

    var dest = destMap[file];
    var path = srcDir + '/' + file;
    var html = fs.readFileSync(path).toString();
    var template = _.template(html);
    dicts.product = product;
    if (typeof dest === "string") {
        if (tutorMap.hasOwnProperty(file)) {
            dicts.isTutor = true;
            // it should be found in html_en's tutor obj
            var tutorName = tutorMap[file];
            // overwrite the dicts.tutor[tutorName] to dicts.tutor.meta,
            // so all walkthough.html can just use dicts.tutor.meta
            // to find the string that needed
            dicts.tutor.meta = dicts.tutor[tutorName];
            dicts.tutor.name = tutorName;
        } else {
            dicts.isTutor = false;
            dicts.tutor.name = "";

            if (file === "unitTest.html" ||
                file === "unitTestInstaller.html") {
                dicts.isUnitTest = true;
            } else {
                dicts.isUnitTest = null;
            }

            dicts.isTarballInstaller = true;
        }
        var parsedHTML = template(dicts);
        // comment starts with ! will not be removed by grunt htmlmin
        parsedHTML = "<!--!This file is autogenerated. Please do not modify-->\n" +
                     parsedHTML;

        if (product === "XI") {
            // replace all mentions of Xcalar Design (all casing) with Xcalar
            // insight
            parsedHTML = replaceProductName(parsedHTML);
        }
        fs.writeFileSync(dest, parsedHTML);
    } else {
        // Only used for installer
        for (var i = 0; i < dest.length; i++) {
            if (dest[i] === "install-tarball.html") {
                dicts.isTarballInstaller = true;
            } else {
                dicts.isTarballInstaller = null;
            }
            var parsedHTML = template(dicts);
            // comment starats with ! will not be removed by grunt htmlmin
            parsedHTML = "<!--!This file is autogenerated. Please do not modify-->\n" +
                         parsedHTML;
            if (product === "XI") {
                parsedHTML = replaceProductName(parsedHTML);
            }
            fs.writeFileSync(dest[i], parsedHTML);
        }
    }


}

function replaceProductName(html) {
    function getEquivalent(name) {
        var xcalarPart = name.substring(0, "xcalar ".length);
        var designPart = name.substring("xcalar ".length);

        if (designPart[0] === "d") {
            // All small
            return xcalarPart + "insight";
        } else if (designPart[1] === "e") {
            // Title case
            return xcalarPart + "Insight";
        } else {
            // All caps
            return xcalarPart + "INSIGHT";
        }
    }
    var regex = /xcalar design/gi;
    var matches;

    var cleansedHtml = "";
    var prevIdx = 0;
    while ((matches = regex.exec(html)) !== null) {
        cleansedHtml += html.substring(prevIdx, matches.index);
        cleansedHtml += getEquivalent(matches[0]);
        prevIdx = regex.lastIndex;
    }
    cleansedHtml += html.substring(prevIdx);
    return cleansedHtml;
}

module.exports = genHTML;