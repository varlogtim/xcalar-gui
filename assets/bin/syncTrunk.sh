#!/bin/bash
set -e
cd $XLRGUIDIR/xcalar-gui/assets/js/thrift/
mv *.js 015
cp $XLRDIR/src/bin/thrift/js/*.js .
cp $XLRDIR/src/bin/tests/*.js .
cp 015/thrift.js .
