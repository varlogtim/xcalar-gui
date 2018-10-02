/**
    @GRUNTFILE
    Basic usage:
            %> grunt <build-type> [options]   // build tool
            %> grunt watch [options] // watch tool
            %> grunt <build-type> watch [options] // build and then watch

    valid <build-type>:
        dev: Debug build, but keeps config file
        debug: Debug build, gets rid of config file
        installer: Prod build
        trunk: Prod build, but copies overXLRDIR's thrift files

    [options]:
        --srcroot=<path>
            Root dir of xcalar-gui project. Defaults to cwd of Gruntfile

        --product=[XD|XI]
            Defaults to XD

        --buildroot=<path>
            Output dirname. Defaults to xcalar-gui.

        --srcbldsame
            [Deprecated] DO NOT USE. sets <buildroot> to <srcroot>

        --nooverwrite
            Do not overwrite existing dir. Defaults to overwrite.

        --rc / --removedebugcomments    // installer blds only
            Remove debug code blocks

    OPTIONS ONLY FOR WATCH:
        --<FILETYPE> --<FILETYPE>
            If file changes in srcdir, recompile relevant files into destdir

            FILETYPES:
                less     any less file in project src
                html     any html file in project src (+ htmlTStr.js files)
                js       any js src file
                ts       any ts src file
                ctor     changes in site/render/template/constructor.template.js
                all      any of the valid file types in src or bld

            ex.: grunt watch --less --css

        --livereload
            ** TO GET LIVERELOAD PROPERTY TO WORK, please install the 'livereload' chrome plugin.
            Reloads browser on watched file change.

        --relTo=[SRC|BLD]
            if --file, --files, --dir, or --dirs specified as rel. paths,
            will indicates weather to resolve from the project src, or the build src.

    Built in Grunt options:
        --v/--verbose
            If flag given, will display more log messages

        --f/--force
            If flag given, then if a task fails, subsequent tasks will be run still.
            (Default is to hault all queued tasks if one task in the queue fails)

    Examples:
        grunt dev                 (build a dev build of XD product, in to <xclrdir>)
        grunt dev --product XI    (build a dev build of XI product, in to <xclrdir>)
        grunt installer           (build installer flavor of XD product, in to <xclrdir>/xcalar-gui/)
        grunt debug watch --less  (build a debug build in to <xlrdir>/xcalar-gui, then watch for changes in all less files in <xlrdir> that aren't bld files)
        grunt debug watch --less --livereload (debug build, and watch for less files. On less file change, reload browser.)
*/


var fs = require('fs'); // for file system operations
var os = require('os'); // for getting hostname for thrift sync
var shelljs = require('shelljs');
_ = require('underscore');
var path = require('path');
var cheerio = require('cheerio');
const assert = require('assert');

var XLRGUIDIR = 'XLRGUIDIR';
var XLRDIR = 'XLRDIR';

var XD = "XD";
var XI = "XI";
var XDEE = "XDEE";
var XDprodName = "xcalar-gui";
var XIprodName = "xcalar-insight";
var XDEEprodName = "xcalar-design-ee";

// a list of js files that are req. only for Xcalar Design EE
// used by scriptlinker xpe targets, so should be rel those targets' cwd attr
var XDEE_REQ_JS_FILES = [
    'assets/js/xpe/xpeServerResponses.js',
    'assets/js/xpe/nwjsXpeSetupHelper.js',
    'assets/js/xpe/xpeSharedContextUtils.js',
    'assets/js/xpe/xpeCommon.js',
];
// list of partial html files used by xdee,
// will copy in to bld but remove once bld completes
var XDEE_PARTIAL_HTML_FILES = [
    'site/xpe/eulaPart.html',
    'site/xpe/xpeCommonHeadTags.html',
    'site/xpe/xpeCommonScriptImports.html',
    'site/xpe/progressBarSetup.html',
    'site/xpe/imageTable.html'
];

var INITIAL_GRUNT_PROCESS_TASKLIST = 'taskflag4context';
var TOPLEVEL_GRUNT_PROCESS = false; // will get set true if we detect this is parent process
var LR_ON = 'LIVERELOADON';
var LR_OFF = 'LIVERELOADOFF';
var WATCH_TMP_FILE = '/tmp/grunt/gruntWatchMarkerDoNotDeleteWhileGruntRunning';

// main bld tasks user can call from cmd line i.e., 'grunt debug'
var TRUNK = "trunk";
var INSTALLER = "installer";
var DEV = "dev";
var DEBUG = "debug";

// Other Tasks
var INIT = 'init';
var PREP_BUILD_DIRS = 'prepBuildDirs';
var BUILD = 'build';
var BUILD_CSS = 'buildCSS';
var CLEAN_CSS_SRC = 'cleanCssSrc';
var BUILD_HTML = 'buildHTML';
var TEMPLATE_HTML = 'templateHTML';
var PROCESS_HTML = 'processHTML';
var CLEAN_HTML_SRC = 'cleanHTMLSrc';
var BUILD_JS = "buildJs";
var TYPESCRIPT = "typescriptJsGeneration";
var BUILD_EXTRA_TS = "buildExtraTs";
var GENERATE_TSDEF = "generateTsDefs"
var EXTRA_TS_FOLDER_NAME = "extraTsStaging";
var BUILD_PARSER = "buildParser";
var WEBPACK = "webpack";
var MINIFY_JS = "minifyJs";
var REMOVE_DEBUG_COMMENTS = 'removeDebugComments';
var CLEAN_JS = "cleanJs";
var CLEAN_JS_SRC_POST_MINIFICATION = 'cleanJsPostMini';
var UPDATE_ESSENTIAL_JS_FILES_WITH_CORRECT_PRODUCT_NAME = 'updateEssentialJsFilesWithCorrectProductName';
var UPDATE_SCRIPT_TAGS = 'updateScriptTags';
var CHECK_FOR_XD_STRINGS = 'checkForXDStrings';
var HELP_CONTENTS = 'helpContents';
var GENERATE_HELP_STRUCTS_FILE = 'generateHelpStructsFile';
var GENERATE_HELP_SEARCH_INSIGHT_FILE = 'generateHelpSIFile';
var CLEANUP_HELP_CONTENT_DIR = 'cleanupHelpContentDir';
var CONSTRUCTOR_FILES = 'constructorFiles';
var GENERATE_GIT_VAR_DEC_FILE = 'generateGitVarDecFile';
var GENERATE_CURR_PERS_CONSTRUCTOR_FILE = 'generateCurrPersConstructorFile';
var CLEAN_CONSTRUCTOR_SRC = 'cleanConstructorSrc';
var SYNC_WITH_THRIFT = 'syncWithThrift';
var NEW_CONFIG_FILE = 'newConfigFile';
var CLEAN_BUILD_SECTIONS = 'cleanBldSections';
var FINALIZE = 'finalize';
var DISPLAY_SUMMARY = 'summary';
var COMPLETE_WATCH = 'completeWatch';
var WATCH_PLUGIN = 'customWatch';
var WATCH = 'watch';
// cli options for watch functionality
var WATCH_FLAG_ALL = "all";
var WATCH_TARGET_HTML = "html";
var WATCH_TARGET_CSS = "css";
var WATCH_TARGET_CTOR = 'ctor';
var WATCH_TARGET_LESS = "less";
var WATCH_TARGET_TYPESCRIPT = "ts";
var WATCH_TARGET_JS = "js";
var WATCH_FLAG_INITIAL_BUILD_CSS = "buildcss";
var WATCH_OP_LIVE_RELOAD = "livereload";

// Global booleans to track which task. Can be both
var IS_BLD_TASK = false;
var IS_WATCH_TASK = false;

var WATCH_FILETYPES = {
    [WATCH_TARGET_HTML]: '',
    [WATCH_TARGET_CSS]: '',
    [WATCH_TARGET_LESS]: '',
    [WATCH_TARGET_TYPESCRIPT]: "",
    [WATCH_TARGET_JS]: '',
    [WATCH_TARGET_CTOR]: '',
};

// Key meanings:
// src: src dir
// files: file globs (grunt style) within src dir
// dest: dest dir
// remove: files / dirs to skip copy. UNIX, not Grunt, style globbing patterns
//         can be used.
// exclude: files / dirs to copy, but skip build
// required: files / dirs to copy, use during build, and delete on completion

var constructorMapping = {
    src: 'assets/js/constructor/xcalar-idl/xd/',
    files: '*',
    dest: 'assets/js/constructor/',
    exclude: [],
    remove: ['**README'], // Otherwise we'll have empty dirs with only READMEs
    required: ['site/render/']};
var cssMapping = {
    src: 'assets/stylesheets/less/',
    files: '*.less',
    dest: 'assets/stylesheets/css/',
    exclude: [],
    remove: ['userManagement.less', 'xu.less', 'dashboard.less'],
    required:['assets/stylesheets/less/partials/']};
var htmlMapping = {
    src: 'site/',
    files: '**/*.html',
    dest: '',
    exclude: [],
    remove: ['dashboard.html', 'userManagement.html'],
    required: ['site/partials/', 'site/util/'].concat(XDEE_PARTIAL_HTML_FILES)};
var jsMapping = {
    src: 'assets/js/',
    files: '**/*.js',
    dest: 'assets/js/',
    exclude: [],
    remove: ['thrift/mgmttestactual.js'],
    required: []};
var helpContentRoot = "assets/help/";
var helpContentMapping = {
    src: helpContentRoot + 'user/', // src in the bldroot after initial copy at bld start
    dest: "assets/js/shared/util/helpHashTags.js",
    exclude: {},
    remove: [],
    required: []};
var typescriptMapping = {
    src:  'ts/',
    dest: "assets/js/",
    exclude: {},
    remove: [],
    required: ['ts/']};

// help content src in the actual src tree, for each product type
var helpContentRootByProduct = {
    XD: helpContentRoot + XD,
    XDEE: helpContentRoot + XD,
    XI: helpContentRoot + XD
}

// path rel src to the unitTest folder
var UNIT_TEST_FOLDER = 'assets/test/unitTest';

// cli options for regular bld functionality
var BLD_OP_SRC_REPO = 'srcroot';
var BLD_OP_BLDROOT = 'buildroot';
var BLD_OP_PRODUCT = 'product';
var BLD_OP_BACKEND_SRC_REPO = "xcalarroot";
var BLD_OP_JS_MINIFICATION_CONCAT_DEPTH = 'jsminificationdepth';
var BLD_FLAG_TIMESTAMP_BLDDIR = 'timestampbld';
var BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS = 'nooverwrite';
var BLD_FLAG_RETAIN_FULL_SRC = 'keepsrc';
var BLD_FLAG_RC_SHORT = 'rc';
var BLD_FLAG_RC_LONG = 'removedebugcomments';
var FASTCOPY = 'fastcopy';
// delimeter user should use for cli options that can take lists
var OPTIONS_DELIM = ",";

// the name of the constructor template file
var CONSTRUCTOR_TEMPLATE_FILE = 'constructor.template.js';
var CONSTRUCTOR_TEMPLATE_FILE_PATH_REL_BLD = 'site/render/template/' + CONSTRUCTOR_TEMPLATE_FILE;

// Used to track which file types cause a reload. Also used in watch events
// This struct is populated by getReloadTypes() during init
var LIVE_RELOAD_BY_TYPE = {};

/**
    ==================================================

    IF YOU ARE ADDING A NEW HTML FILE TO THE PROJECT::::

    1. make sure your new HTML file is stored in <project source>/site/

    2. Add entry in the following hash specifying where in the build to map the file

       - key should be path to source file (rel <proj source>/site)
       - value should be list, with entry for each path you want the templated
         file to be mapped to in the build (rel <build root>)

       (If you don't add a key/value pair, the file will still appear in build,
        templated in to a single file at the build's root, but put in for good
        measure as there are some Grunt plugins relying on this hash)

    3. Any auxiliary files for the new HTML file (partial files, etc.) that you
       don't want included in final build, add to 'required' attr of htmlMapping
       (rel <project source>)

    =================================================
*/

// (key): path to unprocessed file in staging dir I
// (val): path(s) you want in final bld of the processed, templated file
// [files mapping to mult. dests save in to 2 sep files during templating]
var htmlTemplateMapping = {
    "datastoreTut1.html": ["assets/htmlFiles/walk/datastoreTut1.html"],
    "datastoreTut2.html": ["assets/htmlFiles/walk/datastoreTut2.html"],
    "dologout.html": ["assets/htmlFiles/dologout.html"],
    "extensionUploader.html": ["services/appMarketplace/extensionUploader.html"],
    "index.html": ["index.html"],
    "install.html": ["install.html", "install-tarball.html"],
    "login.html": ["assets/htmlFiles/login.html"],
    "tableau.html": ["assets/htmlFiles/tableau.html"],
    "testSuite.html": ["testSuite.html"],
    "undoredoTest.html": ["undoredoTest.html"],
    "unitTest.html": ["unitTest.html"],
    "unitTestInstaller.html": ["unitTestInstaller.html"],
    "workbookTut.html": ["assets/htmlFiles/walk/workbookTut.html"],
    "datasetPanelTutA1.html": ["assets/htmlFiles/walk/datasetPanelTutA1.html"],
    "importDatasourceTutA2.html": ["assets/htmlFiles/walk/importDatasourceTutA2.html"],
    "browseDatasourceTutA3.html": ["assets/htmlFiles/walk/browseDatasourceTutA3.html"],
    "browseDatasource2TutA4.html": ["assets/htmlFiles/walk/browseDatasource2TutA4.html"],
    "xpe/xpeInstaller.html": ["xpe/xpeInstaller.html"],
    "xpe/xpeUninstaller.html": ["xpe/xpeUninstaller.html"],
    "xpe/xpeDockerStarter.html": ["xpe/xpeDockerStarter.html"],
    "xpe/xpeImageManagementTool.html": ["xpe/xpeImageManagementTool.html"]
};

/**
    global vars FOR PARAM VALIDATION of cmd options..
    VALID_OPTIONS:
*/

// Used to store params and flags during input.
var VALUES_KEY = "values"; // the values it's limited to
var REQUIRES_ONE_KEY = 'requiresOne'; // option requires at least one in a list of other options/flags
var REQUIRES_ALL_KEY = 'requiresAll'; // option requires all of a particular list of other options/flags
var MULTI_KEY = 'multi'; // can specify a delimeter list of values
var EXCLUSION_KEY = 'exclusion'; // can specify --<option>=-<values> and it will get everything BUT what is in the list
var NAND_KEY = 'notand'; // if specifying an option, can't specify a set of other options
var FLAG_KEY = 'boolflag'; // if is strictly a boolean flag, and does not take any value (false would mean it can take a value)
var TYPE_KEY = 'typekey'; // if it can only be a certain data type.  sorry don't have this figured out yet.
var REQUIRES_VALUE_KEY = 'takesval'; // if this option requires some value assigned to it.
// so note if it allows both - flag and option, don't supply either.
var WATCH_KEY = 'watch'; // if this is an option for watch functionality
var BLD_KEY = 'bldstuff'; // if this is a key for bld functionality (need in addition to watch key because could be bopth)
var DESC_KEY = 'description'; // description of the option/to print to user in help menu and corrective err msgs during param validation
var IS_GRUNT_OP = 'gruntop'; // if this is a build-in grunt option  (will print a general description in that case)
// Grunt by default, 1. processes an option that's supplied as option=false as a boolean flag, --no-<option>
// Allows user to supply --no-<flag> for any8 boolean flag.  These two keys control that.
var TAKES_BOOLS = 'nobooleans'; // if this can take boolean values true/false. (because then you'll know that --no-<param> is actually valid
var NO_EXTRA_GRUNT_FLAG = 'noextra'; // if you don't want Grunt to allow a no-<param> flag for this param (it complicatrse things for the watch flags)
var falseBooleanFlagPrefix = "no-"; // the prefix Grunt adds on to the extra booleans (i.e., if you have --root=false, will store as --no-root)

// Keys: Valid CLI options
// REQUIRES_VALUE_KEY: Whether the param needs a value
// VALUES_KEY: Only values in VALUES_KEY array are valid
// DESC_KEY: String to describe what the param is used for
var VALID_OPTIONS = {
    [BLD_OP_SRC_REPO]:
        {[REQUIRES_VALUE_KEY]: true, [DESC_KEY]: "Path to the xcalar gui git repo you want to generate bld from"},
    [BLD_OP_BLDROOT]:
        {[REQUIRES_VALUE_KEY]: true, [DESC_KEY]: "Directory path for dir in build where index.html should start (if does not exist will create for you)"},
    [BLD_OP_PRODUCT]:
        {[REQUIRES_VALUE_KEY]: true, [VALUES_KEY]: [XD,XI,XDEE], [DESC_KEY]: "Product type to build (Defaults to XD)"},
    [BLD_OP_BACKEND_SRC_REPO]:
        {[REQUIRES_VALUE_KEY]: true, [BLD_KEY]: true, [DESC_KEY]: "For trunk builds only: Path to xlr repo to copy in backend files from"},
    [BLD_OP_JS_MINIFICATION_CONCAT_DEPTH]:
        {[REQUIRES_VALUE_KEY]: true, [DESC_KEY]: "Depth to start minifying js files from within " + jsMapping.src},
    [WATCH_OP_LIVE_RELOAD]: // can be used as a flag or an option
        {//[REQUIRES_VALUE_KEY]: true,
        [VALUES_KEY]: Object.keys(WATCH_FILETYPES), [MULTI_KEY]:true, [EXCLUSION_KEY]:true, [WATCH_KEY]: true,
        [DESC_KEY]: "As flag: do live reload on all watched files."
            + "\n\t\tAs option: A single filetype, or comma sep list of filetypes you'd like to do live reload on. "
            + "\n\t\tIf list begins with -, will do livereload on all types EXCEPT that/those specififed."},
    // flags
    [BLD_FLAG_TIMESTAMP_BLDDIR]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Creates int. dir for bld output, which is timestamp when bld begins"},
    [BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Do NOT overwrite build directory if it exists"},
    [BLD_FLAG_RETAIN_FULL_SRC]:
        {[FLAG_KEY]: true, [DESC_KEY]: "In the final build, do NOT delete/clean up files used only for build generation (i.e., partials, untemplated files, etc.)"},
    [BLD_FLAG_RC_SHORT]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Remove debug comments from javascript files when generating build"},
    [BLD_FLAG_RC_LONG]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Remove debug comments from javascript files when generating build"},
    [FASTCOPY]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Skip copying of node_modules and help"},
    // watch flags
    [WATCH_FLAG_ALL]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in files of all filetypes"},
    [WATCH_TARGET_HTML]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in html files in the project source @ " + htmlMapping.src + ", (and the htmlTStr.js files), and regen HTML in to bld appropriately"},
    [WATCH_TARGET_LESS]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in less files in the project source @ " + cssMapping.src + ", and re-gen css file(s) in to build @ " + cssMapping.dest + " as a result of any changes"},
    [WATCH_TARGET_TYPESCRIPT]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in ts files in the project source @ " + typescriptMapping.src + ", and re-gen js file(s) in to build @ " + typescriptMapping.dest + " as a result of any changes"},
    [WATCH_TARGET_JS]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in javascript files in project source @ " + jsMapping.src},
    //[WATCH_TARGET_JS_BLD]: {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in },
    [WATCH_TARGET_CTOR]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in " + CONSTRUCTOR_TEMPLATE_FILE_PATH_REL_BLD + " and re-gen constructor file(s) as result"},
    [WATCH_FLAG_INITIAL_BUILD_CSS]:
        { [FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Build CSS portion of build before you start watch task" },

};

// add in grunt options/flags you want available to user (grunt --version works even if you don't add here)
var GRUNT_OPTIONS = [
    'gruntfile', 'debug', // even though --debug a boolean flag, grunt stores it internally as debug=1 (value taking)
];
var GRUNT_FLAGS = [
    'verbose', 'force', 'stack', 'color', // color being sent to child processes of grunt-concurrent!
];
var validOp;
for ( validOp of GRUNT_OPTIONS ) {
    VALID_OPTIONS[validOp] = {[REQUIRES_VALUE_KEY]: true, [IS_GRUNT_OP]: true};
}
for ( validOp of GRUNT_FLAGS ) {
    VALID_OPTIONS[validOp] = {[FLAG_KEY]: true, [IS_GRUNT_OP]: true};
}

/**
    Grunt will take any <option> that user specifies as 'false',
    and store it in grunt.options as '--no-' + <option>
    (ex: if you pass --optionA=false on cmd, instead of storing this
    in grunt.options as 'optionA':'false' (which is how Grunt stores other options),
    will store it in grunt.options as a boolean flag, as 'no-optionA')
    So, for any cmd option capable of taking 'false' as a value,you
    need to account for this boolean flag version of the option as a valid option too
*/
var oppOp;
for ( validOp of Object.keys(VALID_OPTIONS) ) {
    oppOp = falseBooleanFlagPrefix + validOp;
    if (VALID_OPTIONS[validOp][TAKES_BOOLS] ||
        (VALID_OPTIONS[validOp][FLAG_KEY] && !VALID_OPTIONS[validOp][NO_EXTRA_GRUNT_FLAG])
    ) {
        VALID_OPTIONS[oppOp] = {[FLAG_KEY]: true};
        if (VALID_OPTIONS[validOp][IS_GRUNT_OP]) {
            VALID_OPTIONS[oppOp][IS_GRUNT_OP] = true;
        } else {
            VALID_OPTIONS[oppOp][DESC_KEY] = "Negation of: " + VALID_OPTIONS[validOp][DESC_KEY];
        }
    }
}

/**
    invert VALID_OPTIONS param validation hash,
    to get useage/help strings per type (i.e., flags for watch, options for bld, etc.)
    bld global strings here for general err messages to user,
    but also keep global hash so can pretty print with color in help menu
*/
var OPTIONS_DESC_HASH = optionInfoString();


// get for flags and ops
var FLAGS_DESC_STR = '';
for ( type of Object.keys(OPTIONS_DESC_HASH['flags']) ) {
    FLAGS_DESC_STR = FLAGS_DESC_STR + "\n\t" + OPTIONS_DESC_HASH['flags'][type]['header'] + "\n";
    // now add all the options that matched this type
    for ( validOp of Object.keys(OPTIONS_DESC_HASH['flags'][type]['matchingoptions']) ) {
        FLAGS_DESC_STR = FLAGS_DESC_STR
            + "\n"
            + OPTIONS_DESC_HASH['flags'][type]['matchingoptions'][validOp]['useage']
            + "\n"
            + OPTIONS_DESC_HASH['flags'][type]['matchingoptions'][validOp]['desc'];
    }
}
var OPS_DESC_STR = '';
for ( type of Object.keys(OPTIONS_DESC_HASH['options']) ) {
    OPS_DESC_STR = OPS_DESC_STR + "\n\t" + OPTIONS_DESC_HASH['options'][type]['header'] + "\n";
    for ( validOp of Object.keys(OPTIONS_DESC_HASH['options'][type]['matchingoptions']) ) {
        OPS_DESC_STR = OPS_DESC_STR
            + "\n"
            + OPTIONS_DESC_HASH['options'][type]['matchingoptions'][validOp]['useage']
            + "\n"
            + OPTIONS_DESC_HASH['options'][type]['matchingoptions'][validOp]['desc'];
    }
}
/**
    take the hash of cmd options and group the options together
    by category of flags/options and for which type of functionality,
    make a header you can print for each of those categories, and
    then find all the options that match in to it and make a useage string and description
    Doing this so can pretty print some strings in help and corrective err msgs
*/
function optionInfoString() {

    var op, desc, foundtypes, optiontype, valids;
    // hash you'll return:
    // will bld up formatted string of options found for each type, then tack the header on at end
    // if don't find any matching options for a category, will delete it
    var infos = {
        'options': {
            'general':{'header':"\n[Value-taking options (general purpose)]:", 'matchingoptions':{}},
            'build':{'header':"\n[Value-taking options for blds only]:", 'matchingoptions':{}},
            'watch':{'header':"\n[Value-taking options for watch only]:", 'matchingoptions':{}}},
        'flags': {
            'general':{'header':"\n[General purpose boolean flags]:", 'matchingoptions':{}},
            'build':{'header':"\n[Flags for builds] only:", 'matchingoptions':{}},
            'watch':{'header':"\n[Flags for watch only]:", 'matchingoptions':{}}}};

    for ( op of Object.keys(VALID_OPTIONS) ) {
        if (VALID_OPTIONS[op][IS_GRUNT_OP]) {
            desc = "\t\t(Grunt option; see Grunt documentation for current description)";
        } else {
            desc = "\t\t" + VALID_OPTIONS[op][DESC_KEY];
        }
        // add in valid values to description if it's limited to certain values
        if (VALID_OPTIONS[op][VALUES_KEY]) {
            desc = desc + "\n\t\tValid values: " + VALID_OPTIONS[op][VALUES_KEY];
        }

        // add in description if its a flag or a value-taking option
        foundtypes = {};
        if (!VALID_OPTIONS[op][REQUIRES_VALUE_KEY]) { // allows you to account for ones like --livereload that can be both flag and value taking option
            foundtypes['flags'] = {'useage':"\t--" + op, 'desc': desc};
        }
        if (!VALID_OPTIONS[op][FLAG_KEY]) {
            foundtypes['options'] = {'useage':"\t--" + op + "=<value>", 'desc': desc};
        }
        // could be this option takes a value and is a flag.  go through each possibility found
        for ( optiontype of Object.keys(foundtypes) ) {
            if (VALID_OPTIONS[op][WATCH_KEY]) {
                // its specified to watch - add this in
                infos[optiontype]['watch']['matchingoptions'][op] = foundtypes[optiontype];
            } else if (VALID_OPTIONS[op][BLD_KEY]) {
                infos[optiontype]['build']['matchingoptions'][op] = foundtypes[optiontype];
            } else {
                infos[optiontype]['general']['matchingoptions'][op] = foundtypes[optiontype];
            }
        }
    }

    // might not have sections for each of these (Ex., flags just for bld),
    // remove those so you don't end up printing out sections with just the header but no content
    // could be confusing
    for ( var stype of Object.keys(infos) ) {
        for ( var subtype of Object.keys(infos[stype]) ) {
            if (Object.keys(infos[stype][subtype]['matchingoptions']).length == 0) {
                delete infos[stype][subtype];
            }
        }
    }
    return infos;
}

// if you run a watch task, must specify at least one some cmd option to specify what to watch. list options here, will validate
var WATCH_TASK_REQUIRES_ONE = Object.keys(WATCH_FILETYPES).concat([WATCH_FLAG_ALL]); // all the boolean flags

/** tasks you want user to be able to schedule from cmd line when invoking grunt
    (any task registered in Gruntfile is callable from cmd; no way to privatize tasks)
    value is hash to store validation requirements for the task, if any
    (Descriptions will be printed in help menu and some corrective err msgs during param validation) */
var BLD_TASK_KEY = 'isBldTask';
var VALID_TASKS = {
        [DEV]: {
            [BLD_TASK_KEY]:true,
            [DESC_KEY]:
                  "\n\t\tfor front end developers - will generate a working build "
                + "\n\t\tbut no javascript minification and config details remain"
                + "\n\t\t\t<srcroot>/xcalar-gui/     (if XD bld)"
                + "\n\t\t\t<srcroot>/xcalar-insight/ (if XI bld)"
        },
        [INSTALLER]: {
            [BLD_TASK_KEY]:true,
            [DESC_KEY]:
                  "\n\t\tfull shippable build."
                + "\n\t\tjs is minified and developer config details removed"
                + "\n\t\tBuild root, unless otherwise specified via cmd params:"
                + "\n\t\t\t<srcroot>/xcalar-gui/     (if XD bld)"
                + "\n\t\t\t<srcroot>/xcalar-insight/ (if XI bld)"
        },
        [TRUNK]: {
            [BLD_TASK_KEY]:true,
            [DESC_KEY]:
                  "\n\t\tFor backend developers - will generate a working build,"
                + "\n\t\tbut port in developer's own backend thrift changes, and"
                + "\n\t\tsync back and front end for communication"
                + "\n\t\tBuild root, unless otherwise specified via cmd params:"
                + "\n\t\t\t<srcroot>/xcalar-gui/     (if XD bld)"
                + "\n\t\t\t<srcroot>/xcalar-insight/ (if XI bld)"
        },
        [DEBUG]: {
            [BLD_TASK_KEY]:true,
            [DESC_KEY]:
                  "\n\t\tUsed by Jenkins - this is a regular default build that can"
                + "\n\t\tbe debugged, only developer config details are removed so"
                + "\n\t\tthe build doesn't get connected to developer server"
                + "\n\t\tBuild root, unless otherwise specified via cmd params:"
                + "\n\t\t\t<srcroot>/xcalar-gui/     (if XD bld)"
                + "\n\t\t\t<srcroot>/xcalar-insight/ (if XI bld)"
        },
        [WATCH]: {
            [BLD_TASK_KEY]:false, [REQUIRES_ONE_KEY]: WATCH_TASK_REQUIRES_ONE,
            [DESC_KEY]:
                  "\n\t\tRuns a cron job, watching for edits in a set of files. "
                + "\n\t\tIf any of these 'watched' files change, will regenerate"
                + "\n\t\tthe appropriate portion of the bld to reflect the change."
                + "\n\t\tA live-reload functionality is available to reload the "
                + "\n\t\tbrowser upon completion, via option --"
                + WATCH_OP_LIVE_RELOAD},
        [INIT]: {
            [BLD_TASK_KEY]:false,
            [DESC_KEY]:
                "\n\t\tSets up your cwd by running 'npm install', and installing"
                + "\n\t\tlocal patches to grunt plugins."
                + "\n\t\t(Run only once when you first set up your workspace!)"
        }
/**
        [BUILD_CSS]: {
            [BLD_TASK_KEY]:true,
            [DESC_KEY]:
                "\n\t\tBuild only the css portion of your build. (Developer use)"
        },
*/
};
/** form strings with the tasks and escriptions for logging purposes during param validation
    make some lists as doing this, so can go through in help and print with colorization.
    also need to check if a task is a bld task or not */
var VALID_BLD_TASKS = {};
var validTask;
for ( validTask of Object.keys(VALID_TASKS) ) {
    if (VALID_TASKS[validTask][BLD_TASK_KEY]) {
        VALID_BLD_TASKS[validTask] = VALID_TASKS[validTask][DESC_KEY];
    }
}
var VALID_OTHER_TASKS = {};
for ( validTask of Object.keys(VALID_TASKS) ) {
    if (!VALID_TASKS[validTask][BLD_TASK_KEY]) {
        VALID_OTHER_TASKS[validTask] = VALID_TASKS[validTask][DESC_KEY];
    }
}
var BLD_TASKS_DESC_STR = "";
for ( validTask of Object.keys(VALID_BLD_TASKS) ) {
    BLD_TASKS_DESC_STR = BLD_TASKS_DESC_STR + "\n\t" + validTask + " :\n\t\t" + VALID_BLD_TASKS[validTask];
}
var OTHER_TASKS_DESC_STR = "";
for ( validTask of Object.keys(VALID_OTHER_TASKS) ) {
    OTHER_TASKS_DESC_STR = OTHER_TASKS_DESC_STR + "\n\t" + validTask + " :\n\t\t" + VALID_OTHER_TASKS[validTask];
}

// DONE WITH PARAM VALIDATION VARS

/** warning strings to put on top of files autogenerated by Grunt
    (comments that start with '!' will not get removed by grunt htmlmin) */
var AUTOGENWARNINGJS = "/* This file was aautogenerated by Grunt. " +
                    "Please do not modify */\n";
var AUTOGENWARNINGHTML = "<!--!This file was autogenerated by Grunt. Please do not modify-->\n";

// globals set dynamically from user cli options
var PRODUCT;
var PRODUCTNAME; // will be full prod name
var SRCROOT; // root of src code for gui project. populated by cmd option in setup below
var BLDROOT; // top level root of build output.
var BLDROOT; // root where actual build files begin at
var BLDTYPE; // 'debug', 'installer', etc. used for logging
var BACKENDBLDROOT; // root of dev src; set in init
var OVERWRITE;
var KEEPSRC;
var WATCH_FILES_REL_TO;
var fastcopy;

var STEPCOLOR = 'cyan';
var STEPCOLOR2 = 'magenta';

/** TRUNK BLD VAR */
var BACKEND_JS_SRC = 'bin/jsPackage/', // src root (rel BACKEND PROJ ROOT) of thrift scripts to copy in to the gui bld
    GUIPROJ_THRIFT_DEST = 'assets/js/thrift/', // root (rel GUI BLD) where the thrift scripts should be copied
    /* files of the gui bld you want to keep when syncing with thrfit (keys are the files you want to keep, rel bld root)
     (its a hash so can keep track of where the files are temporarily during the copy process) */
    KEEP_FRONTEND_SCRIPTS = {'thrift.js':''}, // keys are files from bld you want to keep when syncing with thrift, rel to the thrift dest
    THRIFT_APACHE_GUI_PATH = 'prod'; // path (rel. to the gui SRC dir), that backend Apache will look for gui BLD at

// for HTML tasks
/**
    html will be built as follows:
        (1) src HTML and related files ported to temp STAGING DIR I; src removed
        (2) Processing tasks which require outside files (templating, include resolves, internationalization, etc.)
            done in STAGIND DIR I, and resulting HTML files only ported to a temp STAGING DIR II.
        (3) Final stand-alone processing (minification, prettification) done in STAGING DIR II.
            processed files in the temp processing dir will be ported to their final destination,

        This approach being done because:
        case that the src dir and dest dir for HTML within a build need to be the same.
        Since want to delete the entire src root of html (since original src HTML files with includes, template syntax, etc.
        should not be included in build), this would end up deleting all your processed html.
        To avoid this, could check if html src and dest dir in the bld are same, and if so, selectively remove dirs/files you don't
        want, post-processing, rather than removing entire src dir (which would actually hold dest files).
        But, since you can specify alt. mappings when doing templating  (which needs to be done
        because some templated HTML files generate to multiple files), you would need to check after
        each templating to see if the original file was overwritten, and if not, overwrite it.
        This becomes convoluted, as this needs to be kept track of over several different tasks and functions,
        This just is another approach and seemed simpler process with less corner cases to keep track of.
*/

// setaging dirs where processing tasks will be done
var htmlStagingDirI = "htmlStaingtmp/", // rel. to BLDROOT
    htmlStagingDirII = "funInTheSun/";
var HTML_STAGING_I_ABS, HTML_STAGING_II_ABS; // abs path gets set after cmd params read in
var htmlWaste = []; // collects stale HTML files during bld process (files with templating code, etc. that don't get overwritten during bld process) which will get removed at cleanup

// remove debug comments from these files only.  paths rel to source root
var REMOVE_DEBUG_COMMENTS_FROM_THESE_FILES = {
    "html": [htmlMapping.src + 'index.html'],
    "js": [jsMapping.src + 'login/login.js',
            jsMapping.src + 'shared/helperClasses/xcUser.js',
            jsMapping.src + 'HTTPService.js',
            jsMapping.src + 'globalEnums.js'
        ],
};

var HTML_BUILD_FILES = []; // a final list of all the bld files, rel. to bld dest (need this for final prettification after minification in installer blds since we're mapping bld html to bld root)

//var DONT_CHMOD = ['assets/stylesheets/css/xu.css'];

            /** JS MINIFICATION VARIABLES */

// files in the following list will have their <script> tags parsed;
// js files included by those script tags will be minified
//   'path': path to the file to be minified
//   'rel': directory within bld where file should end up (in case it's partial
//         being included at a different level).  If not supplied assumes bld root
var PARSE_FILES_FOR_MINIFICATION = [
    {'path': 'site/partials/loginPart.html','rel': "assets/htmlFiles/"},
    {'path': 'site/partials/script.html'},
];
var MINIFY_FILE_EXT = ".js"; // extenion minified files will have
var JS_MINIFICATION_START_DIR = jsMapping.src; // dir to start doing minification from
// dir level below JS_MINIFICATION_START_DIR at which point js files should be
// concatted together in to a single file named after the dir.
// Files in dirs above this level get minified one by one to file by same name.
// Count starts at 1; depth of 0 means all js files from start minified into one file
// (example: if minifcation starts at /assets/js and depth is 2,
// assets/js/A.js and assets/js/B.js minified in to their own file,
// but all files at or nested below dir assets/js/C/ get be concatted at minified
// in to a single file called C.js
var JS_MINIFICATION_CONCAT_DEPTH = 2;

// There are tasks run post-js-minification: updating <script> tags in html
// files to the minified paths, and removing the unminified files from the build
// Add uglify targets that should be excluded from these tasks
var EXCLUDE_UGLIFY_TARGETS_FROM_POST_MINIFICATION_TASKS = [];
// todo: (only excluded from script tag updating because src/dest attrs
// for these targets won't get added to filepath mapping,
// but clean iterates target by target and excludes targets, revisit
// to make this better)

        // End minification vars //

// a key in grunt config to hold mapping of unminified --> minified file paths
// (for updating script tags after minification)
var MINIFICATION_FILEPATH_MAPPING = 'jsFilepathMapping';

// config filepath
var CONFIG_FILE_PATH_REL_BLD = 'assets/js/config.js'; // path rel. to build root

var generatedDuringBuild = {}; // keep track of generated files/dirs you want to display in final summary that would be useful

        /** WATCH FUNCTIONALITY */

var WATCH_LIVERELOAD_HASH_CONFIG_KEY = 'livereloadmap'; // a key for grunt.config to hold mapping of watch filetypes and if they should be reloaded
        // configed dynamically based on user params

/** template keys for grunt plugins, and their defaults:
    (since the Grunt has two functionalities - as a bld tool that blds everything,
    and watch specific files, the plugin tasks will get their src (files to perform task on)
    dynamically, using template keys that get set throughout script)
    Parameterizing the key names since they get referenced throughout script
*/
var LESS_TEMPLATE_KEY = 'getless',
    HTML_TEMPLATE_KEY = 'gethtml',
    STAGE_HTML_TEMPLATE_KEY = 'stagehtml',
    JS_TEMPLATE_KEY = 'getjs',
    CSS_TEMPLATE_KEY = 'getcss',
    CHMOD_TEMPLATE_KEY = 'chmodt';
// default values.  default being, what you'd want if you're executing a full bld
var TEMPLATE_KEYS = {
    [LESS_TEMPLATE_KEY]: '*.less',
    [HTML_TEMPLATE_KEY]: '**/*.html',
    [STAGE_HTML_TEMPLATE_KEY]: '**/*.html',
    [JS_TEMPLATE_KEY]: '**/*.js',
    [CSS_TEMPLATE_KEY]: '**/*.css',
    [CHMOD_TEMPLATE_KEY]: '**/*',
};

var END_OF_BUILD_WARNINGS = []; // some warnings that might be bugs we collect over build life to display in summary

                            /** BLACKLISTS */

var DONT_PRETTIFY = [
    "datastoreTut1.html", "datastoreTut2.html",
    "workbookTut.html", "datasetPanelTutA1.html",
    "importDatasourceTutA2.html", "browseDatasourceTutA3.html",
    "browseDatasource2TutA4"];

// don't template these html files (if dir won't template any files within the dir)
// should be rel <project source>
var DONT_TEMPLATE_HTML = htmlMapping.required;
DONT_TEMPLATE_HTML = DONT_TEMPLATE_HTML.concat([ // xpeInstaller included files
    'site/xpe/eulaPart.html',
    'site/xpe/xpeCommonHeadTags.html',
    'site/xpe/xpeCommonScriptImports.html',
    'site/xpe/progressBarSetup.html'
]);

/**
 list of files and/or dirs, not to minify
 Make dirs REL BLD. wont minify any file within that dir
 For files, just put the filename.  Won't minify any file with that name.
 (want to be able to debug these in the field regularly
 and if you minify them putting breakpointst becomes really difficult)
*/
var DONT_MINIFY = ['3rd', 'assets/js/unused', 'assets/js/worker', 'config.js'];
// at end of bld will chmod everything to 777.  dont chmod what's in here (it fails on symlinks which is why im adding this)
var DONT_CHMOD = ['xu.css', UNIT_TEST_FOLDER];
/** project src files and dirs to explicitally exclude from bld.
    Anything specified here will be EXCLUDED during initial rsync of src code in to build root
    Paths should be relative to SRC ROOT.

    Be aware - if your ROOT and DEST are same (you're blding in to root), then initially those bld dirs will get made
    and then you will do rsync.  And so need to add in at that time, to exclude that dir from the rsync otherwise you'll
    fall in to a recursive loop (since it is rsyncing the dir as it's filling up...) however, might not know dest dir name
    until after user params, so can not add it in here yet...
*/
var DONT_VALIDATE = [INITIAL_GRUNT_PROCESS_TASKLIST]; // dont do param validation on these grunt.options values
var DONT_RSYNC = [
        '*.git*',
        "'/internal'",
        "'/Gruntfile.js'", // if you don't add as '/<stuff>', will exclude any file called <stuff> anywhere rel to rsync cmd
                // only want to remove our Gruntfile at the root!
        'gruntMake.js',
        "'/Makefile'",
        "'/node_modules'",
        "'/package-lock.json'",
        "'/package.json'",
        "'/prod'",
        'services/expServer/awsWriteConfig.json',
        '3rd/microsoft-authentication-library-for-js/*',
        'assets/xu/themes/simple/css/xu.css',
        'assets/help/XD/Content/B_CommonTasks/A_ManageDatasetRef.htm',
        'assets/help/XI/Content/B_CommonTasks/A_ManageDatasetRef.htm',
        'assets/video/demoVid*',  // removes some ancient video files, no longer used
        'assets/js/constructor/README',
        UNIT_TEST_FOLDER, // will just put symlink to this in dev blds
        'site/genHTML.js',
        "'/external'", // this contains the web site, which we do not need
            // don't regen previously build bld targets
        "'/" + XDprodName + "'",
        "'/" + XIprodName + "'",
        "'/" + XDEEprodName + "'",
        "'/xcalar-infra'", // Jenkins jobs XDTestSuite whill clone xcalar-infra in to workspace, and grunt called later in the process.
            // therefore if the workspace is xcalar-gui, xcalar-infra will get built in to it, and then when grunt is called,
            // will end up in tarred build output if not excluded
        'frommake',
        "'/xcalar-gui'", // "" ""
    ];
    /**
        exclude the files specified for removal in the individual file type builders
    */
DONT_RSYNC = DONT_RSYNC.concat(constructorMapping.remove.map(x => constructorMapping.src + x));
// code line above prepends .src attr to each el in .remove list, to obtain path rel to SRCROOT (.src rel to SRCROOT, .remove els rel to .src)
DONT_RSYNC = DONT_RSYNC.concat(cssMapping.remove.map(x => cssMapping.src + x));
DONT_RSYNC = DONT_RSYNC.concat(htmlMapping.remove.map(x => htmlMapping.src + x));
DONT_RSYNC = DONT_RSYNC.concat(jsMapping.remove.map(x => jsMapping.src + x));

DONT_RSYNC_FASTCOPY = DONT_RSYNC.concat("3rd/**/*").concat("services/**/*")
    .concat("assets/help/**/*");

DONT_RSYNC_RC = DONT_RSYNC.concat("assets/extensions/ext-unused");

module.exports = function(grunt) {
    if (grunt.option('help')) {
        displayHelpMenu();
        grunt.fail.fatal(""); // Suppresses grunt's file
    }

    pkg = grunt.file.readJSON('package.json');

    /**
        do initialization specific initial
        Grunt run (top level process)
        (see function documentation)
    */
    grunt.log.writeln("check for parent process");
    if (!grunt.option(INITIAL_GRUNT_PROCESS_TASKLIST)) {
        parentInit();
    }

    /**
        set up all config data, cmd option processing, etc.
        ORDERING IS IMPORTANT

        In this order:
        (1) Process command line options
        (2) Validate necessary qualities of project source (depends on (1))
        (3) set grunt.initConfig (depends on (1))
        (4) set dynamic attributes in to grunt.config (depends on (2)
        (5) register plugin tasks with grunt (depends on (2))
            (3 or 4 doesn't matter which comes first)
        (6) Configure watch plugin based on user params (depends on (3), (4))
    */

    processCmdOptions(); // Process command line options

    /**
        init Part (2) : now have SRCROOT;
            validate some qualities about it before building
            (ex; xcalar-idl submodule should be present and populated)
    */
    validateProjectSource();

    /**

        init Part (3) : setup grunt initConfig

            Some work in this build script (minification, HTML prettifying, etc.)
            will be accomplished using Grunt plugins.
            Grunt plugins and custom multitasks require individual configuration,
            wtihin grunt.initConfig

            If you are new to grunt, read the following link, to understand
            syntax being used here in case you need to modify it.

            https://gruntjs.com/configuring-tasks#compact-format

            Summary points about these plugin tasks:: (since not all in Grunt documentation)

            * Each plugin can have multiple targets defined; call them via grunt.task.plugin(<task>:<target>);
            * Each plugin has its own options unique to that plugin, which can be set via keys in an 'options' hash.
            * cwd, src, dest, expand, flatten, filter, etc. are options avaialble via grunt to all plugins.
                Main are src and dest, to determine what files to use on the task; others are optional

                - src: Files/dir, etc., to execute the task on.  By default, src is relative to Grunt's base, which is process.cwd()
                - cwd: changes what 'src' is relative to.
                - dest: destination dir for filepath of the completed task, i.e., the result of the object/file/dir/etc with the task applied to it.
                    If not specified will use Grunt's running location (unless you have change Grunt settings manually)
                    if dest itself is a relative path, will be relative to what src is relative to.  if it's abs., uses abs. path..
                [[ex: do some task on all html files stored in dirA (Recursive to subdirs), and store the results in destB, retaining dir structure
                cwd: <dirA>, src: **\/*.html, dest: <dirB>]]

            * src list will be stored when initConfig is RUN, not when target is run.
                meaning, suppose you have a target set up
                mytarget: {cwd: /path/, src: SOMELISTOFFILES, dest: /dest/}
                Suppose that initially SOMELISTOFFILES is an empty list, and it gets filled up dynamically, before the target is invoked.
                Those dynamic values will not gert used. Rather it's going to store the values that are present at time initConfig is run
                If you want to do something dynamic like that, where you won't know the values until shortly before you call the target,
                you will need to use template string instead to communicate the values.

            * Syntax: There are 3 main syntax options on how to use these, based on your scenario:

                // 1. ONLY ONE src/dest pairing for the target.  You can also use additional options l;ike filter, etc. (Here path1, path2 will both map in to dest)
                    <target>: { src : [<path1>,<path2>], dest : <dest> }

                // 2. MULTIPLE src/dest mappings, and do NOT need any of the extra options beyond src and dest such as filter, flatten, etc; src, dest understood by context
                    <target>: { files: { <destA> : [<pathA1>,<pathA2>], <destB> : [<pathB1>,<pathB2>] } }

                // 3. MULTIPLE src/dest mappings, and DO need additional options such as filter, flatten, etc.
                    <target>: { files: [{src: [<pathA1>,<pathA2>], dest:<destA>, expand:true},{src: [<pathB1>,<pathB2>], dest:<destB>, flatten:true}] }

                ** SOME PLUGINS USE THEIR OWN CUSTOM SYNTAX - rsync is an example.

            * GLOBBING PATTERNS: **\/*.html matches all html files from cwd and recursively
            * once you set configuration datao for a plugin, make sure to install the plugin, and add grunt.task.loadplugin(<full plugin name>);

            NOTES: if you get 'unable to read' on doing recursive file operations such as 'copy', make sure you have expand:true in the options

    */
    grunt.initConfig({

        /**
            Templatea key note:
            The attrs of many tasks below rely on template keys (i.e., <%= SRC_ROOT %>)
            This allows you to dynamically change the src for tasks,
            which will be needed for watch functionality (ex: do html processing tasks
            on a specific file, vs. the entire html src directory)
            Template keys must be set as attrs of this grunt.config to be picked up by tasks.
            So, once initConfig completes, set in default values.
            Watch functionality will set them dynamically as needed
        */

        // changes file permissions ala chmod.
        // using because fs.chmod does not offer -R (recursive) option,
        // and need to change permissions of entire dest dir once it is built
        chmod: {
            // change permissions of everything in the build (call this once build is complete)
            finalBuild: {
                options: {
                    mode: '777'
                },
                cwd: BLDROOT,
                src: '**/*',
                expand: true,
                filter: function(filepath) {
                    filename = path.basename(filepath);
                    var containingDirRelBld = path.relative(BLDROOT, path.dirname(filepath));
                    if (DONT_CHMOD.indexOf(filename) !== -1 ||
                        DONT_CHMOD.indexOf(containingDirRelBld) !== -1) {
                        grunt.log.debug("Do NOT CHMOD the file @: " + filepath + "... (Blacklisted)");
                        return false;
                    } else {
                        return true;
                    }
                },
            },
        },

        /**
            remove files/folders
            Using because grunt.file.delete doesn't allow globbing patterns
        */
        clean: {
            // remove html Staging area once you are done using it.  poor html staging area :'(
            htmlStagingI: [HTML_STAGING_I_ABS], // for clean, you need to put the 'src' in [] else it will only delete what is within the dir
            htmlStagingII: [HTML_STAGING_II_ABS], // for clean, you need to put the 'src' in [] else it will only delete what is within the dir
            tsWatchStaging: [TS_WATCH_STAGING],
            extraTsStaging: [BLDROOT + EXTRA_TS_FOLDER_NAME],

            // generatel target for removing dirs/files; set src dynamically, supply abs. paths
            custom: {
                // set src here
                src: [],
            }
        },

        /**
            does a depth first search to clean out empty dirs.
            (using it to clean up the build after everything is done)

             ex:
            If you have
                A/ --
                    B/ --
                        C/
            And all these are empty, it will remove C first, then B becomes empty, will remove B,
            A becomes empty now, and removes A

        */
        cleanempty: {
            options: {
                files: false,
                folders: true,
                noJunk: true, // considers dirs with only things like 'thumbs.db' to be empty and so will remove those too
            },
            finalBuild: {
                options: {
                    files:false, // do NOT clean empty files.  Make sure to have this; default is true, and make empty config file on some builds and you want to keep it!
                },
                src: BLDROOT + "**/*",
                expand: true,
            },
        },

        concurrent: {
            options: {
                logConcurrentOutput: true,
            },
            watch: {
                tasks: [],
                // set which watch targets to run dynamically based on user params
            },
        },

        /** copy operations (using because grunt.file.copy api does not copy entire dir) */
        copy: {

            // shift HTML src to initial Staging dir
            stageHTML: {
                options: {},
                cwd: BLDROOT + htmlMapping.src,
                src: '<%= ' + STAGE_HTML_TEMPLATE_KEY + ' %>', //'**/*', // copies everything starting from not including the top level html src, in to the staging dir, maintaining dir strucoture
                expand: true,
                dest: HTML_STAGING_I_ABS,
                filter: function (filepath) {
                    // Construct the destination filepath.
                    ccwd = grunt.config('copy.stageHTML.cwd');
                    cdest = grunt.config('copy.stageHTML.dest');
                    relportion = path.relative(ccwd, filepath);
                    var filedest = path.join(
                        grunt.config('copy.stageHTML.dest'),
                        relportion
                    );
                    grunt.log.debug("filepath: " + filepath + " cwd: " + ccwd + ", dest: " + cdest + " rel: " + relportion + " dest: " + filedest);
                    return true;
                },
            },
            // shift final processed HTML from the second staging dir, to it's final destination
            destHTML: {
                options: {},
                cwd: HTML_STAGING_II_ABS,
                src: '**/*', // copies everything starting from not including the top level html src, in to the staging dir, maintaining dir strucoture
                expand: true,
                dest: BLDROOT + htmlMapping.dest,
            },
            /**
                There is a help content dir for generating the help anchors, for each individual product,
                under assets/help/
                Only want the dir relevant to product being built, in our final build, and want it in assets/help/user

                Therefore, will want to:

                1. cp assets/help/<PRODUCT> --> assets/help/user <-- what this target does
                2. delete all other dirs in assets/help/ beside assets/help/user <-- clean up portion of generating help contaent will take care ofe this

                In the case of a dev bld, of course you don't want to do step 2 because it would be the project src itself
            */
            transferDesiredHelpContent: {
                options: {},
                cwd: BLDROOT + helpContentRootByProduct[PRODUCT], // worked with and without trailing '/'
                src: "**/*", // get ALL files at and nested within cwd.  THey will all be paths relative to cwd (retaining dir structure)
                expand: true, // need this option to make sure you go nested; it fails when I take it out.  allows you to expand items in 'src' arg dynamically
                dest: BLDROOT + helpContentMapping.src, // confusing naming, it's src because this is the src of where the relative files should be
                    // required generating the actual helep content. hence, why we are creating it now; this target is setting up for that process.
            },
            /**
                front-end developers develop the constructor files within their git repo, in constructorMapping.src
                In the final build, these files need to be in constructorMapping.dest.
            */
            constructorFiles: {
                options: {},
                cwd: SRCROOT + constructorMapping.src,
                src: "*", // get ALL files at and nested within cwd.  THey will all be paths relative to cwd (retaining dir structure)
                expand: true, // allows 'src' arg to be dynamically populated (so will fail without, if you're supplying a glob to 'src')
                dest: BLDROOT + constructorMapping.dest,
            },

            /**
                This target being used by watch tasks,
                so you can port in dirs/files required for re-generating a particular filetype if it changes
                (ex. for html file, you need to do includes, templatign etc., so if watching an html
                src file, not always sufficient to just copy in that changed file, you might need these
                others.).
                The 'src' attribute will get set dynamically, to specify the dependencies for that file
                Using this instead of rsync because can't control cwd on rsync plugin,
                filter here is so you don't copy over existing files
            */
            resolveDependencies: {
                options: {},
                cwd: SRCROOT,
                src: [], // if you discover you need dep., should set this via grunt.config then run the task
                expand: true,
                dest: BLDROOT,
                // Copy only if file does not exist.
                filter: function (filepath) {
                    // Construct the destination file path.
                    ccwd = grunt.config('copy.resolveDependencies.cwd');
                    cdest = grunt.config('copy.resolveDependencies.dest');
                    relportion = path.relative(ccwd, filepath);
                    var filedest = path.join(
                        grunt.config('copy.resolveDependencies.dest'),
                        relportion
                    );
                    grunt.log.debug("cwd: " + ccwd
                        + ", dest: " + cdest
                        + " rel: " + relportion
                        + " exists? " + grunt.file.exists(filedest));
                    // Return false if the file exists.
                    return !(grunt.file.exists(filedest));
                },
            },
        },

        // minifies HTML
        htmlmin: {
            stagingII: { // html processing is done within staging area
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    preserveLineBreaks: true
                },
                //cwd: BLDROOT + htmlMapping.dest,
                cwd: HTML_STAGING_II_ABS,
                src: ['<%= ' + HTML_TEMPLATE_KEY + ' %>'],//['**/*.html'],
                expand: true,
                //dest: BLDROOT + htmlMapping.dest,
                dest: HTML_STAGING_II_ABS,
                //ext: '.testing',
            },
        },

        /**
            Resolves 'include' statements in HTML files.
        */
        includes: {
            staging: { // html processing done within staging area. omit dest to keep processsed file at same place
                options: {
                    silent: true,
//                    includePath: BLDROOT + htmlMapping.src,
                },
                cwd: HTML_STAGING_I_ABS,
                src: '<%= ' + HTML_TEMPLATE_KEY + ' %>',// HTML_STAGING_I_ABS + '**/*.html', // get all html files in 'cwd', recursive
                expand: true,
                dest: HTML_STAGING_I_ABS,
            }
        },

        // compiles build CSS from src less files
        less: {
            dist: {
                options: {
                    //paths: ['assets/css']
                },
                cwd: BLDROOT + cssMapping.src,
                src: '<%= ' + LESS_TEMPLATE_KEY + ' %>', //grunt.option(WATCHFLAG) || '*.less', // get all less files in 'cwd' (only get the top level ones)
                expand: true,
                dest: BLDROOT + cssMapping.dest,
                ext: ".css",
                filter: function(filepath) {
                    fileme = path.basename(filepath);
                    if (cssMapping.exclude.hasOwnProperty(fileme)) { // check if one of the efiles to exclude
                        return false;
                    } else {
                        return true;
                    }
                },
            },
        },

        // cleanup bld HTML such as indenting inner HTML
        prettify: {
            options: {
                "wrap_line_length": 80,
                "preserve_newlines": true,
                "max_preserve_newlines": 2
            },

            //dist: {
            stagingII: {
                cwd: HTML_STAGING_II_ABS,
                src: '<%= ' + HTML_TEMPLATE_KEY + ' %>',//**/*.html',
                expand: true,
                //dest: BLDROOT + htmlMapping.dest,
                dest: HTML_STAGING_II_ABS,
                /**
                    filter out files we don't want to prettify
                    (each filepath matched by src glob will be passed to this function)
                */
                filter: function(filepath) {
                    return canPrettify(filepath);
                },
            },
            /** prettify:cheerio target -
                collect fully processed bld HTML files and removes blank lines.
                needed because, if you use cheerio to update js script tags in the HTML during minification,
                it leaves you with empty lines where you removed DOM elements.
                doing this from the html bld dest, because this task will be done after js minification,
                once the files are already processed and in their final destination.

                PROBLEM to be aware of - we're mapping the final build html to the build root.
                So you're going through and prettifying EVERYTHING starting from that dir
            */
            cheerio: {
                options: {
                    "wrap_line_length": 80,
                    "preserve_newlines": true,
                    "max_preserve_newlines": 2
                },
                cwd: BLDROOT + htmlMapping.dest,
                src: "**/*.html",
                expand: true,
                dest: BLDROOT + htmlMapping.dest, // replace files
                /**
                    ABOUT THIS FILTER:
                    - Only want to prettify bld files (not 3rd party,e tc.)
                    - However, bld dest for html is the bld root itself,
                        so collecting all html files rooted at html's dest in bld,
                        will get all html files in the bld, not just actual bld ones
                    - We Have list of what are the final bld files,
                      but it gets built up dynically as build is running (though before this task runs)
                      and is empty when script begins and initConfig run.
                    - the prettify target, if you give a list as its 'src' attr, will consider the list's
                      value at time initConfig runs, NOT at time target itself runs (fml)
                      Which means, we can not use that list as the 'src' attribute directly
                    - Therefore, provide filter, and for each filepath, see if its one of the bld files.
                */
                filter: function(filepath) {
                    var ccwd = grunt.config('prettify.cheerio.cwd');
                    // remember there's alo prettification blacklist
                    if (canPrettify(filepath) &&
                        HTML_BUILD_FILES.indexOf(path.relative(ccwd, filepath)) !== -1) {
                        return true;
                    } else {
                        grunt.log.debug("Skip cheerio prettification of "
                            + filepath
                            + "\n; not one of the bld html files collected."
                            + "\nFILES COLLECTED DURING BLD:\n"
                            + HTML_BUILD_FILES);
                    }
                },
            }
        },

        /*
            runs rsync cmd for file transfer.
            (rsync uses a different syntax!! everything goes in 'options'; cwd doesn't seem to work)
        */
        rsync: {
            /**
                rsync:initial ports in contents of src dir to build root for initial build up.
                using this rather than cp/grunt-contrib-copy because rsync has useful options for excluding dirs,
                else would either need to supply a filter to copy method (which will test at each dir), or copy in
                everything and remove excluded dirs as an additional step.
                Also, if you ever want to be able to run this over another host, should be easy, check out
                documentation of grunt-rsync; maybe add in a cmd option for this
            */
            initial: {
                options: {
                    args: ['-a', '--update'/** --verbose */], // put rsync options you want here (-a will preserve symlinks, ownership, etc; see rsync man page
                    exclude: DONT_RSYNC,
                    include: ['3rd/microsoft-authentication-library-for-js/dist'],
                    src: SRCROOT + '.', // will copy starting from SRCROOT
                    dest: BLDROOT,
                    recursive: true,
                },
            },
            rc: {
                options: {
                    args: ['-a', '--update'/** --verbose */], // put rsync options you want here (-a will preserve symlinks, ownership, etc; see rsync man page
                    exclude: DONT_RSYNC_RC,
                    include: ['3rd/microsoft-authentication-library-for-js/dist'],
                    src: SRCROOT + '.', // will copy starting from SRCROOT
                    dest: BLDROOT,
                    recursive: true,
                },
            },
            fastcopy: {
                options: {
                    args: ['-a', '--update'/** --verbose */], // put rsync options you want here (-a will preserve symlinks, ownership, etc; see rsync man page
                    exclude: DONT_RSYNC_FASTCOPY,
                    include: ['3rd/microsoft-authentication-library-for-js/dist'],
                    src: SRCROOT + '.', // will copy starting from SRCROOT
                    dest: BLDROOT,
                    recursive: true,
                },
            },
        },

        /** auto generates script tags in to HTML docs

            - switched to 'scriptlinker' from 'tags' because it provides option to make tags rel to a root;
            if you use 'tags', tag will be rel. to location of file when task invoked.
            This task being invoked while file in staging area, so that will ultimately be incorrect.
            Done in staging area because autogen script tasks work by looking for autogen start comments, which get removed by htmlmin

            - This task will fail if you are watching an html file and rebld only that file
        */
        scriptlinker: {
            options: {
                startTag: '<!-- start auto template tags -->',
                endTag: '<!-- end auto template tags -->',
                appRoot: htmlMapping.dest,
            },
            login: {
                options: {
                    // will end up with tags as ../../assets/js while most other
                    // login script tags are ../js (common ancestor)
                    // this is because the src attrs (list of files to create
                    // script tags for) for both scriptlinker targets
                    // are getting generated from a common list (see getExtraLoginTags)
                    // so going out to the max depth needed between both targets
                    fileTmpl: '<script src="../../%s" type="text/javascript"></script>',
                },
                cwd: BLDROOT,
                // src set in dynamically based on bld qualities
                dest: HTML_STAGING_II_ABS + htmlTemplateMapping['login.html'],
            },
            index: {
                options: {
                    fileTmpl: '<script src="%s" type="text/javascript"></script>',
                },
                cwd: BLDROOT,
                // src set in dynamically based on bld qualities
                dest: HTML_STAGING_II_ABS + htmlTemplateMapping['index.html'],
            },
        },

        /**
            grunt-contrib-uglify-es to minify (collapse and mangle) javascript files for the build output
        */
        uglify: {

            /**
                static uglify targets need the following format for
                post-minification tasks to work:

            mytarget: {
                src: [BLDROOT + '3rd/adal.js', BLDROOT + "3rd/chai.js"], // src files are abs filepaths (no dir or glob)
                dest: BLDROOT + 'myfile.js' // dest is abs path
                // (no restrictions on other attrs/options)
            },

            you can skip these restrcitions by adding the target
            name to 'EXCLUDE_UGLIFY_TARGETS_FROM_POST_MINIFICATION_TASKS'
            but script tags will not be updated in HTML post-minification

            */

            /**
                configure for remaining targets of this plugin done dynamically
                during build, see function configureDynamicUglifyTargets
            */
            sqlHelpers: {
                src: [BLDROOT + "services/expServer/sqlHelpers/enums.js",
                      BLDROOT + "services/expServer/sqlHelpers/sqlApi.js",
                      BLDROOT + "services/expServer/sqlHelpers/sqlCompiler.js",
                      BLDROOT + "services/expServer/sqlHelpers/transaction.js",
                      BLDROOT + "services/expServer/sqlHelpers/xcGlobal.js",
                      BLDROOT + "services/expServer/sqlHelpers/xcHelper.js",
                      BLDROOT + "services/expServer/sqlHelpers/xiApi.js",
                      BLDROOT + "services/expServer/sqlHelpers/sqlQueryHistory.js",
                      BLDROOT + "services/expServer/sqlHelpers/kvStore.js"],
                dest: BLDROOT + "services/expServer/sqlHelpers/sqlHelpers.js",
                options: {
                    compress: {
                        inline: false
                    }
                }
            }
        },

        /**
            grunt-contrib-concat to concat javascript code/files
        */
        concat: {
            options: {
              footer: '\nif (typeof exports !== "undefined") {exports.Thrift = Thrift;}'
            },
            thrift: {
                src: [BLDROOT + 'assets/js/thrift/thrift.js'],
                dest: BLDROOT + 'assets/js/thrift/thrift.js',
            },
        },

        /**
            Watch plugin:
            Runs chron job, monitoring for changes in files specified in 'files' attr.
            If any changes detected, a watch event is emitted, and then executes
            list of tasks in the 'tasks' attr, and then plugin target restarted.
            [[If 'livereload' enabled, then when plugin starts, a livereload server
            spun up, and changed file sent to the livereload server]]

            *** PLEASE READ BELOW NOTES BEFORE YOU MODIFY THIS PLUGIN CONFIGURATION ***

            - 1. Which files to watch, and which filetypes to livereload,
                determined dynamically via user cmd options.

            - 2. devs want option to be able to watch certain file types, and livereload
                only subset of those filetypes
                However, 'livereload' attr can NOT be configured dynamically after watch task begins..
                Therefore, need more than one task, to support diff livereload configs
                (the need for more than one task, is why we are running grunt-concurrent)

            - 3. You can NOT run more than 1 watch target with livereload enabled,
               because each one will spin up a livereload server, and either
                (1) you'll need to give distinct ports in which case your browser can only
                    connect to one of them, or
                (2) the targets will go to the default port and you'll have a conflict and die.
              Therefore, keep two targets, one for files you want to watch with lr disabled,
              one with lrenabled.

            - 4. since limited to only one target with livereload enabled, we will
                include ALL files user wants livereload on in the files list, and
                because of 1., will configure the '.files' attr dynamically.

            - 5. Because of 4., no way to know before hand which tasks to run before Grunt begins.
                Each time a watched file changes, it emits a watch event for that specific file.
                Therefore, '.tasks' attr will be set in the watch event, and depending on
                wchioh file was changed.

            - 6. WHY SPAWN IS BEING SET FALSE::
                ~ 'spawn' attr defaults to true.
                ~ If true, then once a watch event occurs, a new Grunt process is spawned,
                    with the list of Grunt tasks in '.tasks' passed to it as its task list.
                    Any resulting watch events detected by the parent will be queued up,
                    and only emitted in the parent after child process copmpletes.
                ~ If 'spawn' false, then the tasks will be executed in the same
                    process, and subsequent watch events will emit right away.
                    Once task for that event concludes, watch plugin is re-run in the same proces.s
                ~ If you need to catch changes triggered by a running sibling process,
                    spawn false can create issue: since the plugin restarts, and can take
                    some time to restart, during this restart time you can miss events.
                ~ If the tasks you need to run for an event might trigger events in the same
                    target that you DON'T watch to catch
                    (i.e., html processing triggering changes in other html files),
                    spawn true can create issue: since the events only get queued up and
                    emit after child process completes (once tasklist done),
                    no good way to distinguish between user change and internal change!
                ~ Right now, we do NOT need to catch events triggered by siblings,
                    but high probabliity of task list triggering events in the same target,
                    wchih is why spawn is being set as false.
        */
        [WATCH_PLUGIN]: {

            [LR_ON]: {
                files: [],
                tasks: [],
                options: {
                    livereload: true,
                    spawn: false,
                },
            },
            [LR_OFF]: {
                files: [],
                tasks: [],
                options: {
                    livereload: false,
                    spawn: false,
                },
            },
        },

    });

    /**
        init Part (4)

            (call after grunt.initConfig)

        Set grunt config data (such as src template keys used by task targets),
        which rely on cmd option values.

        On ordering:
        Can not do this as part of 'processCmdOptions()',
        as that method must be called BEFORE grunt.init,
        and this must be called AFTER grunt.init, as that is what
        creates the 'grunt.config' object the function will set data in to.
        Should be called prior to any tasks executing.

    */
    resetTemplateKeys();

    /**
        init part (5).

        load the plugin tasks configured above
        (Grunt Requirement for any plugins you want to use)
    */
    grunt.loadNpmTasks('grunt-chmod');
    grunt.loadNpmTasks('grunt-cleanempty');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify-es');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-includes');
    grunt.loadNpmTasks('grunt-prettify');
    grunt.loadNpmTasks('grunt-rsync');
    grunt.loadNpmTasks('grunt-scriptlinker');

    /**
        WATCH WORKFLOW INITIALIZATION:

        rename the 'watch' 3rd party plugin to something else.
        Context: want to deploy the watch processes concurrently,
        via grunt-concurrent.
        However, which targets to deploy depends on user params.
        Therefore, rename so we can have a custom task called
        'watch', which will get hit on the initial run of
        Grunt if 'watch' is given, which will determine and fire off
        appropriate watch plugin targets.
    */
    grunt.task.renameTask(WATCH, WATCH_PLUGIN);

    /**
        init Part (6)/WATCH WORKFLOW STEP 1

        Configure the 'watch' plugin dynamically based on user params,
        if 'watch' task requested.

        - must be called after resetTemplateKeys,
        because it relies on globs set in that function.
        - call after the renaming of the watch plugin
        - must be called before our internal watch task ever executes.
        - must be called for EACH grunt process,
          because, grunt.config data, which this function sets up,
          is not passed to child processes.
          and we are firing off the watch plugin tasks as concurrent
          child processes.
        Therefore, this can NOT be part of our internal 'watch' task
        as that only executes once, in the parent process
        (Note: an alternative to doing this each Grunt process,
        is to figure out the watch plugin config data only once
        in the parent, then add this as a cmd flag, as those are
        inherited by the child processes.)
    */
    if (IS_WATCH_TASK) { // cant depend on grunt.options('watch' because could be child proc
        configureWatchTasksBasedOnUserParams();
    }

    /**
        keep mapping of unminified-->minified filepaths
        in grunt config so script tags can be updated after js minification
    */
    grunt.config(MINIFICATION_FILEPATH_MAPPING, {});

                                            /** END MAIN INITIALIZATION **/

    /**
        Init task - RUN ONLY ONCE WHEN YOU GET A NEW WORKSPACE
        Will run 'npm install' at cwd, and apply patches to grunt plugins
    */
    grunt.task.registerTask(INIT, "Run 'npm install' in cwd; copy in modified version of watch plugin", function() {

        grunt.log.writeln(("\n=== ALERT:: ==="
            + "\nThis task is about to run 'npm install'"
            + "\nin your cwd, and will then apply any needed "
            + "\npatches to grunt plugins.\n\n").bold.yellow);

        // save cwd so can go back to at end of all cmd executions
        var startcwd = process.cwd();
        grunt.log.debug("Curr cwd: " + startcwd);

        /**
            List of cmd sets to run:
            Each list in list of lists:
            first erlement is where you want to cd to,
            (if rel assuming rel to srcroot)
            second element is list of cmds to run from that dir
        */
        cmdsets = [];

        /**
            will generate a cmdset for each patch in list below.
            to add in suport for a new past, add list:
            [<node_modules dir to remove>, <path to patch rel srcroot>, <path to dir to apply patch cmd in>]
        */
        patches = [
            ['node_modules/grunt-contrib-watch', 'assets/gruntpluginpatch/', 'taskrunpatch.patch', 'node_modules/grunt-contrib-watch/tasks/lib'],
            ['node_modules/grunt-scriptlinker', 'assets/gruntpluginpatch/', 'scriptlinkerpatch.patch', 'node_modules/grunt-scriptlinker/tasks'],
        ];

        // will need to remove each of the node_module dirs and run npm install to get it back.
        // instead of running npm install multiple times, collect list of all the dirs to remove
        // and run as a single cmd
        rmnodemodules= 'rm -r '; // collect all the node_modules you need to remove
        var patchingsets = [];
        for ( patch of patches ) {
            rmnodemodules = rmnodemodules + ' ' + patch[0]; // collecting all the node modules need to remove

            patchingsets.push(
                [SRCROOT,  // copies the patch file in to the dir you want to apply the patch from
                    ['cp ' + patch[1] + patch[2] + ' ' + patch[3]],
                ]);            patchingsets.push(
                [patch[3], //a applies the patch then remove the patch file
                    ['patch < ' + patch[2],
                    'rm ' + patch[2]
                ]]);
        }
        cmdsets.push([ // now that collected all the node modules to remove, add in one cmd and run npm install again
            SRCROOT, [
                rmnodemodules,
                'npm install'
        ]]);
        cmdsets.push.apply(cmdsets, patchingsets); // pushes all the elements in patchcmds in to cmdsets

        // the node_modules generated by this, needs to get rsynced over to bld dir, for expServer to work
        cmdsets.push(['services/expServer', ['npm install']]);

        for (var cmdset of cmdsets) {
            var executefrom = cmdset[0];
            if (!grunt.file.isPathAbsolute(executefrom)) {
                executefrom = SRCROOT + executefrom;
            }
            var cmdlist = cmdset[1];
            grunt.file.setBase(executefrom);
            for (var cmd of cmdlist) {
                grunt.log.writeln(("[" + executefrom + "] $ ").red + (cmd).green.bold);
                var shellOutput = runShellCmd(cmd).stdout;
                grunt.log.debug(("Output:: ").green + shellOutput);
            }
        }

        // back to cwd
        grunt.file.setBase(startcwd);

    });

    /**

        MAIN BUILD TASKS

        These are the tasks intended to be run from cmd line.
        :: > grunt <build flavor>

    */

    /**
        DEV BUILD : Use by front-end developers

        run grunt on the cmd line without any arguments, to trigger this build flavor, or by name:

            ::> grunt dev
    */
    grunt.task.registerTask(DEV, "Default build for frontend developers", function() {

        grunt.task.run(BUILD);

        grunt.task.run(FINALIZE);

    });

    /**
        DEBUG
        Jenkins will use the debug build.  It is just like the default build,
        with no minification, etc.,
        only with developer configuration details removed at the end.  You must
        do this or its going to connect to developer server, etc.  and that's
        why this separate build flavor is offered.

        ::> grunt debug
    */
    grunt.task.registerTask(DEBUG, function() {

        grunt.task.run(BUILD);

        grunt.task.run(NEW_CONFIG_FILE); // clear developer configuration details

        grunt.task.run(FINALIZE);

    });

    /**
        INSTALLER BUILD : What Jenkins will run - intended as an actual shippable build

        ::> grunt installer
    */
    grunt.task.registerTask(INSTALLER, function() {

        grunt.task.run(BUILD);

        grunt.task.run(NEW_CONFIG_FILE); // clear developer configuration details

        // minify AFTER above tasks
        // At end of MINIFY_JS, script tags in HTML are updated to reflect the
        // new minified paths. includes will need to be resolved in the HTML
        // files being updated for the updated script tags to have correct
        // rel paths.  Also, if config file minified want to make sure
        // correct config file is set prior to minification
        grunt.task.run(MINIFY_JS);

        grunt.task.run(FINALIZE);

    });

    /**
        TRUNK : Use by backend developers when they have made changes in
        thrift, and want to test those changes out with the frontend.
        This is just like the default build, only with with front and backend
        synced at the end to ensure communication.

        ::> grunt trunk
    */
    grunt.task.registerTask(TRUNK, 'trunk', function() {

        grunt.task.run(BUILD);

        grunt.task.run(SYNC_WITH_THRIFT);

        // if you ever decide to do js minification for trunk blds
        // make sure it comes after syncWithThrift,
        // -> because config.js gets minified atow,
        // and a custom config.js is needed for trunk blds and that
        // gets generated during synWithThrift

        grunt.task.run(FINALIZE);

    });

                /**
                        HELPER TASKS.
                        SHOULD NOT BE CALLED FROM CMD
                        UNFORTUNATELY NO WAY TO PRIVATIZE TASKS.

                */

    /**
        Remove BLDDIR if it exists (assuming overwrite === true)
    */
    grunt.task.registerTask(PREP_BUILD_DIRS, function() {
        var olColor = 'rainbow';
        grunt.log.writeln('\n\t::::::::::::: SETUP ::::::::::::::::\n');
        grunt.log.writeln(process.cwd());
        if (grunt.file.exists(BLDROOT)) {
            grunt.log.writeln("INFO: BLDDIR: " + BLDROOT + " already exists!");
            if (OVERWRITE) {
                if (BLDROOT === SRCROOT) {
                    grunt.fail.fatal("You can't overwrite your SRCROOT.");
                }
                if (BLDROOT === process.cwd()) {
                    grunt.fail.fatal("You can't overwrite your cwd.");
                }
                grunt.log.writeln("Remove previous BLDDIR");

                if (fastcopy) {
                    files = grunt.file.expand([
                        BLDROOT + "**/*",
                        "!" + BLDROOT + "3rd",
                        "!" + BLDROOT + "3rd/**/*",
                        "!" + BLDROOT + "services",
                        "!" + BLDROOT + "services/**/*",
                        "!" + BLDROOT + "assets/help",
                        "!" + BLDROOT + "assets/help/**/*"]);
                    for (var f of files) {
                        if (f !== BLDROOT + "assets") {
                            grunt.file.delete(f, {force: true});
                        }
                    }
                } else {
                    grunt.file.delete(BLDROOT);
                }
            } else {
                // valid use case: in DEV blds, def behavior is srcroot same as destdir.
                // so in this case you don't mind this happening.
                if (SRCROOT != BLDROOT) {
                    grunt.fail.fatal("Root for build: "
                        + BLDROOT
                        + " already exists!  But option --"
                        + BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS
                        + " set. \nEither omit this option, set to false,"
                        + " or select another bld dir with --"
                        + BLD_OP_BLDROOT +"=<another dir>"
                        + " (It will be created for you if it does not exist)");
                }
            }
        }
        grunt.log.write("Create build dir " + BLDROOT + " ... ");
        grunt.file.mkdir(BLDROOT); // grunt.file.mkdir will make any intermediary dirs
        grunt.log.ok();

        /**

        if BLDROOT (and thus BLDROOT) are dec. from SRCROOT,
        need to exclude the top level destination dir (BLDROOT - the dir at SRCROOT level where bld starts)
        from the initial rsync
        Else, will be filling that dir up, as copying it in, and will copy forever..
        (The dir you add in needs to be relative to wheatever the rsync cmd is rel. to.  currently, SRCDIR...)

        i.e.
                SRCROOT: /home/jolsen/xcalar-gui
                BLDROOT: /home/jolsen/xcalar-gui/out/bld/CodeStartsHere/
                retrieve: 'out', and exclude this from the initial rsync.

        */
        //if ( grunt.file.doesPathContain( SRCROOT, BLDROOT ) ) {
        if (grunt.file.doesPathContain(SRCROOT, BLDROOT)) {
            grunt.log.writeln(BLDROOT + " contained within " + SRCROOT );
            //DONT_RSYNC.push(path.basename(BLDROOT));
            DONT_RSYNC.push(path.relative(SRCROOT, BLDROOT));
        }

        grunt.log.writeln('\n------------------------------------------------------');
        grunt.log.writeln('\nBuilding ' + pkg.name + ' - v' + pkg.version + ' -1 ' + PRODUCT + " variant...\n");
        grunt.log.writeln('\nGenerating Build from repo loc at : ' + SRCROOT);
        grunt.log.writeln('Build Root @ : ' + BLDROOT);
        grunt.log.writeln('Build files begin at @ : ' + BLDROOT);
        grunt.log.writeln('\n-------------------------------------------------------\n');

        grunt.log.writeln('\n\t::::::::::::: END SETUP ::::::::::::::::\n');
    });

    /**
        Runs main build tasks required for all build flavors:

        Rsyncs in src code,
        Generates bld HTML and CSS from it,
        configures dirs for help content, constructor files for durable structs,
        and updates essential JS files to ensure  proper product name displayed in GUI

        (These tasks are independent and aside from rsync which must come first,
        their order does not matter)
    */
    grunt.task.registerTask(BUILD, function() {

            // now construct the ultimate build directory
            grunt.task.run(PREP_BUILD_DIRS); // generate dirs needed for build process

            /**
                For DEV BLDS:
                The default behavior is to put the bld output directly at same root as project src.
                (Though user can specify params to change this behavior)
                So for a dev bld following the default behavior, do NOT do the initial rsync!
                (Similarly on other blds user could use params to make it this way,
                so only do the rsync if the bld and src root are different
            */
            if (SRCROOT != BLDROOT) {
                if (fastcopy) {
                    grunt.task.run("rsync:fastcopy");
                } else if (grunt.option(BLD_FLAG_RC_SHORT) ||
                           grunt.option(BLD_FLAG_RC_LONG)) {
                    grunt.task.run("rsync:rc");
                } else {
                    grunt.task.run("rsync:initial");
                }

            }
            grunt.task.run(HELP_CONTENTS);
            grunt.task.run(BUILD_CSS);
            // XXX It won't work until antlr4 is correctly packaged
            // grunt.task.run(BUILD_PARSER);
            grunt.task.run(BUILD_JS); // build js before html (built html will search for some js files to autogen script tags for, that only get generated here)
            grunt.task.run(WEBPACK); // keep after build js because it builds from js files;
                // not relying on any xd js files yet but in case this happens in future
            grunt.task.run(BUILD_HTML);
            grunt.task.run(CONSTRUCTOR_FILES);
            grunt.task.run(BUILD_EXTRA_TS);
            /**
                In XI builds, update essential js files where UI msgs reside,
                to display Xcalar Insight rather than xcalar design
                (the files developed with XD strings by default)
            */
            if (PRODUCT === XI) {
                grunt.task.run(UPDATE_ESSENTIAL_JS_FILES_WITH_CORRECT_PRODUCT_NAME);
            }
            // Generate TS definition for jsTStr.js in dev build
            if (BLDTYPE === DEV) {
                grunt.task.run(GENERATE_TSDEF);
            }
    });

                            // ============================= HELP CONTENTS =================================


    /**
        Generate js file that contains structs to use for help anchors.
        This will be done parsing through htm documentation and parsing
        Generate help tags file

        Will store 2 variables:

        var csLookup: <n entries per file; one for each 'ForCSH' <a href> class tag

        var helpHashTags: <1 entry per file>
    */
    grunt.task.registerTask(HELP_CONTENTS, function() {

        // you have XD and XI help contaente in the src code that was copied in
        // copy what you need in to /usr and delete the rest
        // corner casE: srcroot and destdir are the same.  In that case still do the usr dir,
        // but don't delete...
        grunt.task.run('copy:transferDesiredHelpContent');

        // generate structs file using the relevant help content
        grunt.task.run(GENERATE_HELP_STRUCTS_FILE);

        // file for searching help content in XD
        grunt.task.run(GENERATE_HELP_SEARCH_INSIGHT_FILE);

        // delete out those folders not related (this could be done before or after the main generateHelpStructsFile task,
        // but putting it after in case there ever are some pending tasks for cleanup)
        if (SRCROOT != BLDROOT) {
            grunt.task.run(CLEANUP_HELP_CONTENT_DIR);
        }
    });

    /**
        Generates the htm file for searching help in XD
        Insert custom styling so it conforms to the XD style
    */
    grunt.task.registerTask(GENERATE_HELP_SEARCH_INSIGHT_FILE, function() {

        /**
            get all the html files (except those in 3rd)
             for each html file.. and squash them to go js/<get rid stuff>/filename

            - Generate a file SearchInsight..html

            In that file:.

            - Open the file assets/help/user/Content/Search.htm
            - read through it, writing each of its line, until you hit <style> tag...
                when you hit the <style> tag,
                you add in the content from site/partials/mcf.html
                TYhen you keep going and write the rest of the Search.htm fila
        */
        readFile = BLDROOT + 'assets/help/user/Content/Search.htm';
        insertFile = BLDROOT + 'site/partials/mcf.html';
        // anew file loc
        basefilename = path.basename(readFile, path.extname(readFile));
        origFileLoc = path.dirname(readFile); // dir to put in
        if (!origFileLoc.endsWith(path.sep)) { origFileLoc = origFileLoc + path.sep; }

        newfilename = path.basename(readFile, path.extname(readFile)) + 'Insight.htm';
        newfileloc = origFileLoc + newfilename;

        // read contents of the files
        filecont = grunt.file.read(readFile);
        insertFileCont = grunt.file.read(insertFile);

        /**
            Insert the custom style contents, right before the initial <style> tag
            'split', on <style> - will not save delimeter... so split,
            write out the first pice (content before first <Style>, write the custom stuff,
            , add back in your delimeter <style>, and then the rest of the data
        */
        var styleDelim = '<style>';
        stylesplit = filecont.split(styleDelim);
        var newContent = "";
        if (stylesplit.length < 2) {
            grunt.fail.fatal("Trying to inserted custom style section in to"
                + readFile
                + "\nSearchin for style tag: '"
                + styleDelim
                + "', but I can not find this tag in the file!");
        } else {

            // section prior to initial <style> tag
            newContent = newContent + stylesplit[0];

            // insert custom styling
            newContent = newContent + "\n\n<!-- Begin section inserted by Grunt -->\n";
            newContent = newContent + insertFileCont;
            newContent = newContent + "\n<!-- End section inserted by Grunt -->\n\n";

            // insert back in the style delim
            newContent = newContent + styleDelim;

            // now add in all remaining pieces in the split ( in case there were more than one style tags)
            for ( i = 1; i < stylesplit.length; i++ ) {
                newContent = newContent + stylesplit[i];
            }

            // write the new file
            writeAutoGeneratedFile(newfileloc, newContent, " File for generating search insight");
        }
    });

    /**
        generate a js file that defines some structs to be used by js files.

        var <structVar> = <JSON data>
    */
    grunt.task.registerTask(GENERATE_HELP_STRUCTS_FILE, function() {

        var helpStructsFilepath = BLDROOT + helpContentMapping.dest,
            content = "";

        // get the data for generating these
        // will be in form: keys (name of a struct var you want to define)
        // value being, the data structure to jsonify
        structVarsData = generateHelpData();

        // generate a String as you want the file to be, holding this data
        var structVar;
        for ( structVar of Object.keys(structVarsData) ) {

            // write data for this file to the help hash tags struct
            content = content + "var " + structVar + " = ";
            content = content + JSON.stringify(structVarsData[structVar], null, '    ');
            content = content + ";\n";

        }

        // create the new file that holds the struct data
        writeAutoGeneratedFile(helpStructsFilepath, content, "help structs file");

    });

    /**
        removes unneeded help content from bld.

        (The src code has dirs help/XD and help/XI, but only one used,
        and it gets renamed as help/user.
        This cleanup task is deleting those unused ones.)
    */
    grunt.task.registerTask(CLEANUP_HELP_CONTENT_DIR, function() {

        // go through the help content dir and delete everything that's not the user dir
        helpContentRootFull = BLDROOT + helpContentRoot;
        helpDirs = grunt.file.expand(helpContentRootFull + "*");//, {filter:'isDirectory'});
        var helpDir, helpDirAbsSrc;
        for ( helpDir of helpDirs ) {
            if (!helpDir.endsWith(path.sep)) { helpDir = helpDir + path.sep; }
            helpDirAbsSrc = BLDROOT + helpContentMapping.src;
            if (helpDirAbsSrc !== helpDir) { // we're only getting the dirs at that top level; not recursive
            //if ( helpDirAbsSrc !== helpDir && !grunt.file.doesPathContain(helpDirAbsSrc, helpDir) ) {
                grunt.log.write("Delete unneeded help content dir : " + helpDir + " ... ");
                grunt.file.delete(helpDir);
                grunt.log.ok();
            }
        }
    });

    /**
        creates a data structure that holds data for all struct vars you'd like to create

        1. get all the htm files
        2. add in data for that htm file for helpHashTags struct (1 per file, it gets h1 tags and agreement there is only one)
        3. parse the file to ffind any <A href tags of 'forCSH' class (could be multiple per file)
            will get one entry in 'csLookup' struct for each of these tags.

        Doing this simultaensoulsy, rather than building up the hash of each struct one at a time, because if you did that
,        you'd have to look through the htm files for each struct you want to get data for

    */
    function generateHelpData() {

        // gather all .htm files friom help dir
        commonRoot = BLDROOT + "assets/";
        helpPath = helpContentMapping.src;
        fullHelpPath = BLDROOT + helpPath;
        htmFilepaths = grunt.file.expand(fullHelpPath + "**/*.htm");

        myStructs = {};
        // structs to fill up
        helpHashTags = "helpHashTags";
        csLookup = "csLookup";
        myStructs.helpHashTags = []; // structs being generated
        myStructs.csLookup = {};

        // for each of ithe files, create the struct data
        relativeTo = commonRoot + "js/";
        for ( htmFilepath of htmFilepaths ) {

            //fullFilepath = BLDROOT + htmFile;
            var $ = cheerio.load(fs.readFileSync(htmFilepath, "utf8")); // get a DOM for this file using cheerio

            /*
                ENTRY FOR 'HELP HASH TAGS' STRUCT
                This is the <h1> data in the file.
                There is an agreement that there should be only one per documentation file.
                So, if you encounter more than one; fail
            */

            $('h1').each(function() {  // gets each 'h1' selector
                // check if more than one
                if (myStructs[helpHashTags].hasOwnProperty(htmFilepath)) {
                    grunt.fail.fatal("Error encountered generating Help hash tags from documentation.\n"
                        + "\nFile: "
                        + htmFilepath
                        + " has more than one h1'\n"
                        + "There is an agreement that there can only be one h1 per documentation file!");
                }
                // put in key fora this
                text = $( this ).text();
                relPath = path.relative(relativeTo, htmFilepath);
                myStructs[helpHashTags].push({'url':relPath, 'title': text});
            });

            /**
                ENTR(IES) FOR 'CS LOOKUP STRUCT
                (VARIABLE # PER FILE)
                This will be each <a href tag which is of the 'ForCSH' class.

                <a href=stuff, name=somename, class='ForCSH'>stuff</a>

                --> <name>: <filepath relative to content>#<name>

            */

            // parse all <a href tags of the 'for csLookup' class
            contentLoc = fullHelpPath + "Content/";
            $('a.ForCSH').each(function() { // go through each script tag
                name = $( this ).attr('name');
                // if already an entry by this name (from this or some other file), fail out
                if (myStructs[csLookup].hasOwnProperty(name)) {

                    /**
                        do a grep for this name in the help file root, so they can see wehre all
                        the dupes are occuring, and print this to the user in the fail msg
                    */
                    var currCwd = process.cwd();
                    var grepCmd = 'grep -r "' + name + '" .';

                    grunt.file.setBase(contentLoc); // switches grunt to the bld output
                    var grepCmdOutput = runShellCmd(grepCmd).stdout;
                    grunt.file.setBase(currCwd); //  switch back before continuing
                    var failMsg = "\n\nWhile processing file: "
                        + htmFilepath
                        + "\nfound multiple <a href tags of class 'ForCSH' having 'name' attribute: '"
                        + name + "'"
                        + "\n\nIt could be that the first occurance was in a separate htm documentation file,"
                        + " but there should only be one such entry among ALL the documentation files."
                        + "\n\nOutput of '" + grepCmd + "' (executed from " + contentLoc + "):\n\n"
                        + grepCmdOutput;
                    //grunt.fail.fatal(failMsg); // leave this out for now while issue being addressed
                }

                // what is relative to content
                relevant = path.relative(contentLoc, htmFilepath);
                finalPath = relevant + "#" + name;
                myStructs[csLookup][name] = finalPath;
            });

        }

        return myStructs;

    }

                                                                    // ======== CONSTRUCTOR FILES ======= //

    /**
        Generate any of the auto-generated constructor files for the build.

        [[constructor file contains a series of constructors,
        which use direct inheritance infrastructure to represent XD metadata]]

        There are two directories used for the purpose of constructor files.
        1. assets/js/constructor/xcalar-idl/xd/
            This is the submodule of the xcalar-gui project
            used to check files in to git repo.
        2. assets/js/constructor
            This is the dir where the build will actually use the files from.
        So for any of the constructor files you'd want to check in to git
        repo, initially put them in 1, and for those which you only care about the bld using it,
        (ex., A_construcotr_version which just displays info on the GUI about
        the build version), put them in to 2.
        And once everything is done, copy all the constructor files in 1., in to 2.


    */
    grunt.task.registerTask(CONSTRUCTOR_FILES, "Generate additional js constructor file(s) for the build", function() {
        grunt.log.debug("Schedule tasks to Autogen constructor files,"
            + " then copy the auto-generated constructor files, from:\n"
            + grunt.config('copy.constructorFiles.cwd')
            + " to:\n"
            + grunt.config('copy.constructorFiles.dest'));

        grunt.task.run(GENERATE_CURR_PERS_CONSTRUCTOR_FILE);
        // next constructor file is only to show info about the bld to users.
        // devs don't need in their build, and if you auto-gen it, it will
        // cause it to show up in their 'git status', so skip for dev blds
        if (BLDTYPE != DEV && !isWatchEventProcessing()) {
            grunt.task.run(GENERATE_GIT_VAR_DEC_FILE);
        }
        // copy all constructor files from the xcalar-idl/xd submodule, in to constructor dir used by bld
        grunt.task.run('copy:constructorFiles');

        if (!KEEPSRC && SRCROOT != BLDROOT) {
            grunt.task.run(CLEAN_CONSTRUCTOR_SRC);
        }
    });

    /**
        auto-gen the constructor version file.
        context: The GUI displays useful info related to the project version.
            Does this by calling variables that (should) hold that data.
            This task creates a central file that decalares and instantiates these variables
            within project scope.
        This file is auto-generated, and is unique for each build you run;
        it is not a file you'd ever want to check in to git therefore it will NOT
        go in to the assets/js/constructor/xcalar-idl/xd/ directory (constructorMapping.dest)
        where the other constructor files are going, but rather should go directly in to
        the build constructor directory.
        Similarly, for dev builds we don't want to generate this file.  Because 1. developers
        won't use it and 2. if it's generated, it will show up as a new file in their
        workspace under 'git status' requiring them to delete it
    */
    grunt.task.registerTask(GENERATE_GIT_VAR_DEC_FILE, function() {

        // path to file to auto generate
        var filepath = BLDROOT + constructorMapping.dest + "A_constructorVersion.js";
        grunt.log.writeln("Expected filepath of constructor file... " + filepath);

        var varData = { // content to put in to file
            'gBuildNumber': getBuildNumber(),
            'gGitVersion': getGitSha(),
        }
        var content = "";
        var key;
        for ( key of Object.keys(varData) ) { // add the content in
            content = content + "\nvar " + key + " = '" + varData[key] + "';";
        }

        writeAutoGeneratedFile(filepath, content); // tacks a standard autogen comment and logs before writing file

    });

    /**
         auto-gens: E_persConstructor.js
         context:
    */
    grunt.task.registerTask(GENERATE_CURR_PERS_CONSTRUCTOR_FILE, function() {

        // path of file to auto generate
        var filepath = SRCROOT + constructorMapping.src + "E_persConstructor.js";

        var templateSrc = "site/render/template/constructor.template.js"; // templating file to use to generate
        var templateFilepathAbs = SRCROOT + templateSrc;

        var str = fs.readFileSync(templateFilepathAbs).toString();
        var template = _.template(str);
        var parsedStr = template({
            "version": null,
            "isCurCtor": true,
        });
        parsedStr = parsedStr.trim() + "\n";

        writeAutoGeneratedFile(filepath, parsedStr);
    });

    /** remove files/dirs unneeded needed only for generating constructor files */
    grunt.registerTask(CLEAN_CONSTRUCTOR_SRC, "There are some files required to gerneate the constructor files.  You can remove them when done.", function() {

        grunt.log.writeln(("\nDelete files/dirs necessary for generating constructor files, now that they have been generated\n").bold);

        /**
           front-end developers develop the constructor files within their git repo, in constructorMapping.src
            In the final build, these files need to be in constructorMapping.dest.
            Doing this with cp instead of mv, so that in case src and dest dir are same, won't disrupt.
            So, once the constructor tasks are complete, now you want to delete the src
        */
        var constructorSrcFull = BLDROOT + constructorMapping.src;
        grunt.log.writeln("Delete src folder for constructor files: " + constructorSrcFull);
        grunt.file.delete(constructorSrcFull);

        // now dleete anything required but not needed in final bld
        for ( requiredItem of constructorMapping.required ) {
            fullPath = BLDROOT + requiredItem;
            grunt.log.write("Delete file/dir " + fullPath + " ... ");
            grunt.file.delete(fullPath);
            grunt.log.ok();
        }

    });

    /**
        Given a list of filepaths, set the 'src' attribute of the copy:custom target
        and run the target to copy in those filepaths.

        dependencies: (req) list of strings that are filepaths that are required.
            If they are REL., will assumte relative to src
        @src: optional (defaults to SRCDIR) where to get the dependencies from.  Will normalize to abs.
        @dest: optional (defaults to BLDROOT), where to copy the dependencies to
        @fromDepth: optional (Defaults to entire dependency path) - where to start retaining the dir structure from (will convert to abs. then split on that)
            @todo: ARG    @filter: list of files or dirs to exclude
    */
    function resolveDependencies(dependencies, src, dest, fromDepth) {

        src = typeof src  !== 'undefined' ? src  : SRCROOT;
        dest = typeof dest  !== 'undefined' ? dest  : BLDROOT;

        if (!grunt.file.isPathAbsolute(src) || !grunt.file.isPathAbsolute(dest)) {
            grunt.fail.fatal("Trying to resolve dependencies, "
                + " but either src or dest are not absolute paths..."
                + "\n src: " + src + "\n dest: " + dest
                + "  logic error contact jolsen@xcalar.com.");
        }
        if (fromDepth) {
            if (grunt.file.isPathAbsolute(fromDepth)) {
                if (grunt.file.doesPathContain(src, fromDepth)) {
                    grunt.fail.fatal("Trying to resolve dependencies... "
                        + " want to copy dependencies in from " + src
                        + " and only maintain dir structure begininng @ start"
                        + dirStructureFrom
                        + "\nThis start is an absolute path, but not descendent of the src."
                        + "\nLogic error in gruntfile; please contact jolsen@xcalar.com");
                }
            } else {
                // make it rel to src
                fromDepth = src + fromDepth;
            }
        } else {
            fromDepth = src;
        }

        grunt.log.writeln(("\bResolve any file/dir dependencies for building filetype"));

        // clear out current src, and reset dest to
        grunt.config('copy.resolveDependencies.src', []);
        grunt.config('copy.resolveDependencies.cwd', fromDepth);
        grunt.config('copy.resolveDependencies.dest', dest);
        var srclist = [],
            glob = false;
        var dependency, dependencyAbsPath;
        for ( dependency of dependencies ) {
            grunt.log.debug("Next dependency: " + dependency);
            if (dependency.match(/\*/g)) {
                grunt.log.writeln("this is a globbing pattern! can't do any checks");
                glob = true;
            }
            // if its not a glob can check if exists and make sure its desc from src if abs.
            if (!glob) {
                grunt.log.debug("dependency " +  dependency + " is not a glob");
                if (grunt.file.isPathAbsolute(dependency)) {
                    grunt.log.writeln("this is an absolute path");
                    // make sure rel. to src
                    if (grunt.file.doesPathContain(src, dependency)) {
                        dependencyAbsPath = dependency;
                    } else {
                        grunt.fail.fatal("Supplied dependency to resolveDependencies that is an abs. path, "
                            + " but not descendenct from src requested to get dependency from."
                            + "\nDependency: " + dependency
                            + "\nSrc to get dependency from: " + src);
                    }
                } else {
                    dependencyAbsPath = src + dependency;
                }

                grunt.log.debug("abs path have now: " + dependencyAbsPath);
                // if dir, glob for entire thing
                if (grunt.file.isDir(dependencyAbsPath)) {
            /**
                @TODO:
                If it's a dir,
                1. if that dir doesn't even exist ,add in dir to resolve
                2. if that dir does exist, comp cont of both dirs and
                    copy in only the missing files
            */
                    dependencyAbsPath = dependencyAbsPath + "**/*";
//                    srclist.push(dependencyRelSrc + "**/*");
//                    srclist.push(dependencyRelPath + "**/*");
                } else if (!grunt.file.isFile(dependencyAbsPath)) {
                    grunt.fail.fatal("A dependency pass to resolveDependencies is not a file or dir!\n"
                        + dependency
                        + "\n (Looking for existence @ abs path determined as:)\n"
                        + dependencyAbsPath);
                }

            } else {
                grunt.log.debug("Dependency " + dependency + " is a glob");
                // check if begins with '/' to determine if abs path...
                if (dependency.startsWith(path.sep)) {
                    dependencyAbsPath = dependency;
                } else {
                    dependencyAbsPath = src + dependency;
                }

            }
            // get only part rel they want
            grunt.log.debug("Get only relative part of dir structutre of " + dependencyAbsPath + " using a split on " + src);
            relkeep = path.relative(fromDepth, dependencyAbsPath);
            grunt.log.debug("keep: " + relkeep);
            srclist.push(relkeep);
        }
        // if any dependencies that need to be resolved, schedule this task
        if (srclist.length > 0) {
            grunt.log.warn("There are dependencies required to build files of this type. "
                + " Copy in if they don't exist " + srclist);
            grunt.config('copy.resolveDependencies.src', srclist);
            grunt.task.run('copy:resolveDependencies');
        }
    }

    /**
        Given a list of files, dirs, or globbing patterns,
        SCHEDULE CUSTOM CLEAN TASK to remove them.
        - If rel. paths supplied, will assume rel. to BLDROOT
        - For non-globs, check if file/dir exist and only then clean
        -- since this calls 'clean' plugin, the effect of this function is that a task will
        only get SCHEDULED in the task queue - not removed by time
        the function exists.

        Used mainly for removing dependeencies in cleanup for
        specific filetypes
        This is a function rather than a task because you need to pass the lit

    */
    function removeContent(content, relTo) {

        relTo = typeof relTo  !== 'undefined' ? relTo  : BLDROOT;

        grunt.log.debug("in remove content w " + content);
        // clear out current src
        grunt.config('clean.custom.src', []);
        var dependency;
        var removelist = [], // to set as src to clean task
            glob = false;
        var removePath;
        for ( removePath of content ) {
            grunt.log.writeln("Remove: " + removePath);
            if (removePath.match(/\*/g)) {
                grunt.log.debug("this is a globbing pattern! can't do any checks");
                glob = true;
            }
            // if its not a glob can check if exists and make sure its desc from src if abs.
            if (!glob) {
                if (!grunt.file.isPathAbsolute(removePath)) {
                    removePath = relTo + removePath;
                }
                // now if it exists only get rid of it, otherwise don't worry about it
                if (!grunt.file.exists(removePath)) {
                    grunt.log.writeln("\n" + removePath
                        + " required, but does not exist in bld "
                        + "(probably a watch scenario of HTML, where required dirs were copied directly in to staging area)");
                    continue;
                }
            }

            removelist.push(removePath);
        }
        // if found any paths to remove, schedule clean task
        if (removelist.length > 0) {
            grunt.log.debug("Found paths to remove: " + removelist);
            grunt.config('clean.custom.src', removelist);
            grunt.task.run('clean:custom');
        }


    }

                                                                // ======== CSS SECTION ======= //
    /**
        Generate CSS files from less files in the src code, remove uneeded less files
    */
    grunt.task.registerTask(BUILD_CSS, 'Generate the CSS for the build from dev src code', function() {

        grunt.task.run('less:dist');

        if (!KEEPSRC && SRCROOT != BLDROOT) {
            grunt.task.run(CLEAN_CSS_SRC);
        }
    });

    /**
        Deletes uneeded lss src code from bld
    */
    grunt.task.registerTask(CLEAN_CSS_SRC, function() {

        /**
            delete all less files in the less src.
            (Note: delete files individually, rather than deleting entire src dir!
            in case one day, that dir has other files, or is same as bld root, or other dir!)
        */
        grunt.log.writeln(("\nRemove less files from build\n").bold);
        lessFiles = grunt.file.expand(BLDROOT + cssMapping.src + "**/*.less");
        for ( var lessFile of lessFiles ) {
            grunt.log.write("less file: " + lessFile + " DELETE ... ");
            grunt.file.delete(lessFile);
            grunt.log.ok();
        }
        /**
            delete any files/dirs specifically required for the purpose of generating the css
            (note - right now would be less in partials/, and those less files would get removed
            in above part, and then final clean would remove the empty dirs,
            but for watch functionality, you'd copy in the essentials but no clean at end so doing this
        */
        grunt.log.writeln(("\nRemove files/dirs from bld required only for generating css\n").bold);
        removeContent(cssMapping.required);

    });

                                                                // ======== HTML SECTION ======= //

    /**
        Generate full bld HTML from project src HTML via templating, internationalization,
        prettifying, minifying, etc.

        The flow of generating the bld HTML is as follows:

        ((Initial Src)) --> ((Staging Area I)) --> ((Staging Area II)) --> Final Dest

                            Templating                 Prettifying/Minifying
                            (tasks which req.       (tasks which do NOT
                            outside files)             req. outside files)

        Staging Area I:
            In case dest same as src
            The reason why:
            1. In case src html is same as final dest dir,
                 to preserve src files if you want to, while still keeping same filenames
            2. Also, this let's yuou go through every html file in bld src,
                and only what gets templated gets directed outside the staging area,
                so you end up with only the build HTML - and can just delete the HTML staging area I

        Staging Area II:
            In case dest has HTML files that are not related to bld.
            (was example in bld - HTML dest was to be root,
            but there were autogenerated HTML files that were being picked up
            in minify/prettify.
            So putting here, allows an area to just work on build files themselves.
            and you still don't need to know what they are apriori


    */
    grunt.task.registerTask(BUILD_HTML, 'Generate HTML from dev src by resolving includes, templating, etc.', function() {

        // copy ENTIRE html src dir - even files which will be uneeded in bld - to initial staging dir
        grunt.task.run('copy:stageHTML');

        // perofrm all processing tasks (templating, internationaliation, etc.) within the staging dirs
        grunt.task.run(PROCESS_HTML);

        // copy everything in final Staging area to final destination
        grunt.task.run('copy:destHTML');

        // Done with staging areas.  get rid!
        grunt.task.run('clean:htmlStagingI');
        grunt.task.run('clean:htmlStagingII');

        /**
            html clean:
            Will clean html only at very end in finalize,
            because js minification uses one
            of the files (site.html)
        */
    });

    grunt.task.registerTask(BUILD_EXTRA_TS, 'Build extra TS from dev src for ' +
        'expServer', function () {
        var allFiles = ["shared/setup/enums.ts",
            "shared/util/xcHelper.ts",
            "shared/setup/xcGlobal.ts",
            "shared/helperClasses/transaction.ts",
            "shared/api/xiApi.ts",
            "components/sql/sqlApi.js",
            "components/sql/sqlCompiler.js",
            "components/sql/sqlQueryHistory.ts",
            "shared/helperClasses/kvStore.ts"];
        var expServerJSDestDir = "services/expServer/sqlHelpers";
        var EXTRA_TS_WATCH_STAGING = BLDROOT + EXTRA_TS_FOLDER_NAME;
        if (grunt.file.exists(EXTRA_TS_WATCH_STAGING)) {
            runShellCmd('rm -r ' + EXTRA_TS_WATCH_STAGING);
        }
        runShellCmd('mkdir -p ' + EXTRA_TS_WATCH_STAGING);
        for (var i = 0; i < allFiles.length; i++) {
            var filepathRelTsSrc = path.relative(typescriptMapping.src,
                allFiles[i]);
            var fileName = allFiles[i].split("/");
            fileName = fileName[fileName.length-1];
            grunt.file.copy(typescriptMapping.src + allFiles[i],
                EXTRA_TS_WATCH_STAGING + "/" + fileName);
            grunt.file.copy(SRCROOT + typescriptMapping.src + 'tsconfig.json',
                EXTRA_TS_WATCH_STAGING + "/tsconfig.json");
        }
        grunt.task.run(TYPESCRIPT + ':' + EXTRA_TS_WATCH_STAGING +
            ":" + expServerJSDestDir);
        // Clean up!
        grunt.task.run('clean:' + EXTRA_TS_FOLDER_NAME);
        // Concat the export code to thrift.js
        grunt.task.run('concat:thrift');
    });

    grunt.task.registerTask(CLEAN_BUILD_SECTIONS, function() {

        // clean HTML src of uneeded files/dirs
        if (!KEEPSRC && SRCROOT != BLDROOT) {
            grunt.log.debug("don't want to keep stale html!");
            grunt.task.run(CLEAN_HTML_SRC);
        }

    });

    /**
         clean build of uneeded files used for generating bld HTML
    */
    grunt.task.registerTask(CLEAN_HTML_SRC, function() {

        /** remove HTML files that when templated, got written to new filepaths
            (else you'd be deleting a processed file you want to keep!)
        */
        grunt.log.writeln(("\nDelete un-processed, "
            + " templated HTML files used to genrate the bld files, "
            + " if any remain "
            + " (they might have been written over during bld process, "
            + " or, if watch task, might have been copied in directly to the staging area\n").bold);
        for (var filepath of htmlWaste) {
            // these filepaths get collected when generating html, making best guess at what would be their real location in the bld..
            // but if you are watching,
            // then the files needed were copied in directly to the staging area. so they woin't exist here. so check if file exists to avoid confusing warnings
            // now that this has evolved should relook at this there is a better way
            if (grunt.file.exists(filepath)) {
                grunt.log.write("\tDelete untemplated bld file : " + filepath + "... ");
                grunt.file.delete(filepath);
                grunt.log.ok();
            }
        }

        /**
            delete unecessary dirs and files you don't waant anymore from the src folder
            i need render for making the constructors!! (required args are rel. to BLDROOT);
        */
        grunt.log.writeln(("\nDelete dirs and files designated only for build purpose that were within src, if any\n").bold);
        removeContent(htmlMapping.required);
    });

    // return list of extra tags to add in to index.html
    // filepaths rel to 'cwd' attr of scriptlinker targets
    function getExtraIndexTags() {
        var extraTags = [];
        if (IS_WATCH_TASK || BLDTYPE == DEV) {
            extraTags = extraTags.concat(
                ['assets/dev/shortcuts.js', 'assets/js/mixpanel/mixpanel.js']);
        } else {
            extraTags.push('assets/js/mixpanel/mixpanelAzure.js');
        }
        // script tags just used by Xcalar Design EE app for nwjs set ups
        if (PRODUCT === XDEE) {
            // httpStatus a dep. for XDEE; it's included in login.html
            // in all blds but not index.html
            extraTags.push('assets/js/httpStatus.js');
            extraTags = extraTags.concat(XDEE_REQ_JS_FILES);
        }
        return extraTags;
    }

    function getExtraLoginTags() {
        var extraTags = [];
        if (IS_WATCH_TASK || BLDTYPE == DEV) {
            extraTags.push('assets/dev/shortcuts.js');
        }
        if (PRODUCT === XDEE) {
            extraTags = extraTags.concat(XDEE_REQ_JS_FILES);
        }
        return extraTags;
    }

    /**
        tasks to be done to the HTML files, while they are in the temporary staging areas
        (prettifying, minifying, internationzliation, templating, etc.)

        Invariant start:
            All src HTML, and files needed to generate final dest HTML, should exist in Staging Area I
        Invariant end:
            a file in Staging Area II iff it is a final bld HTML file

        Task Order Dependencies:
            tags task must run before htmlmin task (the comment tags depends on gets removed during htmlmin)

    */
    grunt.task.registerTask(PROCESS_HTML, function() {
        /**
            phase I : tasks requiring outside files to complete.  To be performed within staigng area I
            all src html should exist in staging area I when this phase begins.
        */
        grunt.task.run('includes:staging');
        grunt.task.run(TEMPLATE_HTML); // templated files written to staging area II during this task

        /**
            phase II : tasks which do not rely on any outside files.
            files were put here during templating.
        */

        /**
            add additional script tags needed
              do BEFORE htmlmin - 'scriptlinker' knows where to insert tags by
            scanning html and looking for <!-- start/end auto template tags -->
            these comments will get removed during htmlmin

            Also, each time scriptlinker run, the code between these tags is
            replaced by the generated tags (does not append them)
            so should only run one target per file, if relying only on this comment.
            Therefore, have one target in scriptlinker for each file to add to;
            determine which additional files to add and set as target src
            (determination can't be done at setup), and then
            run the target for each file
        */
        var addTagsIndex = getExtraIndexTags();
        var addTagsLogin = getExtraLoginTags();
        grunt.config('scriptlinker.index.src', addTagsIndex);
        grunt.config('scriptlinker.login.src', addTagsLogin);
        grunt.task.run('scriptlinker:index');
        grunt.task.run('scriptlinker:login');

        // if bld flag given for rc option, remove debug comments first
        if (grunt.option(BLD_FLAG_RC_SHORT) || grunt.option(BLD_FLAG_RC_LONG)) {
            grunt.task.run(REMOVE_DEBUG_COMMENTS + ':html'); // passes positional arg 'html' to the task's function
        }
        grunt.task.run('htmlmin:stagingII'); // staging area II now has all, and only, completed bld files
        grunt.task.run('prettify:stagingII'); // prettify AFTER htmlmin! prettiy indents the HTML readably, htmlmin will remove a lot of that indentation

        /**
            Extra step:
            (context): when you update script tags in the bld html after
            js minification, using cheerio.  Cheerio leaves a bunch of
            blank lines, and so have to do a final prettification on those
            files, once minification is done.
            The final prettification will get all the html files in the dest dir
            for html files, within the bld.
            However, our dest dir for html files in the bld, is actually the root
            of the build.
            So this final prettiifcation, will gather all html files in the
            entire bld.
            This ends up getting 3rd party, etc.,  Lots of html files you wouldn';t
            want to touch.
            So, to keep this consistent, get a list of the final set of bld files,
            rel to the html dest dir.
            Could gather the list dynamically as you're writing them during templating,
            but then if you ever change the loc of the staging dir, you need that
            context... just put it here so it's clearer... at this point you have
            all the bld html... just make a list of what's there...
            Needs to be a task rather than a function since you're only scheduling tasks above..
        */
        grunt.task.run("getBldHTMLListing");

    });

    grunt.task.registerTask("getBldHTMLListing", function() {

        grunt.log.writeln("Before removing final HTML staging directory,"
            + " get final list of HTML files in the bld,"
            + "for follow-up tasks that might need to be done ONLY on bld html"
            + " once HTML portion of BLD has been completed"
            + "\n(prettification post-js min in installer blds an example)");

        // get list of all the files in the staging dir II, rel to it
        HTML_BUILD_FILES = grunt.file.expand({'cwd':HTML_STAGING_II_ABS}, "**/*.html");
        var bldFile;
        grunt.log.writeln("Build files found:");
        for ( bldFile of HTML_BUILD_FILES ) {
            grunt.log.debug("\t" + bldFile);
        }
    });

    /**
        Generate valid bld HTML from un-processed, templated files
        (excluding dirs/files specified)

        Does so by calling 'genHTML' on each file in the bld.
        genHTML takes a filepath to an HTML file and does the following:

            1. render if/else logic within the src HTML
            2. internationalization
            3. Product name strings normalized (they all say 'xcalar design';
                for XI, change it to 'xcalar insight')

        Once file has been templated, delete the original file so you don't end up
        with stale HTML.

    */
    grunt.task.registerTask(TEMPLATE_HTML, function() {

        /**
            get filespaths, rel STAGING I, of all the html files to template
            [if main bld task, want to template all html src files (sans exclusions)
            but if watch task might only want to template a single file,
            so look to template string to determine what's desired]
        */

        var htmlFilepaths = []; // list of filespaths to template, rel STAGING I
        var matchPatterns = [];
        var templatingSrc = grunt.config(STAGE_HTML_TEMPLATE_KEY); // vals are rel proj src

        if (grunt.file.isFile(templatingSrc)) {
            // only want to template a single file
            htmlFilepaths = [HTML_STAGING_I_ABS + templatingSrc];
        } else {
            // template string is either glob or dir; need to get all filepaths
            // that apply (match glob or nested in the dir); can create a glob
            // and grunt.file.expand it to get the filepaths
            var mainGlob = HTML_STAGING_I_ABS + templatingSrc;
            if (grunt.file.isDir(templatingSrc)) {
                // create a glob to get filepaths of all html files nested in the dir
                mainGlob = mainGlob + "**/*.html";
            }
            matchPatterns.push(mainGlob);
            // if this a main bld task... additional globs to handle build exclusions
            // (files to completely ignore from source)
            if (!IS_WATCH_TASK) {
                for (exclude of htmlMapping.exclude) {
                    if (grunt.file.isDir(exclude)) {
                        grunt.log.debug("Add match pattern for Exclusiun dir: " + exclude);
                        matchPatterns.push("!" + HTML_STAGING_I_ABS + exclude + "**");    // excludes this dir and everything within it
                    } else {
                        grunt.log.debug("Add match pattern for excludeion file: " + exclude);
                        matchPatterns.push("!" + HTML_STAGING_I_ABS + exclude); // excludes this particular file
                    }
                }
            }
            htmlFilepaths = grunt.file.expand(matchPatterns);
        }
        grunt.log.debug("# HTML files eligible to template: " + htmlFilepaths.length
                + "staging dir @: " + HTML_STAGING_I_ABS
                + "match patterns: " + matchPatterns);

        var filepath;
        var skipfile = false;
        grunt.log.debug("Go through each eligible HTML file and template " +
            " unless its blacklisted");
        for (filepath of htmlFilepaths) {
            if (grunt.file.doesPathContain(HTML_STAGING_I_ABS, filepath)) {
                skipfile = false;
                /**
                    dont want to template some html files, like included files
                    in /partials and /utils.
                    These are specified in global DONT_TEMPLATE_HTML
                    (this is different than build exclusions handled above)
                    Filter them out now, else they'll get templated in to
                    STAGING II and transferred in to final build.
                    (If src and bld output are same, will end up mapping the uneeded
                    dirs/files in user's src which will then show up in their git status
                */
                for (var dontTemplate of DONT_TEMPLATE_HTML) {
                    var exclusionPathRelHtmlSrc = path.relative(htmlMapping.src, dontTemplate);
                    // everything in STAGING I is rel. html src
                    if ((grunt.file.isDir(dontTemplate) && grunt.file.doesPathContain(HTML_STAGING_I_ABS + exclusionPathRelHtmlSrc, filepath)) ||
                         (grunt.file.isFile(dontTemplate) && filepath === HTML_STAGING_I_ABS + exclusionPathRelHtmlSrc)) {
                            // the requireds are rel. to the type src
                            grunt.log.debug(("== HTML file @ " + filepath +
                                " is blacklisted from HTML templating; skip").bold);
                            skipfile = true;
                            break;
                    }
                }
                if (!skipfile) {
                    grunt.log.debug((("== template HTML file @ ").yellow +
                        filepath + (" ==").yellow).bold);
                    pathRelToHtmlSrcWithinBld = path.relative(HTML_STAGING_I_ABS, filepath);
                    // genHTML will generate and write a new HTML file, from the templated file at filepath.
                    genHTML(filepath, getTemplatingOutputFilepaths(pathRelToHtmlSrcWithinBld));
                }
            } else {
                grunt.fail.fatal("One of the filepaths to template: "
                    + filepath
                    + " is not desc. from the staging area:\n"
                    + HTML_STAGING_I_ABS
                    + "\n.Workflow might have changed for templating");
            }
        }

    });

    /**
        Template an HTML file with templating code

        htmlFilepath: (required, string)
            filepath of HTML file with template code you want to resolve.
            If ABS path - gets file at that path.
            If REL path - looks for file rel to 'srcRoot' arg

        output: (optional, List)
            A list of all the filepaths the templated file should be written to.
            For each filepath in the list -
                If ABS path - writes to that path
                If REL path - writes to that path rel 'destRoot' arg
            If not supplied, takes 'htmlFilepath' (rel srcRoot), and writes to that
            location in destRoot

        srcRoot: (optional, string)
            Dir to get filepath relative to, if it is a rel. filepath

        destRoot: (optional, string)
            Dir to write templated output file(s) relative to, if they rel filepaths

        EX 1:
            filepath = "A/test.html"
            output = ["testQ.html"]
            srcRoot = "/home/jolsen/xcalar-gui/site/"
            destRoot = "/home/jolsen/xcalar-gui/"

            --> (1) will look for HTML file at:
                    /home/jolsen/xcalar-gui/site/A/test.html
            --> (2) Will resolve templating logic, internationalization, etc., and write file to:
                    /home/jolsen/xcalar-gui/testQ.html""

        EX2:
            filepath = "A/test.html"
            srcRoot = destRoot = "/A/B/"

            --> (1) will look for HTML file at:
                    /A/B/A/test.html
            --> (2) will resolve templ,ating logic, internationalazation, etc., and write to:
                    /A/B/A/test.html
                    overwriting the untemplated file

    */
    function genHTML(htmlFilepath, outputFiles, srcRoot=HTML_STAGING_I_ABS, destRoot=HTML_STAGING_II_ABS) {
        lang = "en";
        landCode = (lang === "en") ? "en-US" : "zh-CN";
        dicts = require(SRCROOT + 'assets/lang/' + lang + '/htmlTStr.js');
        var tutorMap = {
            "datastoreTut1.html": "datastoreTut1",
            "datastoreTut2.html": "datastoreTut2",
            "workbookTut.html": "workbookTut",
            "datasetPanelTutA1.html": "datasetPanelTutA1",
            "importDatasourceTutA2.html": "importDatasourceTutA2",
            "browseDatasourceTutA3.html": "browseDatasourceTutA3",
            "browseDatasource2TutA4.html": "browseDatasource2TutA4"
        };

        /**
            htmlFilepath, if abs., should be within staging dir.
            But want to know (1) dest it will go in final bld
            (2) originating location within bld
            because want to determine
            if original file being overwritten during templating process
            protects in the case that src and dest dirs are same.
        */
        var relPart,
            unprocessedFileBldPath;
        if (!grunt.file.isPathAbsolute(htmlFilepath)) {
            htmlFilepath = srcRoot + htmlFilepath;
        }
        if (grunt.file.doesPathContain(HTML_STAGING_I_ABS, htmlFilepath)) {
            relPart = path.relative(HTML_STAGING_I_ABS, htmlFilepath);
        } else {
            grunt.fail.fatal("The filepath specified is not relative to the staging dir"
                + htmlFilepath
                + "\nLogic error, please contact jolsen@xcalar.com");
        }
        unprocessedFileBldPath = BLDROOT + htmlMapping.src + relPart;
        // make sure it exists.. to be on the safe side... since assuming where it is based on current workflow...
        //  h owever, during watch task - it is likely this won't exist, since the watched file might have been
        // copied directly in to the staging area
        if (!grunt.file.exists(unprocessedFileBldPath) && !IS_WATCH_TASK) {
            grunt.fail.fatal("During HTML templating, got a file: "
                + htmlFilepath
                + "\nIt should be within the HTML staging directory at this point."
                + " Trying to determine it's original path within the bld,"
                + " so can determine if it gets overwritten during templating process.\n"
                + "Location determines as: "
                + unprocessedFileBldPath
                + ", However, this path does not exist."
                + "\nThere has likely been a logic change in workflow of HTML processing"
                + " which needs to be accounted for.");
        }

        /** output files: should be a path where templated file should be written,
            or list of files it should be written to.
            Put all in a list, and converted each to an abs path
        */
        if (outputFiles) {
            if (typeof(outputFiles) == 'String') {
                outputFiles = [outputFiles];
            } else if (!Array.isArray(outputFiles)) {
                grunt.fail.fatal("'output' arg to genHTML not a Stirng or an Array.");
            }
        } else {
            // wasn't defined
            grunt.log.debug("\toutput not specified for file to template; use same filename");
            outputFiles = [relPart];
        }
        for (var i = 0; i < outputFiles.length; i++) {
            if (!grunt.file.isPathAbsolute(outputFiles[i])) {
                outputFiles[i] = destRoot + outputFiles[i];
            }
        }

        /**
            get html contents as a string, from the src HTML file.
            load this in to templater
        */
        var html = fs.readFileSync(htmlFilepath).toString();
        var template = _.template(html);

        /**
            configure dictionary of templating options for each of the output files
        */
        dicts.product = PRODUCT;

        // dicts options when generating one HTML file
        var overwritten = false;
        var filename, destFilepath;
        if (outputFiles.length == 1) {
            destFilepath = outputFiles[0];
            filename = path.basename(destFilepath);
            if (filename == 'userManagement.html') {
                grunt.log.writeln("found usermanagement...");
            }

            if (tutorMap.hasOwnProperty(filename)) {
                grunt.log.debug("\ttutor map");
                dicts.isTutor = true;
                // it should be found in html_en's tutor obj
                var tutorName = tutorMap[filename];
                // overwrite the dicts.tutor[tutorName] to dicts.tutor.meta,
                // so all walkthough.html can just use dicts.tutor.meta
                // to find the string that needed
                dicts.tutor.meta = dicts.tutor[tutorName];
                dicts.tutor.name = tutorName;
            } else {
                dicts.isTutor = false;
                dicts.tutor.name = "";

                if (filename === "unitTest.html" || filename === "unitTestInstaller.html") {
                    dicts.isUnitTest = true;
                } else {
                    dicts.isUnitTest = null;
                }

                dicts.isTarballInstaller = true;
            }

            // dicts configured; template
            templateWrite(destFilepath);

            // finally, check if it mapped to the same place as the src.
            if (unprocessedFileBldPath == destFilepath) {
                overwritten = true;
            }

        } else {
            /**
                filepath mapes to multiple HTML files.
                dicts will get configured differently
                (only used for installer build)
            */
            for (var i = 0; i < outputFiles.length; i++) {
                destFilename = path.basename(outputFiles[i]);
                destFilepath = outputFiles[i];
                if (destFilename === "install-tarball.html") {
                    dicts.isTarballInstaller = true;
                } else {
                    dicts.isTarballInstaller = null;
                }

                // dicts configured for this file; template
                templateWrite(destFilepath);

                // finally, check if it mapped to the same place as the src.
                if (unprocessedFileBldPath == destFilepath) {
                    overwritten = true;
                }
            }

        }

        if (!overwritten && grunt.file.exists(unprocessedFileBldPath)) {
            grunt.log.debug("\tOriginal file does not appear to be overwritten... "
                + " Location of original file (now stale) determined as: "
                + unprocessedFileBldPath);
            // this will be the full path within the staging dir.  need to get it rel. to that,
            // because the stale file will be in the src.
            htmlWaste.push(unprocessedFileBldPath);
        }

        // now that dicts is configured for a particular file use case, generate
        // HTML contents from the templated file, and write contents as a file at given filepath
        // @destpath: path to write result to (if rel. will be rel. to destdir, as configured at top of maion function)
        function templateWrite(destpath) {

            // generate HTML string from templating
            var parsedHTML = template(dicts);

            // if this is an XI build, replace product 'xcalar diesng' names
            if (PRODUCT === XI) {
                parsedHTML = updateStringProductName(parsedHTML);
            }

            // add in header comment (comment starts with ! will not be removed by grunt htmlmin)
            parsedHTML = AUTOGENWARNINGHTML + parsedHTML;

            // write the file to the proper destination
            // add to growing list of bld html
            if (!grunt.file.isPathAbsolute(destpath)) {
                destpath = destRoot + path.sep + destpath;
            }
            grunt.log.debug("\tWrite templated file @ " + (destpath).green + " ... ");
            grunt.file.write(destpath, parsedHTML);
        }
    }

    /**
        Given filepath to a file (rel src), return a list of all filepaths (rel bld),
        of all the files it should template to.
        (For now to make this work until genHTML optimized - return String or list)
    */
    function getTemplatingOutputFilepaths(filepath) {

        var templatedFilepathList = [];
        if (grunt.file.isPathAbsolute(filepath)) {
            grunt.fail.fatal("Gave abs path for trying to determine templating output filepaths"
                + filepath
                + "\nShould supply a rel path to the file, beginning at the src root of HTML within the bld");
        }

        if (htmlTemplateMapping.hasOwnProperty(filepath)) {
            templatedFilepathList = htmlTemplateMapping[filepath];
        } else {
            templatedFilepathList = [filepath];
        }
        return templatedFilepathList;
    }

    grunt.task.registerTask(BUILD_PARSER, 'Build Parser from dev src',
        function() {
        var G4_FILES = BLDROOT + "3rd/antlr/*.g4";
        var parserJSDestDir = BLDROOT + "assets/js/parser/base";
        runShellCmd('mkdir -p ' + parserJSDestDir);
        runShellCmd('antlr4 -Dlanguage=JavaScript ' + G4_FILES +
                    ' -o ' + parserJSDestDir + ' -visitor -no-listener');
    });

                                                                // ======== JS SECTION ======= //

    grunt.task.registerTask(BUILD_JS, 'Build JS portion of build', function(buildFrom) {

        // autocompile js from typescript ts files
        // do before remove debug because the files might not exist until we run this
        grunt.task.run(TYPESCRIPT + ":" + buildFrom);

        // if bld flag given for rc option, remove debug comments first, before js minification
        if (grunt.option(BLD_FLAG_RC_SHORT) || grunt.option(BLD_FLAG_RC_LONG)) {
            grunt.task.run(REMOVE_DEBUG_COMMENTS + ':js');
        }
        if (!buildFrom) {
            grunt.task.run(CLEAN_JS);
        }

    });

    // Generate TS definition file for jsTStr.js
    grunt.task.registerTask(GENERATE_TSDEF, 'Generate TS definitions', function() {
        var sourceFile = SRCROOT + 'assets/lang/en/jsTStr.js';
        var targetFile = SRCROOT + 'ts/jsTStr.d.ts';
        runShellCmd('node ' + SRCROOT + 'assets/dev/genJSTStrDef.js'
            + ' ' + sourceFile
            + ' ' + targetFile);
    });

    /**
        runs shell command syncronously using shellJs, returns res object
        w/ res.code, res.stderr, res.stdout
        fatal failure on non-0 non-valid error code or errorr caught
        @cmd : String the command to run
        @validErrorCodes (optional): list of ints of valid error codes for this
            cmd (in case non-0 are expected and not to be treated as fatal)
    */
    function runShellCmd(cmd, validErrorCodes) {
        if (typeof validErrorCodes === typeof undefined) {
            validErrorCodes = [0];
        }
        try {
            var res = shelljs.exec(cmd, {silent:true}); // runs the cmd; shellJs runs cmds syncronously by default
            if (res.code && validErrorCodes.indexOf(res.code) === -1) {
                grunt.fail.fatal("Non-0 exit status when running " +
                    " shell cmd: " + cmd +
                    "\nStatus Code: " + res.code +
                    "\nStderr: " + res.stderr);
            } else {
                return res;
            }
        } catch (e) {
            grunt.fail.fatal("error thrown running sh cmd: " + cmd + ", " + e);
        }
    }

    grunt.task.registerTask(WEBPACK, function() {
        run_webpack_binary();
        clean_webpack(); // keep clean sep from running webpack in case
            // all clean functionality shifted to end of build
    });

    function run_webpack_binary() {
        var oldFatal = shelljs.config.fatal;
        shelljs.config.fatal = true;
        var webpackBin = SRCROOT + "node_modules/.bin/webpack";
        var webpackCmd = webpackBin + " --env.production" + " --env.buildroot=" + BLDROOT;
        shelljs.exec(webpackCmd, {cwd:SRCROOT});
        shelljs.config.fatal = oldFatal;
    }

    function clean_webpack() {
        var webpack_paths_to_clean = ["assets/js/parser/"];
        for (var webpack_req of webpack_paths_to_clean) {
            var fullPath = BLDROOT + webpack_req;
            grunt.log.writeln("Delete webpack file/dir " + fullPath + " ... ");
            grunt.file.delete(fullPath);
            grunt.log.ok();
        }
    }

    // @filepathRelBld - bld only single ts file (should be rel bldroot)
    grunt.task.registerTask(TYPESCRIPT, 'Build TS portion of build', function(executeFrom, buildTo) {
        // check for existence of ts dir until https://gerrit.int.xcalar.com/#/c/8894/ checked in
        if (!grunt.file.exists(typescriptMapping.src)) {
            grunt.log.writeln("Typescript src " + typescriptMapping.src + " does not exit");
            return;
        }

        if (!executeFrom || executeFrom == 'undefined') {
            executeFrom = BLDROOT + typescriptMapping.src;
        }

        var currCwd = process.cwd();
        var tscpath = SRCROOT + "node_modules/typescript/bin/tsc";
        var tscmd = tscpath + ' --outDir ' + BLDROOT;

        if (buildTo) {
            runShellCmd('mkdir -p ' + BLDROOT + buildTo);
            tscmd += buildTo;
        } else {
            tscmd += typescriptMapping.dest;
        }

        // go in to the typescript dir
        grunt.file.setBase(executeFrom);

        grunt.log.writeln(("[" + executeFrom + "] $ ").red + (tscmd).green.bold);
        var cmdOutput = runShellCmd(tscmd, [0,2]).stdout; // ts warnings emits 2 exit code
        if (cmdOutput && BLDTYPE == DEV) {
            END_OF_BUILD_WARNINGS.push("Found warnings when running tsc command: " + tscmd + "\n\n" + cmdOutput);
        }

        grunt.file.setBase(currCwd); //  switch back before continuing

        // If this is a non-dev build, remove sourcemap if generated
        if (BLDTYPE != DEV && !IS_WATCH_TASK) {

            grunt.log.writeln("This is a non-dev build; delete any generated map files");
            var mapfiles, mapfile;

            mapfiles = grunt.file.expand(BLDROOT + typescriptMapping.dest + "**/*.map");
            for ( mapfile of mapfiles ) {
                grunt.log.write((("Delete: ").green + mapfile + " ... ").bold);
                grunt.file.delete(mapfile);
                grunt.log.ok();
            }
        }

    });

    /**
        1. Setup and run 'uglify' plugin (main minification plugin)
        2. update <script> tags in bld HTML to reflect new minified filepaths
        3. prettify HTML to remove blank lines left from 2.
        4. delete unminified js files, and files used only for minification process.
    */
    grunt.task.registerTask(MINIFY_JS, 'Minify the Javascript', function() {

        // in case static uglify targets get added, add their mappings
        // to the unminified --> minified filepaths so script tags can be updated
        addStaticUglifyTargetsToFilepathMapping();
        // create uglify targets dynamically, else would need to hardcode
        // targets in initConfig for every minified file wanted
        configureDynamicUglifyTargets();
        grunt.task.run('uglify'); // run all uglify targets
        grunt.task.run(UPDATE_SCRIPT_TAGS); // update the build HTML to reflect minified filepaths
        grunt.task.run('prettify:cheerio'); // using cheerio to remove script tags causes empty whitespaces; prettify again

        // rid bld of the original js files no longer needed, unless running with option to keep full src
        if (!KEEPSRC && SRCROOT != BLDROOT) {
            grunt.task.run(CLEAN_JS_SRC_POST_MINIFICATION);
        }
    });

    /**
        Remove debug comments from certain files of type depending on arg.
        For JS, this happens PRIOR to minification, so make sure the file paths
        are the original paths, not the post minification paths
    */
    grunt.registerTask(REMOVE_DEBUG_COMMENTS, function(fileType) {
        grunt.log.writeln("Remove debug comments from specified files of type " + fileType);

        filePaths = [];
        if (REMOVE_DEBUG_COMMENTS_FROM_THESE_FILES.hasOwnProperty(fileType)) {
            filePaths = REMOVE_DEBUG_COMMENTS_FROM_THESE_FILES[fileType];
        } else {
            grunt.fail.fatal("Invalid filetype to remove debug comments from: " + fileType);
        }

        var filePath, absFilePath, fileName, fileExt, i;
        for (var i = 0; i<filePaths.length; i++) {
            filePath = filePaths[i];
            fileExt = path.extname(filePath);
            // remove debug for html files done when html files in staging; dirs will be flattened
            if (fileExt === '.html') {
                fileName = path.basename(filePath);
                absFilePath = HTML_STAGING_II_ABS + fileName;
            } else {
                absFilePath = BLDROOT + filePath;
            }
            grunt.log.write("Remove debug comments from : " + absFilePath + " ... ");
            removeDebug(absFilePath);
            grunt.log.ok();
        }
    });

    /**
        Scan through file and remove any code block that begins with

        /** START DEBUG ONLY **/
        //and ends with
        /** END DEBUG ONLY **/
    /**
            or:
        <!--!START DEBUG ONLY -->
        and ends with
        <!--!END DEBUG ONLY -->

        @filepath : path to file to remove debug comments from
            If rel., will be rel. to current operating directory of Grunt
    */
    function removeDebug(filepath) {
        if (!grunt.file.isPathAbsolute(filepath)) {
            grunt.log.warn("Filepath "
                + filepath
                + " for file to remove debug comments from not abs;"
                + " will get rel. to current operating dir");
        }
        contents = fs.readFileSync(filepath, "utf8");
        contents = contents.replace(/\/\*\* START DEBUG ONLY \*\*\/(.|\n)*?\/\*\* END DEBUG ONLY \*\*\//g, "");
        contents = contents.replace(/<!--!START DEBUG ONLY -->(.|\n)*?<!--!END DEBUG ONLY -->/g, "");
        fs.writeFileSync(filepath, contents);
    }

    /** remove files/dirs unneeded needed only for generating constructor files */
    grunt.registerTask(CLEAN_JS, "There are some files required to gerneate .js files.  You can remove them when done.", function() {

        grunt.log.writeln(("\nDelete .ts files/dirs necessary for generating .js files, now that they have been generated\n").bold);

        if (BLDTYPE != DEV) {
            for ( requiredItem of typescriptMapping.required ) {
                fullPath = BLDROOT + requiredItem;
                grunt.log.write("Delete file/dir " + fullPath + " ... ");
                grunt.file.delete(fullPath);
                grunt.log.ok();
            }
        }
    });

    /**
        Cleans bld of uneeded js files post minification
    */
    grunt.task.registerTask(CLEAN_JS_SRC_POST_MINIFICATION, 'clean the bld of uneeded js files post-minification', function() {

        // the uglify configuration has all the files we minified in it.
        // go through that, and for each file in there, delete it
        var uglifyConfig = grunt.config('uglify');
        if (!uglifyConfig) {
            grunt.fail.fatal("There is no config data for the 'uglify' plugin!");
        }
        for (var uglifyTargetName of Object.keys(uglifyConfig)) {
            // will only work if didn't use globs/dirs in the src attrs...
            if (EXCLUDE_UGLIFY_TARGETS_FROM_POST_MINIFICATION_TASKS.indexOf(uglifyTargetName) !== -1) {
                grunt.log.writeln(("Don't clean up from target " + uglifyTargetName).bold);
                continue;
            //if (!uglifyTarget.hasOwnProperty('dynamicallyGenerated')) {
            //    continue;
            } else {
                var uglifyTarget = uglifyConfig[uglifyTargetName];
                // delete all src files that got minified in to this target,
                // unless it got overwritten by a minified file
                for (var srcFile of uglifyTarget.src) {
                    if (grunt.file.isPathAbsolute(srcFile)) {
                        var relPart = path.relative(BLDROOT, srcFile);
                        // don't delete if path got assigned to a minified file
                        if (uglifyConfig.hasOwnProperty(relPart)) {
                            grunt.log.writeln(("\t>>").red + " Unminified file " +
                                srcFile + " should have been overwritten by " +
                                " a minified file..." +
                                (" Don't delete this file").red);
                        } else {
                            grunt.log.write(("\t>>").green +
                                " Delete unminified file : " + srcFile);
                            grunt.file.delete(srcFile);
                            grunt.log.ok();
                        }
                    } else {
                        grunt.fail.fatal("warning - some 'src' values in uglify " +
                            " target are not abs paths; CLEAN_JS_SRC_POST_MINIFICATION" +
                            " will need to be updated to handle this!");
                    }
                }
            }
        }
    });

    /**
        There are some central files where text data to display to the user is displayed.
        Update those files so that occurances of 'xcalar design' say 'xcalar insight' instead.
        This should be called for XI builds.

        (My understanding is there are many files you wouldn't want to do the update on,
        which is why we'd rather just specify which to do rather than doing all w exclusions)
    */
    grunt.task.registerTask(UPDATE_ESSENTIAL_JS_FILES_WITH_CORRECT_PRODUCT_NAME, function() {

        // file you want to replace in : file to map it to (if same will just update curr file w new version)
        var jsFilesToUpdate = {
            "assets/lang/en/jsTStr.js": "assets/lang/en/jsTStrXI.js",
            // "assets/lang/zh/jsTStr.js": "assets/lang/zh/jsTStrXI.js",
            "assets/jupyter/ipython/nbextensions/xcalar.js": "assets/jupyter/ipython/nbextensions/xcalar.js",
        }
        var jsFile, jsFileFullSrc, jsFileFullDest;

        // go through each essential file; create new file w/ the updated text and save that
        for ( jsFile of Object.keys(jsFilesToUpdate) ) {
            jsFileFullSrc = BLDROOT + jsFile;
            jsFileFullDest = BLDROOT + jsFilesToUpdate[jsFile];
            updateFileProductName(jsFileFullSrc, jsFileFullDest, !KEEPSRC); // 3rd option allows you to delete original file, if dest =/= src
        }

    });

    /**
        For all HTML files in the build, scan <script> tags,
        and any which reference js that has been minified, update to the
        minified filepath
    */
    grunt.task.registerTask(UPDATE_SCRIPT_TAGS, function() {
        // get all the html files in the bld dir
        var htmlBldAbsPath = BLDROOT + htmlMapping.dest;
        //var htmlFilepaths = grunt.file.expand(htmlBldAbsPath + "**/*.html");
        var htmlFilepaths = HTML_BUILD_FILES;

        // update each html file using the js filepath mapping set during configureDynamicUglifyTargets
        grunt.log.writeln(("\nJS Minification Clean-up section: ").yellow.bold
                + (" For each html file in "
                + htmlBldAbsPath
                + ", update any <script> tags to use new minified filenames").yellow);

        for (var filepath of htmlFilepaths) {
            updateJsScriptTags(filepath);
        }
    });

    // adds unminified --> minified paths from static 'uglify' targets in to
    // MINIFICATION_FILEPATH_MAPPING so those script tags will also get updated
    // post minification
    function addStaticUglifyTargetsToFilepathMapping() {
        var filepathMappings = grunt.config(MINIFICATION_FILEPATH_MAPPING);
        var uglifyConfig = grunt.config('uglify');
        var commonMsg = "\nTo skip this check, add this uglify target to the " +
            "EXCLUDE_UGLIFY_TARGETS_FROM_POST_MINIFICATION_TASKS var." +
            "\n(But js files minified from this target will be excluded from " +
            " the post-minification tasks: updating <script> tags in " +
            "HTML and deleting the unminified files from the build.)";

        if (uglifyConfig) {
            for (var uglifyTargetName of Object.keys(uglifyConfig)) {
                if (EXCLUDE_UGLIFY_TARGETS_FROM_POST_MINIFICATION_TASKS.indexOf(uglifyTargetName) !== -1) {
                    continue;
                }

                var uglifyTarget = uglifyConfig[uglifyTargetName];
                var destFile = uglifyTarget.dest;
                if (grunt.file.isPathAbsolute(destFile)) {
                    var destFileRelBld = path.relative(BLDROOT, destFile);
                    var srcAttr = uglifyTarget.src;
                    var srcFiles = [];
                    if (typeof srcAttr === 'string') {
                        srcFiles.push(srcAttr);
                    } else if (Array.isArray(srcAttr)) {
                        srcFiles = srcAttr;
                    } else {
                        grunt.fail.fatal("'src' attr of uglify target " +
                            uglifyTargetName +
                            " is not a string or an array" +
                            commonMsg);
                    }

                    for (var srcFile of srcFiles) {
                        if (grunt.file.isFile(srcFile)) {
                            if (grunt.file.isPathAbsolute(srcFile)) {
                                var srcFileRelBld = path.relative(BLDROOT, srcFile);
                                // add in to the mapping
                                filepathMappings[srcFileRelBld] = destFileRelBld;
                            } else {
                                grunt.fail.fatal("One of the 'src' values in " +
                                    "uglify target " +
                                    uglifyTargetName +
                                    " is not an abs path: (" + srcFile + ")" +
                                    "\nPrepend this path with BLDROOT " +
                                    commonMsg);
                            }
                        } else {
                            grunt.fail.fatal("One of the 'src' values in " +
                                "uglify target " +
                                uglifyTargetName +
                                " is not a file (" + srcFile + ")" +
                                " (dirs and globbing patterns are NOT yet" +
                                " supported for updating script tags) " +
                                commonMsg);
                        }
                    }
                } else {
                    grunt.fail.fatal("Dest file in uglify target " +
                        uglifyTarget + " is NOT an aboslute path; " +
                        " prepend this path with BLDROOT" +
                        commonMsg);
                }
            }
            grunt.config(MINIFICATION_FILEPATH_MAPPING, filepathMappings);
        } else {
            grunt.log.writeln(("No static uglify tasks to get filepath mappings for").green);
        }
    }

    /**
     * Dynamically configure targets for 'uglify' plugin (js minification task).
     * - determine which files should be minified, and to what filepaths,
     *   and create an uglify target for each such desired minified file.
     * At the same time, keep track of mapping between unminified --> minified
     * filepaths, for updating script tags in html and cleaning js bld post-minification
     */
    function configureDynamicUglifyTargets() {

        grunt.log.writeln(("\nJS Minification Set-up section: ").bold +
            (" Generate targets for javascript minification " +
            " by parsing script tags").grey.bold);

        // configure uglify to minify javascript being imported by script tags
        // of certain source files.
        // setTargetsByParsingScriptTags directly modifies uglify config and the filepath mapping
        for (var minificationObj of PARSE_FILES_FOR_MINIFICATION) {
            var parseFile = minificationObj.path;
            var dirWithinBld = "";
            if (minificationObj.hasOwnProperty("rel")) {
                dirWithinBld = minificationObj.rel;
            }
            setTargetsByParsingScriptTags(BLDROOT + parseFile, BLDROOT + dirWithinBld);
        }

        // now that all targets generated, check for any name collisions
        // (generated minified filepaths which are existing src filepaths
        // for files which aren't being minified - they would get overwritten)
        var uglifyConfig = grunt.config('uglify');
        var filepathMappings = grunt.config(MINIFICATION_FILEPATH_MAPPING);
        grunt.log.write(("\nStep: ").bold + (" Check for naming collisions...")[STEPCOLOR]);
        var collisions = checkForNameCollisions(uglifyConfig, filepathMappings);
        if (collisions.length > 0) {
            grunt.fail.fatal("Grunt trying to create minified files:" +
                collisions +
                "\nbut these files exist, and are not set to be minified," +
                " so they would get overwritten." +
                "\nMost likely, you have a file and dir by the same name, " +
                " are trying to minify all the files in that dir." +
                "\n\nSolutions: " +
                "\t1. Rename the file/dir to avoid this naming collision" +
                " (This resolves the problem without changing any Grunt code)." +
                "\n\t2. Include the source file in script.html or loginPart.html" +
                " (This will ensure it too gets minified.)" +
                "\n\t3. Another solution is to use a unique extension for minified "+
                " files (i.e. .min.js); this would require change to Grunt");
        }
        grunt.log.ok();
    }

    /**
     * check for conditions where a script tag should be ignored, and that js
     * file not minified
     * @srcPathFull: full filepath to the js the 'src' attr refers to
     * @srcPathRelBld: filepath rel bld to the js the 'src' attr refers to
     * @startMinificationAt: dir (rel bld) where minification should start at
     * @displayAs: string to display in logs
     */
    function ignoreScriptTag(srcPathFull, srcPathRelBld, startMinificationAt, displayAs) {

        // skip this tag if its for a file nested lower than dir to start
        // minification at (probably 3rd party)
        if (!srcPathRelBld.startsWith(startMinificationAt)) {
            grunt.log.writeln(("\t" + displayAs +
                (" not in path we want to minify files in... " +
                "(probably 3rd party)... skip").bold).blue);
                return true;
        }

        // file doesn't exist
        /** important:
            suppose file is for a file not generated until later in the bld
            process (Ex: config.js).  if you don't skip, will create an uglify
            target for it, this target will fail when uglify run, but grunt will
            continue with no way to remove the entry.
            Later, when cleaning JS, 'src' files for uglify targets (unminified
            files) will be removed; if the file was generated by this time,
            it will end up getting deleted!
        */
        if (!grunt.file.exists(srcPathFull)) {
            grunt.log.writeln(("\t" + displayAs +
                (" Can NOT resolve src path- do NOT put in uglify " +
                "config!").bold).blue);
                return true;
        }

        // blacklisted dirs/files
        var ignore = false;
        for (var exclude of DONT_MINIFY) {
            if (
                srcPathRelBld.startsWith(exclude) ||
                path.basename(srcPathRelBld) == exclude
            ) {
                grunt.log.writeln(("\t" + displayAs +
                    (" blacklisted from minification... skip...").bold).blue);
                    ignore = true;
                       break;
            }
            if (ignore) {return true;}
        }

        return false;
    }

    /**
     * parse javascript <script> tags in a file, and determine what
     * files to minify them to.  For each such minified file, create an uglify
     * target.  (If the target already exists, just add to its src)
     * @filepathForScriptTagParsing: abs path to file to parse script tags in
     * @tagsFinalLocation: abs path to dir the script tags are rel to.
     *    if not supplied, assumes they are rel parent dir of filepathForScriptTagParsing.
     *     (some partial files intended to be included at diff depth, and script
     *     tags are written for that intended depth, not file's depth)
     */
    function setTargetsByParsingScriptTags(filepathForScriptTagParsing, dirTagsAreRelTo) {

        grunt.log.writeln(("\nStep: ").bold + (" Parse <script> tags in " +
            filepathForScriptTagParsing + " and add those files in to 'uglify'" +
            " to be minified")[STEPCOLOR]);

        // script tag src will be rel the final file the file being parsed is included in
        //  will need to construct the abs filepaths
        if (typeof dirTagsAreRelTo === 'undefined') {
            dirTagsAreRelTo = path.dirname(filepathForScriptTagParsing);
        }

        var $ = cheerio.load(fs.readFileSync(filepathForScriptTagParsing, "utf8")); // get a DOM for this file using cheerio

        // GO through each script tag, determine minified file it should map to
        var startMinificationAt = JS_MINIFICATION_START_DIR;
        var scriptTags = {}; // to check for duplicate script tags
        $('script').each(function(i, elem) {

            var scriptTagSrcAttr = $(this).attr('src');
            // Will be empty string if its defining a real function
            if (scriptTagSrcAttr) {

                // skip and create build warning if its a duplicate script tag
                if (scriptTags.hasOwnProperty(scriptTagSrcAttr)) {
                    END_OF_BUILD_WARNINGS.push(filepathForScriptTagParsing +
                        " : Duplicate <script> tag w src attr '"
                        + scriptTagSrcAttr + "'");
                    return;
                }
                scriptTags[scriptTagSrcAttr] = true;

                // src tags are rel to final bld file they're included in; need full path
                var srcFileAbsPath = path.resolve(dirTagsAreRelTo, scriptTagSrcAttr);
                var srcFileRelBld = path.relative(BLDROOT, srcFileAbsPath);

                // check for conditions that would want to ignore tag
                if (ignoreScriptTag(srcFileAbsPath, srcFileRelBld, startMinificationAt, scriptTagSrcAttr)) {
                    return;
                }

                // file should be minified.  Get path of file it should be minified in to
                var minifileRelMinificationStart = getMinifiedFilepath(
                    srcFileRelBld, startMinificationAt);
                if (typeof minifileRelMinificationStart === 'undefined') {
                    grunt.log.warn("Could NOT determine file to minify to " +
                        " for " + scriptTagSrcAttr);
                    return;
                }
                var minifileRelBld = startMinificationAt + minifileRelMinificationStart;
                var minifileAbsPath = BLDROOT + minifileRelBld;

                grunt.log.writeln(("\t" + scriptTagSrcAttr + (" --> will minify INTO ")['red'] + minifileRelBld));

                // update 'uglify' plugin and js filepath mapping for this file
                addFileToBeMinified(srcFileAbsPath, srcFileRelBld, minifileAbsPath, minifileRelBld);
            }
        });
    }

    /**
     * adds a file to be minified by uglify, and updates global
     * filepath mapping used for updating script tags
     * creates the uglify target if it does not exist yet.
     */
    function addFileToBeMinified(fileToMinifyAbsPath, fileToMinifyRelBld, minifiedFileAbsPath, minifiedFileRelBld) {

        var uglifyTargetName = minifiedFileRelBld;

        var currUglifyConfig = grunt.config('uglify');
        var currJsMapping = grunt.config(MINIFICATION_FILEPATH_MAPPING);

        // check if there's already a target for this minified file
        // in the uglify config (multiple files can minify in to same file).
        // If not, create new target for it.
        // [store targets by the filepath, not filename, in case multiple
        // minified files w same name i.e., A/B/C.js and A/D/C.js]
        if (!currUglifyConfig.hasOwnProperty(uglifyTargetName)) {
            currUglifyConfig[uglifyTargetName] = generateUglifyTarget(minifiedFileAbsPath);
        }

        // check if src file already in target's src attr
        // (the target's src attr is a list of all the src files that will
        // get minified in to the .dest for the target.
        // (could happen if parsing script tags of multiple html files,
        // and they have a common script tag)
        var foundSrc = false;
        for (var srcFile of currUglifyConfig[uglifyTargetName].src) {
            if (srcFile === fileToMinifyAbsPath) {
                foundSrc = true;
                break;
            }
        }
        if (!foundSrc) {
            currUglifyConfig[uglifyTargetName].src.push(fileToMinifyAbsPath);
            grunt.config('uglify', currUglifyConfig);
            // add to inverted hash for post-minification tasks
            // VALUES NEED TO BE REL BLD!
            currJsMapping[fileToMinifyRelBld] = minifiedFileRelBld; // for checking name collisions
            grunt.config(MINIFICATION_FILEPATH_MAPPING, currJsMapping);
        }
    }

    /**
     * Updates <script> tags in an html file to point to minified js.
      * js files minifying in to the same file are collapsed to a single tag.
     *
     * (Mapping done by relying on global var jsFilepathMapping, which is
     * populated during 'configureDynamicUglifyTargets'.
     * Each js file that's minified has an entry in this object,
     * where key is path to the unminified file (rel bld), and value is
     * path to the file its minified in to (rel bld))
     *
     * @htmlFilepath: path (abs or rel bld) of html file to update
     *
     * @Example:
     *     Suppose html file has following script tags:
     *    <script src='/A.js'>
     *    <script src='/B.js'>
     *    <script src='/C/C1.js'>
     *    <script src='/C/C2.js'>
     *  And jsFilepathMapping has followin entries:
     *    {
     *       '/A.js':'/A.min.js'
     *       '/C/C1.js':'/C.min.js',
     *       '/C/C2.js':'/C.min.js'
     *     }
     *  Script tags after would be:
     *    <script src='/A.min.js'>
     *    <script src='/B.js'>
     *    <script src='/C.min.js'>
     */
    function updateJsScriptTags(htmlFilepath) {

        grunt.log.debug("Scan " + htmlFilepath +
            " to find any <script> tags for js files that have been minified");

        // get mapping of src files --> minified files, for updating script tags
        var jsFilepathMapping = grunt.config.get(MINIFICATION_FILEPATH_MAPPING);
        if (!jsFilepathMapping) {
            grunt.fail.fatal("The grunt config key "
                + MINIFICATION_FILEPATH_MAPPING
                + " has not been set in grunt config.\n"
                + "This key should hold a mapping of src attrs of js <script> tags in html files,"
                + " and src attr the tags should be converted to after js minification\n"
                + "js minification process has changed!");
        }

        // get abs path to html file for resolving the rel filepaths in tags
        var htmlFilepathAbs;
        var htmlFilepathRelBld;
        if (grunt.file.isPathAbsolute(htmlFilepath)) {
            htmlFilepathAbs = htmlFilepath;
        } else {
            htmlFilepathAbs = BLDROOT + htmlFilepath;
        }
        htmlFilepathRelBld = path.relative(BLDROOT, htmlFilepathAbs);
        var htmlFileParentDir = path.dirname(htmlFilepathAbs);
        grunt.log.write(("\t" + htmlFilepathRelBld + "... ").blue);

        var mappingFilepaths = {}; // keep track of what src attrs update to so no dupes in final
        var modified = false;
        var $ = cheerio.load(fs.readFileSync(htmlFilepathAbs, "utf8")); // DOM obj for the file
        $('script').each(function(i, elem) { // go through each script tag

            var src = $(this).attr('src'); // get ' src' attr of current script tag
            if (src) { // make sure there was an 'src' attrihbute

                // will search for this src attr in jsFilepathMapping
                // entries in jsFilepathMapping are rel bld,
                // src attr will be rel. location of htmlFilepath
                // so first resolve to abs path, then get rel portion within bld
                var srcResolved = path.resolve(htmlFileParentDir, src); // htmlFileParentDir is abs path
                var srcRelBld = path.relative(BLDROOT, srcResolved);

                if (jsFilepathMapping.hasOwnProperty(srcRelBld)) {

                    // path (rel bld) of minified file it maps in to
                    var minifiedFileVersionRelBld = jsFilepathMapping[srcRelBld];

                    // check if another script tag updates to the minified file
                    // (mult. files can minify into same file); if so, can remove this tag
                    if (mappingFilepaths.hasOwnProperty(minifiedFileVersionRelBld)) {
                        // delete this <script> tag entirely
                        $(this).remove();
                        modified = true;
                    } else {
                        // minified filepath is rel bld root;
                        // need rel html file's location within bld
                        equivSrcResolved = path.relative(htmlFileParentDir, BLDROOT + minifiedFileVersionRelBld);

                        // some js files minified to file of the same name
                        if (equivSrcResolved !== src) {
                            $(this).attr('src', equivSrcResolved);
                            modified = true;
                        }
                        mappingFilepaths[minifiedFileVersionRelBld] = true;
                    }
                }
            }
        });

        if (modified) {
            grunt.log.debug("DOM was modified... (a script tag was updated in this file)");
            fs.writeFileSync(htmlFilepathAbs, $.html(), {'encoding': 'utf-8'}); // renders the modified dom as html and overwrites file at filepath
            grunt.log.ok();

        } else {
            grunt.log.writeln(("(No script tags found to update)").bold);
            grunt.log.debug("DOM was never modified by cheerio ... "
                + " (if any script tags, none of them had a src attr for a js file that was minified)");
        }
    }

    /**
     * Checks for bug-inducing naming collisions
     * Example...
     * Suppose js dir like this
     *   assets/js/stuff.js  (this file does not appear in script.html!)
     *   assets/js/stuff/A.js --> minified in to stuff.js
     *   assets/js/stuff/B.js --> minified in to stuff.js
     *   assets/js/C.js --> minified in to C.js
     *    Here A.js and B.js would get concatenated and minified into assets/js/stuff.js,
     *  overwriting that current, unminified file.
     *  And since assets/js/stuff.js (unminified) not in script.html,
     *    its not getting minified itself and gets lost.
     * -- Since we are using the same extensions, can't just check for file
     *   existence before writing a new minified file, because it's expected and
     *   desired to overwrite current files (Ex, assets/js/C.js unminified, should
     *   be minified and overwrite)
     *    So instead --> for each new minified filepath
     *  ('dest' attr of key/target in uglifyConfig)
     *  Check if that path exists already
     *  If it does,
     *  Check to make sure that unminified file is ALSO getting minified
     * (its path rel bld would be a key in jsFilepathMapping then)
     *  If its NOT, that means it is going to be being overwritten and not minified itself
     * (Need to do this after you've built up both hashes, not during, because one
     * could came after the other)
     */
    function checkForNameCollisions(uglifyTargets, jsFilepathMappings) {

        var collisions = [];
        // uglifyTarget is the 'uglify' plugin config; keys are target names,
        // values are targets
        for (var minificationTarget of Object.keys(uglifyTargets)) {
            // value is obj; has 'dest' attr that holds abs path for the minified file
            var minificationFilepath = uglifyTargets[minificationTarget].dest;
            // check if files exists
            if (grunt.file.exists(minificationFilepath)) {
                // ensure file that exists is getting minified too
                // jsFilepathMappings: each js file being minified has a key/value pair
                // key is path to the js files (rel bld) that will be minified
                // and value is the path to file itll be minified in to (Rel bld)
                var matchingFileRelBld = path.relative(BLDROOT, minificationFilepath);
                if (jsFilepathMappings.hasOwnProperty(matchingFileRelBld)) {
                    // Requested by Jerene: if minified filepath exists, but its
                    // not the minified file's source, even if that file is getting
                    // minified (and so won't get overwritten), alert devs as this
                    // probably indicates file and dir have same name in the bld
                    // i.e., assets/js/stuff.js minifies to itself (this OK)
                    // but assets/js/stuff/A.js minifies to assets/js/stuff.js
                    // and there's already a src file assets/js/stuff.js (a dir and filename are same)
                    var matchingFilesMinifyTarget = jsFilepathMappings[matchingFileRelBld];
                    if (matchingFilesMinifyTarget !== minificationTarget) {
                        END_OF_BUILD_WARNINGS.push("A minified file will get " +
                            " generated in bld called " + minificationTarget +
                            " but a file by this same name exists, " +
                            " and the existing file is not the source of " +
                            "the minified file.  Most likely, you have a js " +
                            "file and dir with the same name." +
                            "\nSince " + matchingFileRelBld + " is also " +
                            "being minified (in to " +
                            matchingFilesMinifyTarget + "), the build won't " +
                            "fail, however, this naming convention lead to other " +
                            " issues; please address it)");
                    }
                } else {
                    collisions.push(matchingFileRelBld);
               }
            }
        }
        return collisions;
    }

    /**
     * creates a base target for 'ugliy' w/ empty src
     */
    function generateUglifyTarget(targetDest, targetSrc=[]) {
        var baseTarget = {
            'src': targetSrc,
            'dest': targetDest,
            'options':{
                'compress': {
                    'inline': false
                },
               },
            'dynamicallyGenerated': true // custom attr; will be used during js cleanup
        };
        return baseTarget;
    }
                                                               // -------------- MISC. BUILD TASKS -----------------//

    /**
        Searches build directory for files containing 'xcalar design' Strings (minus exclusions)
        and warns user of such files.

        Context: In XI producat builds, GUI should display 'xcalar insight' rather than 'xcalar design'.
        Such Strings should be limited to some central js files, rather than hardcoded throughout
        rest of code, so they are not being manually changed during build time.
        This task is provided then as a check to be used for XI builds, once build is complete,
        to help detect if this style has been violated and alert of potential bug.
    */
    grunt.task.registerTask(CHECK_FOR_XD_STRINGS, function() {

        // grep the entire dest dir for any occurances of 'xcalar design', excluding some dirs and files specified here

        var grepCmd = "grep -r -I -i -l 'xcalar design'"; // returns filepaths w/ occurances of xcalar design (case insensitive); recursive, ignores binary files
        var excludeDirs = ['ext-unused', 'bin']; // exclude any files with paths that contain any of these dirs
        var excludeFiles = ["htmlTStr.js", "CopyrightAndTrademarks.htm", "README"]; // exclude any files with these names.  Sorry, isn't working with abs. filepaths yet
        var excludeDir, excludeFile;
        var shellStr;
        var grepCmdOutput;
        var matchingFile;
        var currCwd = process.cwd();

        // build up the full grep cmd, mindful of exclusions metniond
        for ( excludeDir of excludeDirs ) {
            grepCmd = grepCmd + " --exclude-dir " + excludeDir;
        }
        for ( excludeFile of excludeFiles ) {
            grepCmd = grepCmd + " --exclude " + excludeFile;
        }

        // Grep command for OSX has different syntax
        if (process.platform === "darwin") {
            grepCmd += " *";
        }
        grunt.log.write("Checking for relevant files with XD strings using grep cmd:\n\t" + grepCmd + "\n... ");

        grunt.file.setBase(BLDROOT); // switches grunt to the bld output
        grepCmdOutput = runShellCmd(grepCmd).stdout; // cmd output
        grunt.file.setBase(currCwd); //  switch back before continuing

        // if there were any results, warn the user
        if (grepCmdOutput) {
            grunt.log.warn(("WARNING: There are still files within your " +
                "build, which have some form of the string 'xcalar design', " +
                "though this is not an XD build. (it's type " +
                PRODUCT +
                ")\n Files: (rel " +
                BLDROOT +
                ")\n").red.bold +
                grepCmdOutput +
                "\n** (If these files are expected to have these strings, " +
                "and you want to suppress this warning on future builds: " +
                "\nedit Gruntfile, and add files and/or dirs to ignore in " +
                "function CHECK_FOR_XD_STRINGS)\n**");
        } else {
            grunt.log.ok();
            grunt.log.writeln("Did not detect any relevant files in the build with product strings that need to be updated!");
        }
    });

    /**
        This task performs final cleanup/summary tasks common to all build flavors,
        to be executed once build is complete.

        1. Change permissions to 777 for entire bld
        2. Clean out final bld of any empty dirs
        3. Print a bld summary
    */
    grunt.task.registerTask(FINALIZE, function() {

        /**
            danger:
            IF SRCROOT is same as BLDROOT
            (this  is default behavior for dev blds)
            Then changing permissions, doing the cleanempty on the final bld,
            you'll end up altering the project src itself.
            Skip all of these tasks, including the CHECK_FOR_XD_STRINGS.
            (Because there will be valid files with XD in them since its proj src)
            But do display summary...
        */

        if (SRCROOT == BLDROOT) {
            grunt.log.warn("Dir for build output is same"
                + " as project source."
                + "\nTherefore, will bypass final cleanup steps normally"
                + " done on entire build output,"
                + "\nsuch as cleaning empty dirs, changing file permissions, "
                + "\nand checking for XD strings then replacing them with "
                + " XI strings (in XI blds)");
        } else {

            // didn't want to clean html until very end,
            // in case you do js minification, because it needs
            // html src file.  so do that clean now.
            if (!KEEPSRC) {
                grunt.task.run(CLEAN_BUILD_SECTIONS);
            }

            // clean out any empty dirs in the bld, recursively.
            // this is time consuming - do not do it for individual watch tassks
            if (!IS_WATCH_TASK && !fastcopy) {
                grunt.task.run('cleanempty:finalBuild');
            }

            if (PRODUCT != XD) {
                grunt.task.run(CHECK_FOR_XD_STRINGS);
            }

            // sym link from bld to src unit test dir
            // (tests are run from the bld dest;
            // would need to re-build every time change make to a unit
            // test that you want reflected)
            if (BLDTYPE == DEV || BLDTYPE == DEBUG) {
                var symlinkTo = SRCROOT + UNIT_TEST_FOLDER;
                var symlinkPath = BLDROOT + UNIT_TEST_FOLDER;
                // need to check if the symlink already exists;
                // if you try to create the symlink when it already exists, a
                // warning is issued.  in watch event, the warning will prevent
                // watch from getting to completeWatch cleanup; this will effect
                // subsequent watch events as a result. its possible the symlink
                // exists if this is a watch event and there's alredy a bld)
                if (grunt.file.exists(symlinkTo) && !grunt.file.exists(symlinkPath)) {
                    grunt.log.debug("Put symlink in bld to src unit tests; " +
                        symlinkPath + " --> " + symlinkTo);
                    fs.symlinkSync(symlinkTo, symlinkPath);
                } else if (!IS_WATCH_TASK) {
                    // the symlink should only be present in watch case
                    grunt.log.writeln(("Warning: either " + symlinkTo +
                        " does not exist in your proj src, or bld already " +
                        " has symlink to it.  This should not occur in " +
                        " a normal build; your project source may be " +
                        " corrupted.").red);
                }
            }

            grunt.task.run('chmod:finalBuild');
        }

        /**
             display summary will dislay info about bld
            we don't want to do this if its a watch task
            because it will end up displaying a tthe end of
            every watch event.
            (dont rely on if its a bld task, rather make sure
            its NOT a watch task, because you
            can run watch and a build task simultaneously)
        */
        if (!IS_WATCH_TASK) {
            grunt.task.run(DISPLAY_SUMMARY);
        }

    });

    /**
        create an empty config file,
        overwriting existing one, if any
    */
    grunt.task.registerTask(NEW_CONFIG_FILE, "Reset the config file to be clear of any developer details", function() {

        // will create an empty config file, overwriting whatever might be there
        grunt.log.writeln("======= clear developer's config file ======");

        generateNewConfigFile(); // will create an empty config file
        grunt.log.ok();

    });

    /**
        displays a useful summary at the end of the build process.
    */
    grunt.task.registerTask(DISPLAY_SUMMARY, 'Display summar of the build process for the end user', function() {

        /**
            here are some valid colors you can use with grunt log API (at time of writing this):
            'white', 'black', 'grey', 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow', 'rainbow'

            syntax (since this is not in the grunt documentation...),
            [note quote marks]

            grunt.log.write(("your stuff").cyan); // will color entire line as cyan
            grunt.log.write(("your stuff " + VARA)["cyan"]["bold"] + " more stuff"["red"]); // formatting indiovidual pieces
            grunt.log.write(("stuff").cyan.bold); // bolds and colors entire line cyan
        */

        var dirColor = 'yellow',
            olColor  = 'rainbow',
            txColor = 'green',
            bottomKeyColor = "green";

        // main bld summary
        grunt.log.writeln(("\n=============================================="[olColor]).bold);
        grunt.log.writeln(("|"[olColor]).bold);
        grunt.log.writeln(("|"[olColor] + "  BUILD SUMMARY:"[txColor]).bold);
        grunt.log.writeln(("|"[olColor]).bold);
        grunt.log.writeln(("|"[olColor]['bold'] +  " Build   type: " + BLDTYPE[txColor]));
        grunt.log.writeln(("|"[olColor]['bold'] +  " Product type: " + PRODUCTNAME[txColor]));
        grunt.log.writeln(("|"[olColor].bold));
        grunt.log.writeln(("|"[olColor]['bold'] +  " Src root:"[txColor]));
        grunt.log.writeln(("|\t"[olColor] + SRCROOT[dirColor]).bold);
        grunt.log.writeln(("|"[olColor]['bold'] + " Bld root:"[txColor]));
        grunt.log.writeln(("|\t"[olColor] + BLDROOT[dirColor]).bold);
        grunt.log.writeln(("|"[olColor]).bold);
        grunt.log.writeln(("==============================================="[olColor]).bold);

        /** for purpose of debugging this grunt file */

        // print out filepaths of some of the files auto-generated duoring bld
        grunt.log.debug(fancyLine());
        grunt.log.debug(("\n Some files/dirs generated during this bld, and their locations:").bold);
        var generatedItem;
        for ( generatedItem of Object.keys(generatedDuringBuild) ) {
            grunt.log.debug("\n [" + (generatedItem)[bottomKeyColor] + "]");
            grunt.log.debug("\n\t" + generatedDuringBuild[generatedItem]);
        }
        grunt.log.debug(fancyLine());

        // display any of the potential bugs migyht have found
        if (END_OF_BUILD_WARNINGS.length > 0) {
            grunt.log.writeln((" ALERT: There were Issues detected during the build process!\n").bold.cyan);
            for (var i = 0; i < END_OF_BUILD_WARNINGS.length; i++) {
                grunt.log.writeln(("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++").green);
                grunt.log.write("Issue #" + (i + 1) + ": ");
                grunt.log.writeln((END_OF_BUILD_WARNINGS[i]).bold);
                grunt.log.writeln(("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++").green);
            }
        }

    });

    function fancyLine() {
        line = ""
        var plCl = "blue",
            minCl = "white",
            pattern = ("+"[plCl] + "-"[minCl]),
            numPatternsToPrint = 50,
            i = 0;

        grunt.log.writeln("");
        for ( i = 0; i < numPatternsToPrint; i++ ) {
            line = line + pattern;
        }
        return line;
    }

    /**
        FOR TRUNK BLDS ONLY:

        Takes a developer backend workspace, and transfers their local thrift files to the build,
        then configures build to allow communication between front and backend so those changes
        will be reflected.
        This will occur as a last task in the TRUNK build process.
    */
    grunt.task.registerTask(SYNC_WITH_THRIFT, "Sync trunk with thrift so backend and front end can communicate", function() {

        grunt.log.writeln("===== sync with trhfit ========");

        var backendSrcAbsPath = BACKENDBLDDIR + BACKEND_JS_SRC,
            thriftDestAbsPath = BLDROOT + GUIPROJ_THRIFT_DEST, // ok if doesn't exist yet; copy will create it
            tmpDirFullPath = BLDROOT + "tmpJsHolderThrift/";

        if (!grunt.file.exists(backendSrcAbsPath)) {
            grunt.fail.fatal("Trying to copy backend xcalar scripts in to GUI project as part of thrift bld"
                + ", but can not access backend source of those scripts:\n"
                + backendSrcAbsPath
                + "\n(If you want to use a different src dir for your thrift changes other than "
                + BACKENDBLDDIR
                + "\nthen re-run Grunt with option: "
                + " --" + BLD_OP_BACKEND_SRC_REPO + "=<your proj root> )");
        }
        if (!grunt.file.exists(thriftDestAbsPath)) {
            grunt.log.warn("Directory in bld to hold thrift files from backend: "
                + GUIPROJ_THRIFT_DEST
                + " does not exist within the build directory.");
        }

        /*
             js files from the backend will replace build files
            there are some build files you'd like to keep though.
            save the build files you want to keep in to a temp dir

            (the files to keep - rel the dir to copy the thrift scripts in to -
            are keys of a global hash.
            Each copy operation, store the tmp location of the file as the key's value,
            then in last step will collect them at these values and copy in to their
            final location)
        */
        grunt.log.writeln(("\n1. Set aside build files you want to retain").cyan);
        var saveScriptRelFilepath,
            saveScriptAbsFilepath,
            saveScriptTmpFilepath;
        for ( saveScriptRelFilepath of Object.keys(KEEP_FRONTEND_SCRIPTS) ) { // they are FILEPATHS relative to the bld dest dir
            saveScriptAbsFilepath = thriftDestAbsPath + saveScriptRelFilepath;
            saveScriptTmpFilepath = tmpDirFullPath + saveScriptRelFilepath;
            grunt.log.writeln("cp " + saveScriptAbsFilepath + " --> " + saveScriptTmpFilepath);
            grunt.file.copy(saveScriptAbsFilepath, saveScriptTmpFilepath); // grunt.file.copy will create intermediate dirs for you, so first copy will create the temp dir
            KEEP_FRONTEND_SCRIPTS[saveScriptRelFilepath] = saveScriptTmpFilepath;
        }
        grunt.log.ok();

        // clear build thrift folder, so dev backend thrift files can be copied in
        grunt.log.writeln(("\n2. Clear GUI build files from " + thriftDestAbsPath).cyan);
        if (grunt.file.exists(thriftDestAbsPath)) {
            grunt.log.writeln("Delete dir " + thriftDestAbsPath);
            grunt.file.delete(thriftDestAbsPath);
        }
        grunt.log.ok();

        /** copy in the thrft files from the developers workspace

            Will get the list of files to copy using grunt.file.expand, expanding on the backend dir,
            and copy each in using grunt.file.copy
            however, grunt.file.expand using globbing returns abs filepaths - not paths relative to the dir you're expanding.
            and grunt.file.copy will use abs. paths on src and target.
            Since want to retain dir structure of these backend files,
            then for each filepath in grunt.file.expand, want the portion of the path rel. to the backend dir expanded on
        */
        var backendFilepaths = grunt.file.expand(backendSrcAbsPath + "**/*.js"); // gets filepaths of all .js files in the dir arg and any subdirs of arg
        var absFilepath,
            filepathRelScriptSrc,
            target;
        grunt.log.writeln(("\n3. Copy backend thrift files in to build (all js files nested beginning @ " + backendSrcAbsPath + ")").cyan);
        for ( absFilepath of backendFilepaths ) {
            filepathRelScriptSrc = path.relative(backendSrcAbsPath, absFilepath);
            target = thriftDestAbsPath + filepathRelScriptSrc;
            grunt.log.writeln("cp " + absFilepath + " ---> " + target);
            grunt.file.copy(absFilepath, target);
        }
        grunt.log.ok();

        /**
            copy back in the build files you wanted to save
            (iterating through the array instead of expand on the tmp dir,
            in case one of the copies didn't work, or something has changed,
            then this will fail, which I want to happen);
        */
        grunt.log.writeln(("\n4. Port back in the bld files you saved").cyan);
        for ( saveScriptRelFilepath of Object.keys(KEEP_FRONTEND_SCRIPTS) ) {
            // tmp location it should be at, is val of this key
            saveScriptTmpFilepath = KEEP_FRONTEND_SCRIPTS[saveScriptRelFilepath];
            target = thriftDestAbsPath + saveScriptRelFilepath;
            grunt.log.writeln("cp " + saveScriptTmpFilepath + " ---> " + target);
            grunt.file.copy(saveScriptTmpFilepath, target);
        }
        grunt.log.ok();

        // delete the tmp folder used, from the bld
        grunt.log.writeln("Delete the tmp folder: " + tmpDirFullPath);
        grunt.file.delete(tmpDirFullPath);
        grunt.log.ok();

        /**
            create a 'prod' folder in GUI src root, symlinked to the build
            (backend uses apache; it's configured to look for the gui build in a 'prod' folder of the gui project root)

            Check first if BLDROOT already this name, because if so you don't need the symlink.
            If BLDROOT isn't named by this but there is a dir in the src root by this name, fail out (change later if needed)
            However, if you are generating trunk builds repeatedly with this gui src, then you will want to overwrite with a new symlink each time.
        */
        grunt.log.writeln(("\n5. Create sym link to the gui bld called " + THRIFT_APACHE_GUI_PATH + ", so backend Apache can access frontend GUI project").cyan);
        var thriftApacheFullPathToLookForGuiBld = SRCROOT + THRIFT_APACHE_GUI_PATH;
        // if destdir already is the path apache looking for, you do not need to do this
        if (BLDROOT == thriftApacheFullPathToLookForGuiBld) {
            grunt.log.writeln("The destination dir for the build is already named '"
                + THRIFT_APACHE_GUI_PATH
                + "\nThere is no need to create the symlink; apache can already find the GUI project");
        } else {
            /**
                 check if already a valid path.
                if symlink, assume from a previous bld; overwrite it,
                else fail out so we don't delete something
                !!GRUNT's file.exists (and fs.exists) return FALSE on dangling symlinks!!!
                (link to dir that no longer exists... )
                and grunt.file.delete will fail to delete dangling symlinks
                Therefore,i test for symlink using lstatSync, and delete using shell cmd if exists
                (will work on dangling symlinks)
            */
            try {
                var statObj = fs.lstatSync(thriftApacheFullPathToLookForGuiBld);
                // check if a symlink
                if (statObj.isSymbolicLink()) {
                    grunt.log.write("Delete existing symlink (probably from previous bld) @ "
                        + thriftApacheFullPathToLookForGuiBld + " ... ");
                    runShellCmd('rm ' + thriftApacheFullPathToLookForGuiBld); // runs the cmd; shellJs runs cmds syncronously by default
                    grunt.log.ok();
                } else {
                    grunt.fail.fatal("This is a TRUNK build, intended for backend development.\n"
                        + "Apache on the backend, is configured to look for gui build within GUI src root,"
                        + " @ folder called : '"
                        + THRIFT_APACHE_GUI_PATH
                        + "'\ntherefore, need to create a symlink to this build, within the GUI src root, "
                        + " set to that name."
                        + "\nHowever, that desired path, "
                        + thriftApacheFullPathToLookForGuiBld
                        + ", already exists,\nand it is not a symlink from a past build,\n"
                        + " nor is it that the build dest dir itself is called "
                        + THRIFT_APACHE_GUI_PATH
                        + "\n Will NOT override.");
                }
            }
            catch (err) {
                // its ok if ENOENT file not existing error
                if (err.code != 'ENOENT') {
                    throw err;
                }
            }

            grunt.log.write("Set new sym link " + thriftApacheFullPathToLookForGuiBld + " --> " + BLDROOT + " ... ");
            fs.symlinkSync(BLDROOT, thriftApacheFullPathToLookForGuiBld);
            grunt.log.ok();
        }

        /**
            generate a config file with local machine details.
            This will define these properties and allow for the communicatino between the front and backend.
        */
        generateNewConfigFile(); // will create an empty config file
        grunt.log.ok();

    });

    /**
        Create a new config file within the build.
        If a config file already exiists, will overwrite it.

        @contents: optional String - contents to write to file.  (For trunk blds you will want to give some initial data).
        If you don't specify anything a blank file will get created.
    */
    function generateNewConfigFile(contents) {

        configFileAbsFilepath = BLDROOT + CONFIG_FILE_PATH_REL_BLD;
        grunt.log.write("\nCreate new config file (overwrite if exists) @:\n\t" + configFileAbsFilepath + "\n.... ");
        grunt.file.write(configFileAbsFilepath, contents); // will create the file and any intermediary dirs needed
        grunt.log.ok();

        generatedDuringBuild["Bld Config File"] = configFileAbsFilepath;

        //grunt.fail.fatal("made config; exit!@");

    }

    /**
        given a String (should be a 'xcalar design' string)
        return appropriate 'xcalar insight' string
        3 cases, depending on how letters in arg String are cased

            'xcalar design' --> 'xcalar insight'
            'xcalar Design' --> 'xcalair Insight'
            'xcalar DESIGN' --> 'xcalar INSIGHT'

        (*case of letters in 'xcalar' does not matter)
    */
    function convertXDstrToXIstr(xdStr) {

        // make sure this is an xcalar design string
        xcalarDesignName = 'xcalar design';
        if (xdStr.toLowerCase() != xcalarDesignName) {
            grunt.fail.fatal("Trying to convert a Xcalar Design string to a Xcalar Insight string, "
                + " but String is not in expected format.\n"
                + "String: " + xdStr
                + "\nXcalar design name expected: " + xcalarDesignName
                + "\n(has xcalar design name changed? "
                + " Or, if you see padded ws that could be why and would be a bug in this script)");
        }

        var xcalarPart = xdStr.substring(0, "xcalar ".length);
        var designPart = xdStr.substring("xcalar ".length);

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

    /**
        Return String of project build number
    */
    function getBuildNumber() {
        /**
            Project build number comes from env variable $BUILD_NUMBER
            $BUILD_NUMBER is an env variable that gets set and exported when the backend is getting packaged,
            which will end up invoking the front end.  So if you are just building the front end standalone
            you will not have this env variable .  in that case just give some default value.
        */
        var buildNumber = "N/A (dev bld)"; // def value in case no env variable available
        var envValue = process.env.BUILD_NUMBER;
        if (envValue) {
            buildNumber = envValue;
        }
        return buildNumber;
    }

    /**
        Check if either the src root of the project is descendent of bld,
        or vice versa.
        If neither scenario, return false.
        Else, return the anscestor
    */
    function isSrcOrBldDescendentOfEachother() {
        if (grunt.file.doesPathContain(SRCROOT, filepath)) {
            return SRCROOT;
        }
        if (grunt.file.doesPathContain(BLDROOT, filepath)) {
            return BLDROOT;
        }
        return false;
    }

    /**
        given an abs. filepath, return portion of filepath rel to src or bld.
        To be used in situation where you know you have an abs. filepath,
        but don't know if it is abs. within the project src or the build,
        but it doesn't matter much; you only need the rel portion
        (this happens during watch tasks, you only get the abs. path to
        a file that was changed, but no way to know befeore hand if it's
        a src or bld file user changed, you don't care only need to know this part)
    */
    function getFilepathRelSrcOrBld(filepath) {

        if (grunt.file.isPathAbsolute(filepath)) {
            if (grunt.file.doesPathContain(SRCROOT, filepath)) {
                return path.relative(SRCROOT, filepath);
            } else if (grunt.file.doesPathContain(BLDROOT, filepath)) {
                return path.relative(BLDROOT, filepath);
            } else {
                grunt.fail.fatal("I can not determine if file at : "
                    + filepath
                    + " is one of the main html files,"
                    + " because it is not a descendent of the src or the bld directory");
            }
        } else {
            grunt.fail.fatal("Not an absolute filepath!  Can not determine poration of "
                + filepath
                + " is rel. to src or bld");
        }
    }

    /**
        Return a String of truncated git sha of most recent project commit of the SRC ROOT.
    */
    function getGitSha() {

        // run the git cmd from the src root; switch back to current cwd before returning

        var gitShaCmd = "git log --pretty=oneline --abbrev-commit -1 | cut -d' ' -f1"; // gets truncated git sha of most rec. commit
        var currCwd = process.cwd();

        //grunt.file.setBase(BLDROOT);
        grunt.file.setBase(SRCROOT); // switches grunt working dir to SRCROOT
        var gitShaOutput = runShellCmd(gitShaCmd).stdout;
        gitShaOutput = gitShaOutput.trim(); // cmd output (trim off newline at end - else will mess up in file its getting included in to)
        grunt.file.setBase(currCwd); //  switch back before returning
        return gitShaOutput;
    }

    /**
        takes a path to a javascript src file, and returns filepath for the file
        it should be minified in to.
        returns undefined if can't determine

        @scriptPath: Path to script to find minification filepath of; can be
            rel or abs but should have 'dirStart' in its path
        @dirStart: dir to start minifying from
            -- does not need to match beginning of path, but some occurance.
            (ex.:, if filepath is /A/B/C/D/, and dirStart is B/C/, that is fine.
            -- If appears more than once in the path,
            will consider first occurance.
            Ex: /E/R/A/B/C/D/A/B/E, if dirStart supplied as /A/B,
            will start depth count beginning at dir /A/B.
            If you instead wanted to start at that second occurance,
            then you'd want to supply A/B/C/D/A/B (or /R/A/B/C/D/A/B/, etc.)
        @concatenateStartDepth: the depth from @dirStart, at which file concatenation in to
            a single minified js file would begin.

        @examples:
            getMinifiedFilepath('/home/jolsen/xcalar-gui/assets/js/A/B/C/e.js', '/assets/js', 2)
                RETURNS: 'A/B.min.js'
            getMinifiedFilepath('/home/jolsen/assets/js/h.js', '/assets/js/', 2);
                RETURNS: 'h.min.js'
            getMinifiedFilepath('/home/jolsen/assets/js/A/B/r.js', '/assets/js/', 2);
                RETURNS: 'A/B.min.js'
            getMinifiedFilepath('/home/jolsen/assets/js/A/B/C/e.js', '/assets/js', 3);
                RETURNS: 'A/B/C.js'
            getMinifiedFilepath('/home/jolsen/assets/js/A/B/C/e.js', '/assets/js', 0);
                RETURNS: 'js.js'
            getMinifiedFilepath('/home/jolsen/assets/js/A/B/E.js', '/home/jolsen/assets/, 1);
                RETURNS: '/home/jolsen/assets/js.js'
            getMinifiedFilepath('/home/jolsen/assets/js/A/B/E.js', '/home/jolsen/assets/, 0);
                RETURNS: '/home/jolsen/assets.js'

    */
    function getMinifiedFilepath(scriptPath, dirStart=JS_MINIFICATION_START_DIR,
        concatDepth=JS_MINIFICATION_CONCAT_DEPTH) {

        var divergedScriptPath, divergeAfterDirs, depthCount, currDir, bldPath, filestep;
        /** note : using the 'path' methods in this function (join, basename, etc.)
            avoids having to consider case of if a path ends/begins with path separator or not.
            Also, using path.sep so operations are OS agnostic */

        grunt.log.debug(">> File: " + scriptPath
            + ", get minified filepath from "
            + dirStart
            + ", depth " + concatDepth);

        // validate
        if (concatDepth < 0) {
            grunt.fail.fatal("Can not pass a concatenation depth < 0 to getMinifiedFilepath!");
        }

        // make sure this a javascript file
        if (path.extname(scriptPath) != '.js') {
            grunt.log.warn("This is NOT a javascript file!  Can not get a minification name for it!");
            return undefined;
        }

        /**
            special case of depth starting at 0.

            If 0, concatenation should begin exactly in the dir to start
            minification in (dirStart argument)
            Since no filename or dir to base on, pick a special name these should map to
        */
        if (concatDepth == 0) {
            grunt.log.debug("Special case of depth 0");
            return 'xlrjs' + MINIFY_FILE_EXT;
        }

        // split on the divergence directory where you want minification to begin; return undefined if don't find it in the path
        divergedScriptPath = scriptPath.split(dirStart);
        if (divergedScriptPath.length == 1) { // (even if String begins with delim, will return 2 elemenets, first being "")
            grunt.log.warn("can't determine minified filename for " + scriptPath+ "; doesn't come from diverance path");
            return undefined;
        }
        divergeAfterDirs = divergedScriptPath[1].split(path.sep); // /assets/js/ would go to --> ['','assets', 'js','']

        /**
            2 cases:
                a. file exists in dir at or deeper than where concatenation begins
                    (i.e., '/assets/js/A/B/C.js', dirStart '/assets/js/', depth 1)
                b. file exists in dir more shallow than where concatenation begins
                    (i.e., '/assets/js/A/B/C.js', dirStart '/assets/js/', depth 4)

                Starting from front of path, collect n path elements where n is the concatDepth
                (i.e., '/assets/js/A/B/C/D.js', depth of 3, take pieces 'assets', 'js', 'A')
                Whatever is last piece collected is basename for the new minifile.
                If its a dir, just add the minifile extension on it.
                If its a file, strip off the files current file extension and replace with the minified one.
        */
        depthCount = 0;
        currDir = '';
        bldPath = [];
        // want to take off front elements; reverse + pop instead of shifting (shift slower; iterates entire array)
        divergeAfterDirs.reverse();
        while ( divergeAfterDirs.length > 0 && depthCount < concatDepth ) {
            // if any of the dirs had multiple path seps , i.e., //, will give '' elements for those, so keep going until you hit actual dir.
            do {
                currDir = divergeAfterDirs.pop();
            }
            while ( !currDir );
            // made it to next dir; collect it
            bldPath.push(currDir);
            depthCount++;
        }

        // you got all the pieces!  if last piece is a dir itself, add extension direct ly on.
        // If concatDepth exceeded actual depth of the file, last piece should be the file.
        //  Need to strip off current file extension and add the minified one.
        filestep = bldPath[bldPath.length-1];
        if (grunt.file.isDir(filestep)) {
            filestep = filestep + MINIFY_FILE_EXT;
        } else {
            filestep = path.basename(filestep, path.extname(filestep)) + MINIFY_FILE_EXT;
        }
        bldPath[bldPath.length-1] = filestep;

        return bldPath.join(path.sep);
    }

    /**
        Given an abs. path to a file, return true or false if the file is
        a src file, mindful of situation where src and bld could be descendents of
        each other.
        (Example: if build out directory is descendent of src root, and this file is nested in
        the build out directory, then even though it is also nested wtihin src root, the
        function will return false as it is a build file, NOT a src file
    */
    function isSrcFile(filepath) {
        if (!grunt.file.isPathAbsolute(filepath)) {
            grunt.fail.fatal("Can not determine if src file because path is not abs.  Path: " + filepath);
        }
        // see if descendent of src or bld
        src = false;
        bld = false;
        if (grunt.file.doesPathContain(SRCROOT, filepath)) {
            src = true;
        }
        if (grunt.file.doesPathContain(BLDROOT, filepath)) {
            bld = true;
        }
        /**
            if descendent of both, SRC and DEST have a common ancestor.
            see which is nested further down - that is what type of file it is
        */
        if (src && bld) {
            if (grunt.file.doesPathContain(SRCROOT, BLDROOT)) {
                src = false;
            } else if (!grunt.file.doesPathContain(BLDROOT, SRCROOT)) {
                grunt.fail.fatal("File "
                    + filepath
                    + " is descendent of both bld and src directory, "
                    + "but can't determine if src: "
                    + SRCROOT
                    + " or bld: "
                    + BLDROOT
                    + " is nested further down");
            }
        }
        return src;
    }

    /**
        Given a filepath, update the file so that occurances of 'xcalar design'
        are replaced with 'xcalar insight'
        (see method convertXDstrToXIstr for exact cases)

        @filepath : abs. path to the file
        @destination: (optional, String) - if you want to save the file to a new location
        @deleteOriginal: (optiona, String, defaults to false) - if you want to delete the old file,
            in the case you're saving to a new location
    */
    function updateFileProductName(filepath, destination, deleteOriginal) {

        if (typeof deleteOriginal == 'undefined') {
            deleteOriginal = true;
        }

        var contents;
        var updatedContents;
        var dest = destination;
        if (!dest) {
            dest = filepath;
        }

        // if the file exists, read it
        if (grunt.file.exists(filepath)) {
            contents = grunt.file.read(filepath);
            updatedContents = updateStringProductName(contents);
            // write the file to the proper destination
            grunt.log.write("Writing/updating file with 'xcalar insight' product Strings, @ " + destination + "... ");
            grunt.file.write(destination, updatedContents);
            grunt.log.ok();
            if (destination != filepath && deleteOriginal) {
                grunt.log.write("\tDelete old file... " + filepath + " ... ");
                grunt.file.delete(filepath);
                grunt.log.ok();
            }
        } else {
            grunt.fail.fatal("Trying to update the XD strings in some js files to XI strings,"
                + " but one of the files to update does not exist!"
                + "\nFile: "
                + filepath
                + "\n(Likely this file has been removed from the bld, or its location"
                + " within the bld has changed."
                + " \nGruntfile is hardcoding which files to update; please update Gruntfile"
                + " to either remove check on this file or update to its proper filepath in the bld)");
        }
    }

    /**
        Given an input String, returns a new String which is same as input, only with
        all occurances of 'xcalar design' replace with 'xcalar insight'
        (see method convertXDstrToXIstr for exact cases)

        @returns the modified String
    */
    function updateStringProductName(str) {

        // go through entire contents, replace each occurance of
        // 'xcalar design' (case ins.) with proper xcalar insight string
        var regex = /xcalar design/gi;
        var matches;
        var prevIdx = 0;
        var newStr = "";
        while ((matches = regex.exec(str)) !== null) {
            newStr += str.substring(prevIdx, matches.index);
            newStr += convertXDstrToXIstr(matches[0]);
            prevIdx = regex.lastIndex;
        }
        newStr += str.substring(prevIdx);
        return newStr;
    }

    /**
        Given a filepath and String as contents, write the contents at the filepath,
        tacking on a warning that the file has been autogenerated, and log this.

        @arg description: optional, String
            contexnt: There is a global hash 'generatedDuringBuild', and any key/value pair in it
            will be displayed to user upon compoetion summary.  (Useful for keeping track of
            key files generated during build process they might want to look at.)
            This function adds file being generated, in to that hash.
            'description' arg allows you to put a custom description of the file being
            generated.  If not supplied will just display the filename itself.

        @arg nowarning: optional, boolean, defaults to false;
            if true will not log the warning

    */
    function writeAutoGeneratedFile(filepath, content, description, nowarning=false) {

        if (!nowarning) {
            // determine if html or js comment type
            var filetype = path.extname(filepath)
            if (filetype == '.js') {
                content = AUTOGENWARNINGJS + "\n" + content;
            } else if (filetype == '.html' || filetype == '.htm') {
                content = AUTOGENWARNINGHTML + "\n" + content;
            } else {
                grunt.fail.fatal("Trying to autogen a file of type "
                    + filetype
                    + " .  Adds in an autogen warning comment, "
                    + " but only have comments suitable for js and html files. "
                    + "add one in for your file type!");
            }
        }
        grunt.log.write("Autogen: " + filepath + " ... ");
        /**
            in the case of the files we're autogenning always want to overwrite
            and it is valid case we'll have to do this
        */
        grunt.file.write(filepath, content);
        grunt.log.ok();

        // anything added to 'generatedDuringBld' hash will get displayed to user at summary
        var key = path.basename(filepath);
        if (description) {
            key = description;
        }
        generatedDuringBuild[key] = filepath;
    }

    // WATCH FUNCTIONALITY TASKS AND FUNCTIONS
    // Step 1: Parse cli options and configure the watch plugin
    // Step 2: Add to and trigger grunt-concurrent task process for each type
    // Step 3: [On change] determine tasks to run
    // Step 4: [On change] Run the watch tasklist

    // Step 1: getCmdParams
    // Step 2: Configure grunt-concurrent plugin and add to task queue.
    //         Run only in parent process.
    grunt.task.registerTask(WATCH, function() {
        var watchTargets = Object.keys(grunt.config(WATCH_PLUGIN));

        var deployTargets = [];
        for (var target of watchTargets) {
            if (grunt.config(WATCH_PLUGIN + '.' + target + '.files').length > 0) {
                grunt.log.debug("Watching: " + grunt.config(WATCH_PLUGIN + '.' +
                    target + '.files'));
                deployTargets.push(WATCH_PLUGIN + ':' + target);
            }
        }
        grunt.log.debug("Concurrent running on these watch targets: " +
            deployTargets);
        grunt.config('concurrent.watch.tasks', deployTargets);

        if (grunt.option(WATCH_FLAG_INITIAL_BUILD_CSS)) {
            grunt.task.run('less:dist');
        }
        grunt.log.debug("Deploy concurrent");

        grunt.task.run('concurrent:watch');
    });

    // Step 3: Run livereloadon and livereloadoff targets concurrently
    grunt.event.on('watch', function(action, filepath, callingTarget) {
        var taskList = [];

        filepath = path.resolve(filepath);
        grunt.log.writeln(("(" + process.pid + "):").bold.green + filepath +
            " was modified.");

        if (grunt.file.isDir(filepath)) {
            grunt.log.writeln("Ignoring directories.");
            return;
        }

        var trackingData = isWatchEventProcessing();
        if (trackingData) {
            grunt.log.writeln(("If you see this continually, it's a bug. " +
                "Here are the relevant details: filepath: " + filepath +
                "trackingData[0]: " + trackingData[0] + ", trackingData[1]: " +
                trackingData[1] + ", trackingData[2]: " +
                trackingData[2]).red.bold);
            return;
        } else {
            watchEventStartTracking(filepath, callingTarget, process.pid);
        }

        if (!grunt.file.isPathAbsolute(filepath) ||
            !grunt.file.exists(filepath)) {
            grunt.fail.fatal("Filepath not abs or doesn't exist");
        }

        var filepathRelBld = getFilepathRelSrcOrBld(filepath);
        var containingDirRelBld = path.dirname(filepathRelBld);
        var filetype = getWatchFileType(filepath);
        grunt.log.debug("Resolved filepath: " + filepath + ", type: " +
            filetype + ", con. dir: " + containingDirRelBld + ", rl bld: " +
            filepathRelBld);

        var determinedRebuildProcess = false;
        switch (filetype) {
            case WATCH_TARGET_LESS:
                // arePathsEquivalent handles cases like trailing /
                if (grunt.file.arePathsEquivalent(containingDirRelBld,
                    cssMapping.src)) {
                    grunt.log.writeln((filepath + " is a top level less file")
                        .bold.green);
                    grunt.file.copy(filepath, BLDROOT + filepathRelBld);
                    var filepathRelFiletypeSrc = path.relative(cssMapping.src,
                        filepathRelBld);
                    grunt.config(LESS_TEMPLATE_KEY, filepathRelFiletypeSrc);
                    resolveDependencies(cssMapping.required);
                } else {
                    grunt.log.writeln((filepath +" is not a top level less " +
                        "file").bold.green);
                    resolveDependencies([cssMapping.src]);
                    // watched file wont be copied in if was present in bld
                    grunt.file.copy(filepath, BLDROOT + filepathRelBld);
                }
                taskList.push('less:dist');
                determinedRebuildProcess = true;
                break;
            case WATCH_TARGET_TYPESCRIPT:
                if (grunt.file.doesPathContain(typescriptMapping.src,
                    filepathRelBld)) {
                    grunt.log.writeln((filepath + " triggers new js file gen.")
                        .bold.green);
                    if (grunt.file.exists(TS_WATCH_STAGING)) {
                        runShellCmd('rm -r ' + TS_WATCH_STAGING);
                    }
                    runShellCmd('mkdir -p ' + TS_WATCH_STAGING);
                    filepathRelTsSrc = path.relative(typescriptMapping.src,
                        filepathRelBld);
                    if (filepath == SRCROOT + typescriptMapping.src +
                        'tsconfig.json') {
                        runShellCmd('cp -r ' + SRCROOT +
                            typescriptMapping.src + '/. ' + TS_WATCH_STAGING);
                    } else {
                        grunt.file.copy(filepath,
                            TS_WATCH_STAGING + filepathRelTsSrc);
                        grunt.file.copy(SRCROOT + typescriptMapping.src +
                            'tsconfig.json', TS_WATCH_STAGING +"tsconfig.json");
                    }
                    taskList.push(BUILD_JS + ':' + TS_WATCH_STAGING);
                    taskList.push('clean:tsWatchStaging');
                    determinedRebuildProcess = true;
                }
                break;
            case WATCH_TARGET_JS:
                if (grunt.file.arePathsEquivalent(
                    SRCROOT + "assets/lang/en/jsTStr.js",
                    filepath)) {
                    taskList.push(GENERATE_TSDEF);
                }
                if (grunt.file.doesPathContain(jsMapping.src, filepathRelBld) ||
                    grunt.file.doesPathContain(SRCROOT + "assets/lang",
                                               filepathRelBld)) {
                    determinedRebuildProcess = true;
                    grunt.file.copy(filepath, BLDROOT + filepathRelBld);
                } else if (grunt.file.doesPathContain(typescriptMapping.src,
                    filepathRelBld)) {
                    determinedRebuildProcess = true;
                    filepathRelTsSrc = path.relative(typescriptMapping.src,
                        filepathRelBld);
                    grunt.file.copy(filepath,
                        BLDROOT + jsMapping.dest + filepathRelTsSrc);
                }
                break;
            case WATCH_TARGET_HTML:
                var bldEntireHtml = true;
                if (grunt.file.arePathsEquivalent(containingDirRelBld,
                                                  htmlMapping.src)) {
                    filepathRelFiletypeSrc = path.relative(htmlMapping.src,
                                                           filepathRelBld);
                    outputFilepaths = getTemplatingOutputFilepaths(
                                                        filepathRelFiletypeSrc);
                    if (outputFilepaths.length === 1) {
                        grunt.log.writeln((filepath + " is a top level html " +
                            "file.").bold.green);
                        bldEntireHtml = false;
                        // Set global parameters for later jobs to use
                        grunt.config(STAGE_HTML_TEMPLATE_KEY,
                                     filepathRelFiletypeSrc);
                        resolveDependencies(htmlMapping.required, SRCROOT,
                                           HTML_STAGING_I_ABS, htmlMapping.src);
                        grunt.file.copy(filepath, BLDROOT + filepathRelBld);
                        grunt.config(HTML_TEMPLATE_KEY, outputFilepaths[0]);
                    }
                }
                if (bldEntireHtml) {
                    grunt.log.writeln((filepath + " is not a top level file. " +
                        "Regenerating all HTML files.").bold.green);
                    resolveDependencies([htmlMapping.src]);
                    grunt.file.copy(filepath, BLDROOT + filepathRelBld);
                }
                taskList.push(BUILD_HTML);
                determinedRebuildProcess = true;
                break;
            case WATCH_TARGET_CTOR:
                taskList.push(CONSTRUCTOR_FILES);
                determinedRebuildProcess = true;
                break;
            case WATCH_TARGET_CSS:
                // XXX figure out why we are not doing anything here
                determinedRebuildProcess = true;
                break;
            default:
                grunt.fail.fatal("Could not determine type of watched file: " +
                    filepath);
                break;
        }

        if (!determinedRebuildProcess) {
            grunt.fail.fatal(("Could not determine which build tasks to " +
                "execute for:" + filepath).bold.red);
        }

        grunt.log.debug("Schedule build finalize");
        taskList.push(FINALIZE);

        grunt.log.debug("Schedule cleanup");
        taskList.push(COMPLETE_WATCH);

        grunt.log.debug("Set dynamic task list found (these tasks should not " +
            "run yet): " + taskList);
        var taskAccessStr = WATCH_PLUGIN + '.' + callingTarget + '.tasks';
        grunt.config(taskAccessStr, taskList);
    });

    /** Cleans up global data for next watch task. This needs to be a task and
     * not a function because it can only be run after all async stuff are done
     */
    grunt.task.registerTask(COMPLETE_WATCH, function() {
        var target = watchEventStopTracking();
        resetTemplateKeys();

        grunt.log.debug("Reset tasklist for watch plugin: " + target);
        grunt.config(WATCH_PLUGIN + '.' + target + '.tasks', []);
    });

    /** Configure the watch command based on user's CLI args
    */
    function configureWatchTasksBasedOnUserParams() {
        var watchFiles = getWatchFilesByType();

        if (watchFiles[WATCH_TARGET_LESS] &&
            LIVE_RELOAD_BY_TYPE[WATCH_TARGET_LESS]) {
            grunt.log.debug("Livereload LESS must also Livereload CSS");
            watchFiles[WATCH_TARGET_CSS] = WATCH_FILETYPES[WATCH_TARGET_CSS];
            LIVE_RELOAD_BY_TYPE[WATCH_TARGET_CSS] = true;
        }

        for (var filetype of Object.keys(watchFiles)) {
            var pluginTarget = LR_OFF;
            if (LIVE_RELOAD_BY_TYPE[filetype]) {
                pluginTarget = LR_ON;
            }
            var targetWatchFiles = grunt.config(WATCH_PLUGIN + '.' +
                pluginTarget + '.files');
            targetWatchFiles = targetWatchFiles.concat(watchFiles[filetype]);
            grunt.config(WATCH_PLUGIN + '.' + pluginTarget + '.files',
                targetWatchFiles);
        }
    }

    /** Returns a map[watch type] => file list.
     *  Only types that are being watched will exist in the map
    */
    function getWatchFilesByType() {
        grunt.log.writeln("Getting list of files to watch");

        var filesToWatchByFiletype = {};
        var allPossibleTypes = Object.keys(WATCH_FILETYPES);

        // Watch all files. Triggered with --all
        if (grunt.option(WATCH_FLAG_ALL)) {
            grunt.log.writeln("Watch all files");
            for (var target of allPossibleTypes) {
                filesToWatchByFiletype[target] = WATCH_FILETYPES[target];
            }
            grunt.log.writeln(JSON.stringify(filesToWatchByFiletype));
            return filesToWatchByFiletype;
        }

        // Watch some file types, Triggered with --a --b --c
        for (var target of allPossibleTypes) {
            if (grunt.option(target)) {
                filesToWatchByFiletype[target] = WATCH_FILETYPES[target];
            }
        }

        grunt.log.writeln("Watching some types: " +
            JSON.stringify(filesToWatchByFiletype));

        return filesToWatchByFiletype;
    }

    /** Returns an obj whose key is type, value is whether it's reloaded
     * Input: If reloadValStr, then reload all.
     *        Else: If -, remove types
     *              Else, only include types
    */
    function getReloadTypes() {
        var reloadByType = {};
        var reloadDefault = false;
        var reloadTypes = [];
        var allPossibleTypes = Object.keys(WATCH_FILETYPES);

        if (grunt.option(WATCH_OP_LIVE_RELOAD)) {
            grunt.log.writeln(("To enable livereload, you need to install the" +
                               " google chrome livereload plugin. Refresh " +
                               "your browser after you've installed it.").red
                               .bold);
            var reloadValStr = grunt.option(WATCH_OP_LIVE_RELOAD);

            if (reloadValStr === true) {
                reloadDefault = true; // Think of this as -null
            } else {
                if (reloadValStr.charAt(0) === '-') {
                    reloadDefault = true;
                    reloadValStr = reloadValStr.substring(1,
                                                          reloadValStr.length);
                }
                reloadTypes = reloadValStr.split(OPTIONS_DELIM);
            }
        }

        for (var type of allPossibleTypes) {
            if (reloadTypes.indexOf(type) > -1) {
                reloadByType[type] = !reloadDefault;
            } else {
                reloadByType[type] = reloadDefault;
            }
        }

        for (var type of Object.keys(reloadByType)) {
            grunt.log.writeln("\tReload " + type + ": " + reloadByType[type]);
        }
        return reloadByType;
    }

    /** Returns WATCH_FILETYPES value of an absolute filepath to a file.
     * Needed because we can't just rely on ext due to htmlTStr.js etc which
     * needs to rebuild HTML not JS
    */
    function getWatchFileType(filepath) {
        var filetype;
        var fileExt = path.extname(filepath);
        var filename = path.basename(filepath);
        // consider as part of htmlsrc
        if (filename === 'htmlTStr.js') {
            filetype = WATCH_TARGET_HTML;
        } else if (filename === CONSTRUCTOR_TEMPLATE_FILE) {
            filetype = WATCH_TARGET_CTOR;
        } else if (filename === 'tsconfig.json') {
            filetype = WATCH_TARGET_TYPESCRIPT;
        } else {
            switch (fileExt) {
                case '.html':
                    assert(grunt.file.doesPathContain(SRCROOT + htmlMapping.src,
                        filepath), "Path must be a child of srcroot");
                    filetype = WATCH_TARGET_HTML;
                    break;
                case '.js':
                    assert((grunt.file.doesPathContain(SRCROOT + jsMapping.src,
                                filepath) ||
                            grunt.file.doesPathContain(SRCROOT +
                                typescriptMapping.src, filepath) ||
                            grunt.file.doesPathContain(SRCROOT + "assets/lang",
                                filepath)),
                            "Path must be under a ts, js or lang folder.");
                    filetype = WATCH_TARGET_JS;
                    break;
                case '.ts':
                    filetype = WATCH_TARGET_TYPESCRIPT;
                    break;
                case '.css':
                    filetype = WATCH_TARGET_CSS;
                    break;
                case '.less':
                    filetype = WATCH_TARGET_LESS;
                    break;
                default:
                    grunt.log.writeln(("Can not determine filetype of " +
                                      filepath).bold.red);
            }
        }

        if (filetype && !WATCH_FILETYPES.hasOwnProperty(filetype)) {
            grunt.fail.fatal("Error: Did you forget to add the file type to " +
                             "WATCH_FILETYPES struct?");
        }
        return filetype;
    }

    /**
     * Init step 1: Parse, validate and set CLI flags
     */
    function processCmdOptions() {
        grunt.log.writeln("Validating cmd parameters");
        validateCmdParams();
        grunt.log.ok();

        grunt.log.writeln("Set envvars based on CLI args");
        getCmdParams();
        grunt.log.ok();

        grunt.log.debug("Set all other globals and config data");
        HTML_STAGING_I_ABS = BLDROOT + htmlStagingDirI;
        HTML_STAGING_II_ABS = BLDROOT + htmlStagingDirII;
        TS_WATCH_STAGING = BLDROOT + 'tswatchtmp/';

        if (BLDTYPE !== DEV) {
            DONT_RSYNC.push('assets/dev');
        }

        WATCH_FILETYPES[WATCH_TARGET_HTML] = [
            SRCROOT + 'site/**/*.html',
            SRCROOT + '**/htmlTStr.js'
        ];

        WATCH_FILETYPES[WATCH_TARGET_LESS] = [SRCROOT + cssMapping.src + '**/*.less'];
        WATCH_FILETYPES[WATCH_TARGET_TYPESCRIPT] = [SRCROOT + typescriptMapping.src + '**/*.ts', SRCROOT + typescriptMapping.src + 'tsconfig.json'];
        WATCH_FILETYPES[WATCH_TARGET_CSS] = [BLDROOT + cssMapping.dest + '**/*.css'];
        WATCH_FILETYPES[WATCH_TARGET_JS] = [SRCROOT + jsMapping.src + '**/*.js',
            SRCROOT + typescriptMapping.src + "/**/*.js", SRCROOT + "assets/lang/" + "**/*.js"];
        WATCH_FILETYPES[WATCH_TARGET_CTOR] = [SRCROOT + 'site/render/template/constructor.template.js'];
    }

    function displayHelpMenu() {
        grunt.log.writeln((("Usage:").red +
                        ("\n\tgrunt [options] [task [task ...]]").yellow).bold);
        grunt.log.writeln(("Frequently used commands:").red);
        grunt.log.writeln(("\tFrontend devs:").green);
        grunt.log.writeln("\t\tgrunt dev // Wait for completion");
        grunt.log.writeln("\t\tgrunt watch --all");
        grunt.log.writeln(("\tBackend devs:").green);
        grunt.log.writeln("\t\tInstaller build: grunt installer");
        grunt.log.writeln("\t\tTest out thrift change: grunt trunk");
        grunt.log.writeln((("\nAvailable tasks:").red).bold);
        grunt.log.writeln((("\tBuild tasks:").yellow).bold);
        for (var task of Object.keys(VALID_BLD_TASKS)) {
            grunt.log.writeln(("\t" + task).green + ": " + VALID_BLD_TASKS[task]);
        }
        grunt.log.writeln((("\tOther tasks:").yellow).bold);
        for (var task of Object.keys(VALID_OTHER_TASKS)) {
            grunt.log.writeln(("\t" + task).green + ": " + VALID_OTHER_TASKS[task]);
        }
        grunt.log.writeln((("Available options:").red).bold);
        for (var type of Object.keys(OPTIONS_DESC_HASH)) {
            for (var subtype of Object.keys(OPTIONS_DESC_HASH[type])) {
                grunt.log.writeln((OPTIONS_DESC_HASH[type][subtype]['header'] +
                                   "\n").bold.yellow);
                // list all the options
                for (var op of Object.keys(OPTIONS_DESC_HASH[type][subtype]
                                                        ['matchingoptions'])) {
                    grunt.log.writeln((OPTIONS_DESC_HASH[type][subtype]
                                      ['matchingoptions'][op]['useage']).green);
                    grunt.log.writeln(OPTIONS_DESC_HASH[type][subtype]
                                               ['matchingoptions'][op]['desc']);
                }
            }
        }
    }

    // Get commandline args and set envVar based on the args
    function getCmdParams() {
        var tasksRequested = getTaskList();
        grunt.log.debug("Tasks: " + tasksRequested);
        if (tasksRequested.length === 0) {
            // check if any env vars
            var contextFound = false;
            if (process.env[BLDTYPE]) {
                BLDTYPE = process.env[BLDTYPE];
                IS_BLD_TASK = true;
                contextFound = true;
            }
            if (process.env[IS_WATCH_TASK]) {
                IS_WATCH_TASK = process.env[IS_WATCH_TASK];
                contextFound = true;
            }
            if (!contextFound) {
                grunt.fail.fatal("Task must be provided via CLI or envvar.");
            }
        } else {
            for (var task of tasksRequested) {
                if (Object.keys(VALID_BLD_TASKS).indexOf(task) !== -1) {
                    grunt.log.writeln("Will run build task");
                    BLDTYPE = task;
                    IS_BLD_TASK = true;
                    process.env[BLDTYPE] = BLDTYPE;
                }
                if (task === "watch") {
                    grunt.log.writeln("Will run watch task");
                    IS_WATCH_TASK = true;
                    process.env[IS_WATCH_TASK] = IS_WATCH_TASK;
                }
            }
        }

        // SRCROOT for build
        SRCROOT = grunt.option(BLD_OP_SRC_REPO) || process.env[XLRGUIDIR] || process.cwd();
        if (SRCROOT) {
            if (!SRCROOT.endsWith(path.sep)) {
                SRCROOT = SRCROOT + path.sep;
            }
            if (!grunt.file.exists(SRCROOT)) {  // make sure this is a valid dir
                grunt.fail.fatal("SRCROOT " + SRCROOT + "does not exist");
            }

            // Check this is a xcalar-gui project by looking for a known file
            var xcalarGuiFileCheck = "favicon.ico";
            if (!grunt.file.exists(SRCROOT + xcalarGuiFileCheck)) {
                grunt.fail.fatal("Not a valid xcalar-gui SRCROOT.");
            }

            // Warning if building from project src diff from their $XLRGUIDIR
            if (process.env[XLRGUIDIR]) {
                if (!grunt.file.arePathsEquivalent(SRCROOT,
                                                   process.env[XLRGUIDIR])) {
                    grunt.log.writeln(("WARNING: You are building from a " +
                "SRCROOT that is different from your XLRGUIDIR path").bold.red);
                } else if (!grunt.file.arePathsEquivalent(SRCROOT, process.cwd())) {
                    grunt.log.writeln(("WARNING: You are building from a " +
                        "SRCROOT that is different from your cwd").bold.red);
                }
            }
            process.env[XLRGUIDIR] = SRCROOT;
        } else {
            grunt.fail.fatal("Grunt could not determine a project source to " +
                             "generate your build from!");
        }

        // PRODUCT to build
        PRODUCT = grunt.option(BLD_OP_PRODUCT) || process.env[BLD_OP_PRODUCT] || XD;
        var prodNameMapping = {
            XD: XDprodName,
            XI: XIprodName,
            XDEE: XDEEprodName
        };
        if (prodNameMapping.hasOwnProperty(PRODUCT)) {
            PRODUCTNAME = prodNameMapping[PRODUCT];
        } else {
            grunt.fail.fatal("Invalid product type. Options: " +
                             Object.keys(prodNameMapping));
        }
        process.env[BLD_OP_PRODUCT] = PRODUCT;

        // BLDROOT from where to build
        BLDROOT = grunt.option(BLD_OP_BLDROOT) || process.env[BLD_OP_BLDROOT] || SRCROOT + PRODUCTNAME;
        if (!BLDROOT.endsWith(path.sep)) {
            BLDROOT = BLDROOT + path.sep;
        }
        if (!grunt.file.isPathAbsolute(BLDROOT)) {
            BLDROOT = SRCROOT + BLDROOT;
        }
        if (grunt.file.arePathsEquivalent(SRCROOT, BLDROOT)) {
            grunt.fail.fatal("Build root and src root cannot be the same.");
        }
        if (!grunt.file.doesPathContain(SRCROOT, BLDROOT)) {
            grunt.fail.fatal("Your project root must contain your build root.");
        }
        if (IS_WATCH_TASK && !IS_BLD_TASK && !grunt.file.exists(BLDROOT)) {
            grunt.fail.fatal("You need to run a full build (e.g. grunt dev) " +
                "first before running grunt watch");
        }
        process.env[BLD_OP_BLDROOT] = BLDROOT;

        // FASTCOPY do not delete help and node_modules folder
        fastcopy = grunt.option(FASTCOPY) || process.env[FASTCOPY] || false;
        process.env[FASTCOPY] = fastcopy;

        // OVERWRITE bldroot if it already exists
        OVERWRITE = !(grunt.option(BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS)) || process.env[BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS] || false;
        process.env[BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS] = OVERWRITE;

        // KEEPSRC retains src code (less, partials, etc)
        KEEPSRC = grunt.option(BLD_FLAG_RETAIN_FULL_SRC) || process.env[BLD_FLAG_RETAIN_FULL_SRC] || false;
        process.env[BLD_FLAG_RETAIN_FULL_SRC] = KEEPSRC;

        // XLRDIR sets this for grunt trunk builds for syncing thrift
        if (BLDTYPE === TRUNK) {
            BACKENDBLDDIR = grunt.option(BLD_OP_BACKEND_SRC_REPO) || process.env[XLRDIR];
            if (!BACKENDBLDDIR.endsWith(path.sep)) {
                BACKENDBLDDIR = BACKENDBLDDIR + path.sep;
            }
            if (!BACKENDBLDDIR || !grunt.file.exists(BACKENDBLDDIR)) {
                grunt.fail.fatal("XLRDIR must be defined for grunt trunk. " +
                                 "Export again");
            }
            process.env[XLRDIR] = BACKENDBLDDIR;
        }

        // BLD_OP_JS_MINIFICATION_CONCAT_DEPTH how many levels to keep
        // Defaults to 2: ts/folderName. To minify everything, use 0(untested).
        JS_MINIFICATION_CONCAT_DEPTH = grunt.option(BLD_OP_JS_MINIFICATION_CONCAT_DEPTH) || process.env[BLD_OP_JS_MINIFICATION_CONCAT_DEPTH] || JS_MINIFICATION_CONCAT_DEPTH;
        if (isNaN(JS_MINIFICATION_CONCAT_DEPTH)) {
            grunt.fail.fatal("JS minification depth needs to be a number.");
        }
        process.env[BLD_OP_JS_MINIFICATION_CONCAT_DEPTH] = JS_MINIFICATION_CONCAT_DEPTH;

        // LIVE_RELOAD_BY_TYPE set the reload types
        if (IS_WATCH_TASK) {
            LIVE_RELOAD_BY_TYPE = getReloadTypes();
        }
    }

    // Reset all template keys to default
    function resetTemplateKeys() {
        for (var templateKey of Object.keys(TEMPLATE_KEYS)) {
            grunt.log.debug("\tReset template key " + templateKey +
                            " to default : " + TEMPLATE_KEYS[templateKey]);
            grunt.config(templateKey, TEMPLATE_KEYS[templateKey]);
        }
    }

    /**
        Checks to alert user that project source has issues,
        before building
    */
    function validateProjectSource() {

        // make sure xcalar-infra submodule present
        xcalaridlpath = SRCROOT + 'assets/js/constructor/xcalar-idl/';
        submoduleerr = "Try running 'git submodule update --init' within " +
            SRCROOT +
            ", and then re-running the build.\n\n" +
            "(Note: you must have gerrit set up for this to work.\n" +
            " Refer to the following wiki to set up gerrit:\n" +
            " http://wiki.int.xcalar.com/mediawiki/index.php/Gerrit#Set_up_git_review";

        if (!grunt.file.exists(xcalaridlpath)) {
            err = "xcalar-gui project source missing xcalar-idl submodule!\n" +
                "Project source: " +
                SRCROOT +
                "\nThe submodule should be located here:\n" +
                xcalaridlpath +
                "\n\n" +
                submoduleerr;
            grunt.fail.fatal(err);
        } else {
            /**
                check for README file in xd/ because, even if they don't have
                xd folder at beginning of build, it's going to get generated
                as a result of autogening constructor files, as the intermediary
                dirs will get created.  So, they would get the warning the first
                build, but not on subsequent builds.
            */
            checkfile = xcalaridlpath + 'xd/README';
            if (!grunt.file.exists(checkfile)) {
                err = "Your project source: " +
                    SRCROOT +
                    " has the xcalar-idl submodule present,\n but " +
                    checkfile +
                    " is missing from it.\n" +
                    "Most likely, you were missing all or part of xcalar-idl " +
                    "submodule, but the dir was generated by a previous " +
                    " build; xcalar-gui might not work." +
                    "\n\n" +
                    submoduleerr;
                END_OF_BUILD_WARNINGS.push(err);
            }
        }
    }

    /**Validate cmd params.
        @TODO Consider using grunt's arg parser instead. It may also help with
        generating a help menu
    */
    function validateCmdParams() {
        // TASKS
        var tasksRequested = grunt.option(INITIAL_GRUNT_PROCESS_TASKLIST)
                                  .split(',')
                                  .filter(function(task) {return task !== ""});
        grunt.log.debug("Tasks requested: "+ tasksRequested);

        if (tasksRequested.length === 0 && !grunt.option('help')) {
            grunt.fail.fatal("You need to specify grunt <TASK>. Examples: \n" +
            "grunt dev\n" +
            "grunt watch --html --less --js --ts --ctor\n" +
            "grunt installer\n" +
            "grunt trunk\n");
        }

        var bldTaskRequested = false;
        var watchTaskRequested = false;
        for (var i = 0; i < tasksRequested.length; i++) {
            var task = tasksRequested[i];
            if (task == 'watch' || process.env[IS_WATCH_TASK]) {
                watchTaskRequested = true;
            }

            if (Object.keys(VALID_TASKS).indexOf(task) !== -1) {
                if (VALID_TASKS[task][BLD_TASK_KEY]) {
                    if (bldTaskRequested) {
                        grunt.fail.fatal("Supply only 1 build task. You " +
                        "supplied " + task + " and " + bldTaskRequested +
                        "\nBuild task options:\n" + BLD_TASKS_DESC_STR);
                    } else {
                        bldTaskRequested = task;
                    }
                }

                // make sure any dependencies are present
                if (VALID_TASKS[task].hasOwnProperty(REQUIRES_ONE_KEY)) {
                    var metRequirement = false;
                    for (var requires of VALID_TASKS[task][REQUIRES_ONE_KEY]) {
                        if (grunt.option(requires)) {
                            metRequirement = true;
                            break;
                        }
                    }
                    if (!metRequirement) {
                        grunt.fail.fatal(task + "' requires at least one of " +
                                         "the following options/flags :\n" +
                      optionsListToString(VALID_TASKS[task][REQUIRES_ONE_KEY]));
                    }
                }
                if (VALID_TASKS[task].hasOwnProperty(REQUIRES_ALL_KEY)) {
                    for (var requires of VALID_TASKS[task][REQUIRES_ALL_KEY]) {
                        if (!grunt.option(requires)) {
                            grunt.fail.fatal(task + "' requires all of the " +
                                             "following options/flags:\n" +
                      optionsListToString(VALID_TASKS[task][REQUIRES_ALL_KEY]));
                        }
                    }
                }
            } else {
                grunt.log.debug("This case is only valid for a child process");
                if (TOPLEVEL_GRUNT_PROCESS) {
                    grunt.fail.fatal("Task doesn't exist. Did you forget --?");
                }
            }
        }

        // PARAMS
        params = grunt.option.flags();
        // We will be modifying grunt.option.flags during the process. So make
        // sure the validation is called prior to modifications.
        var paramIndicator = '--';
        for (var param of params) {
            // Valid examples of param
            // param: "--hello=world1,world2"
            // param: "--helloWord"
            var paramPlain = param.split(paramIndicator)[1];

            // Check if a flag or param option. if values supplied, get the value String
            var flagCheck = paramPlain.split('='); // ['hello', '=val1,val2']
            paramPlain = flagCheck[0];
            if (DONT_VALIDATE.indexOf(paramPlain) !== -1) {
                continue;
            }
            var flag = false;
            var values = false;
            if (flagCheck.length === 1) {
                flag = true;
            } else {
                values = flagCheck[1];
            }

            if (VALID_OPTIONS.hasOwnProperty(paramPlain)) {
                // Some params cannot be supplied with other params
                if (VALID_OPTIONS[paramPlain][NAND_KEY]) {
                    for (var noop of VALID_OPTIONS[paramPlain][NAND_KEY]) {
                        if (grunt.option(noop)) {
                            grunt.fail.fatal("Can not supply --" + paramPlain +
                                         " and --" + noop + " simultaneously.");
                        }
                    }
                }

                if (VALID_OPTIONS[paramPlain][BLD_KEY] && !bldTaskRequested) {
                    grunt.fail.fatal("Option: " + param +
                                     " only valid for build task");
                }

                if (VALID_OPTIONS[paramPlain][WATCH_KEY] &&
                    !watchTaskRequested) {
                     grunt.fail.fatal("Option "  + param +
                                      " only valid for watch task");
                }

                if (VALID_OPTIONS[paramPlain][FLAG_KEY] && !flag) {
                    grunt.fail.fatal("Flag --" + paramPlain +
                                     " cannot have values");
                }

                if (VALID_OPTIONS[paramPlain][REQUIRES_VALUE_KEY] && flag) {
                    grunt.fail.fatal("Param --" + paramPlain +
                                     " requires some value");
                }

                if (values) {
                    if (values.startsWith('-') &&
                        VALID_OPTIONS[paramPlain][EXCLUSION_KEY]) {
                        values = values.substring(1, values.length);
                    }
                    values = values.split(OPTIONS_DELIM);
                } else {
                    values = [];
                }

                // Check that the values here are valid
                if (values.length > 0) {
                    if (values.length > 1 &&
                        !VALID_OPTIONS[paramPlain][MULTI_KEY]) {
                        grunt.fail.fatal("--" + paramPlain +
                                         " only takes one value.");
                    }
                    if (VALID_OPTIONS[paramPlain].hasOwnProperty(VALUES_KEY)) {
                        for (var value of values) {
                            if (VALID_OPTIONS[paramPlain][VALUES_KEY]
                                .indexOf(value) === -1) {
                                var errMsg = "";
                                errMsg = "You have supplied an invalid value " +
                                          value + ", to option --" + paramPlain;
                                if (VALID_OPTIONS[paramPlain][MULTI_KEY]) {
                                    errMsg += "\nValid values are '" +
                                        VALID_OPTIONS[paramPlain][VALUES_KEY] +
                                        "(" + OPTIONS_DELIM + " delimited).";
                                } else {
                                    errMsg += "\nValid values: " +
                                        VALID_OPTIONS[paramPlain][VALUES_KEY];
                                }
                                if (VALID_OPTIONS[paramPlain][EXCLUSION_KEY]) {
                                    errMsg += "\n(To specify all but given " +
                                        "values, supply option as: --" +
                                        paramPlain + "=-<value(s)>";
                                }
                                grunt.fail.fatal(errMsg);
                            }
                        }
                    }
                }

                if (VALID_OPTIONS[paramPlain].hasOwnProperty(REQUIRES_ONE_KEY)) {
                    var metRequirement = false;
                    for (var requires of VALID_OPTIONS[paramPlain][REQUIRES_ONE_KEY]) {
                        if (grunt.option(requires)) {
                            metRequirement = true;
                            break;
                        }
                    }
                    if (!metRequirement) {
                        grunt.fail.fatal("--" + paramPlain +
                                         " requires at least one of: " +
                                         optionsListToString(VALID_OPTIONS
                                         [paramPlain][REQUIRES_ONE_KEY]));
                    }
                }

                if (VALID_OPTIONS[paramPlain].hasOwnProperty(REQUIRES_ALL_KEY)) {
                    for (var requires of VALID_OPTIONS[paramPlain][REQUIRES_ALL_KEY]) {
                        if (!grunt.option(requires)) {
                            grunt.fail.fatal("--" + paramPlain +
                                " requires all of: " + optionsListToString(
                                VALID_OPTIONS[paramPlain][REQUIRES_ALL_KEY]));
                        }
                    }
                }
            } else {
                // Invalid option / flag
                if (flag) {
                    grunt.fail.fatal("Invalid flag: " + param +
                        ". Valid flags are: " + FLAGS_DESC_STR);
                } else {
                    grunt.fail.fatal("Invalid option: " + param +
                        ". Valid options are: " + OPS_DESC_STR);
                }
            }
        }
    }

    function canPrettify(filepath) {
        return (DONT_PRETTIFY.indexOf(path.basename(filepath)) === -1);
    }

    function optionsListToString(optionsList) {
        return optionsList.map(function(element) {return "--" + element})
                          .join(", ");
    }

    /** Returns list of tasks requested by parent grunt process.
     * Child processes have access to grunt.options but not the task list.
    */
    function getTaskList() {
        grunt.log.debug("GET TASKS: Tasks showing in standard way: " +
                        grunt.cli.tasks);
        if (grunt.option(INITIAL_GRUNT_PROCESS_TASKLIST)) {
            return grunt.option(INITIAL_GRUNT_PROCESS_TASKLIST).split(',');
        } else {
            // This flag needs to be set in order to message pass between
            // parent and child processes.
            grunt.fail.fatal("Taskflag " + INITIAL_GRUNT_PROCESS_TASKLIST +
                             " is not present in grunt options! FIXME.");
        }
    }

    // Initialize parent task
    function parentInit() {
        grunt.log.debug("Tasks in this process: " + grunt.cli.tasks);
        if (!grunt.option(INITIAL_GRUNT_PROCESS_TASKLIST)) {
            TOPLEVEL_GRUNT_PROCESS = true;
            var tasklist = grunt.cli.tasks;
            grunt.option(INITIAL_GRUNT_PROCESS_TASKLIST, tasklist.join(','));
            if (isWatchEventProcessing()) {
                grunt.log.writeln(("Rerunning Grunt. Stopping previous runs")
                                  .bold.red);
                watchEventStopTracking();
            }
        } else {
            grunt.fail.fatal("Supposed to be parent process, but flag says " +
                             "this is a child. Logic error in Grunt.");
        }
    }

    // Checks whether a watch event is running. If it is, return details.
    function isWatchEventProcessing() {
        if (grunt.file.exists(WATCH_TMP_FILE)) {
            var content = grunt.file.read(WATCH_TMP_FILE);
            content = content.split('\n');
            return content;
        } else {
            grunt.log.debug(WATCH_TMP_FILE + " absent, no watch event running");
            return;
        }
    }

    // Start event tracking by creating a file with details of run
    function watchEventStartTracking(watchEventFile, watchTarget, processPid) {
        grunt.log.debug("Start tracking with file " + watchEventFile +
            " | watch target: " + watchTarget + " | pid: " + processPid);
        if (grunt.file.exists(WATCH_TMP_FILE)) {
            grunt.fail.fatal("Tmp file " + WATCH_TMP_FILE + " cannot exist.");
        } else {
            var content = watchEventFile + "\n" + watchTarget + "\n" +
                          processPid;
            writeAutoGeneratedFile(WATCH_TMP_FILE, content, null, true);
        }
    }

    // Stop event tracking. 1. Delete the tmp file
    // 2. Return name of target that started the event tracking
    function watchEventStopTracking() {
        grunt.log.debug("Stop tracking currently processing watch event");
        var trackingData = isWatchEventProcessing();
        if (trackingData) {
            grunt.log.debug("Curr Tracking data: " + trackingData +
                            " length: " + trackingData.length);
            var target = trackingData[1];
            grunt.file.delete(WATCH_TMP_FILE, {force:true});
            return target;
        } else {
            grunt.log.writeln(("Stop watch event called, " +
                "but no watch event is running. " + WATCH_TMP_FILE +
                " may have been manually removed.").red.bold);
        }
    }
};
