const path = require('path');

module.exports = function(env, argv) {
    const mode = env.production ? 'production' : 'development';
    const buildSourceMap = env.srcmap;
    return [
        /**
         * Browserify xcrpc jsClient
         * This is packed as a part of the jsSDK now, but keep it in case we may
         * need a sep file in the future
         */
        // {
        //     target: "web",
        //     entry: path.resolve(env.buildroot, "assets/js/xcrpc/index.js"),
        //     mode: mode,
        //     output: {
        //         path: path.resolve(env.buildroot, 'assets/js/xcrpc'),
        //         library: 'xce',
        //         filename: 'libxce.js'
        //     },
        //     externals: {
        //         'require-context': 'notused',
        //     },
        //     node: {
        //         fs: 'empty',
        //         net: 'empty',
        //         tls: 'empty',
        //         setImmediate: false
        //     }
        // },

        /**
         * Browserify xcrpc jsSDK
         * It relies on jsClient source code
         */
        {
            target: "web",
            entry: path.resolve(env.buildroot, "assets/js/shared/Xcrpc/index.js"),
            mode: mode,
            output: {
                path: path.resolve(env.buildroot, 'assets/js/shared'),
                library: 'Xcrpc',
                filename: 'librpc.js'
            },
            externals: {
                'require-context': 'notused',
            },
            // Mimic a module from jsClient source code, so that we can use
            // require("xcalar") to access the jsClient
            resolve: {
                alias: {
                    'xcalar': path.resolve(env.buildroot, 'assets/js/xcrpc')
                }
            },
            // eval has the best performance, and reduces the build time by ~50%;
            // it matters especially to the watch task
            devtool: buildSourceMap ? 'eval' : '',
            node: {
                fs: 'empty',
                net: 'empty',
                tls: 'empty',
                setImmediate: false
            }
        },

        /**
         * Browserify parsers
         */
        {
            // We can add more to it, e.g. evalparser, etc. All of them share
            // one export target
            entry: path.resolve(env.buildroot, "assets/js/parser/index.js"),
            mode: mode,
            output: {
                path: path.resolve(env.buildroot, 'assets/js/shared/parser'),
                library: 'XDParser',
                filename: "antlrParser.js"
            },
            node: {
                module: "empty",
                net: "empty",
                fs: "empty"
            }
        }
    ];
};
