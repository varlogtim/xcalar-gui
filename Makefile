.PHONY: all installer render build prod debug removeConfig alert generateHtml

export PATH:=$(PWD)/node_modules/.bin:$(PATH)
NOW :=$(shell date +'%Y%m%d-%H%M%S')
DESTDIR ?= .

ifeq ($(XLRDIR),)
$(error "XLRDIR is not set! Bailing...")
endif
ifeq ($(XLRGUIDIR),)
$(error "XLRGUIDIR is not set! Bailing...")
endif

all: generateHtml build prod alert

installer: generateHtml build prod removeConfig

trunk: generateHtml removeConfig thriftSync thriftAlert

debug: generateHtml build debug removeConfig

render: generateHtml

$(DESTDIR):
	@mkdir -p $@

build: $(DESTDIR) generateHtml
	@echo "=== Removing old prod folder if any ==="
	@rm -rf xcalar-gui
	@rm -rf prod
	@echo "=== Creating new prod folder ==="
	@mkdir -p $(DESTDIR)/prod
	@rsync -a * $(DESTDIR)/prod --exclude prod --exclude node_modules --exclude internal --exclude assets/js/constructor/xcalar-idl
	@echo "=== Removing unused files ==="
	@rm -f $(DESTDIR)/prod/assets/js/thrift/mgmttestactual.js
	@echo "=== Compile Less ==="
	cd $(DESTDIR) && mkdir -p prod/assets/stylesheets/css
	cd $(DESTDIR) && lessc prod/assets/stylesheets/less/login.less > prod/assets/stylesheets/css/login.css
	cd $(DESTDIR) && lessc prod/assets/stylesheets/less/style.less > prod/assets/stylesheets/css/style.css
	cd $(DESTDIR) && lessc prod/assets/stylesheets/less/mcf.less > prod/assets/stylesheets/css/mcf.css
	cd $(DESTDIR) && lessc prod/assets/stylesheets/less/testSuite.less > prod/assets/stylesheets/css/testSuite.css
	cd $(DESTDIR) && lessc prod/assets/stylesheets/less/installer.less > prod/assets/stylesheets/css/installer.css
	@rm -rf $(DESTDIR)/prod/assets/stylesheets/less
	@echo "=== Cleaning up non prod stuff ==="
	@rm -rf $(DESTDIR)/prod/assets/dev
	@rm -f $(DESTDIR)/prod/services/expServer/awsWriteConfig.json
	@echo "=== Generating version files ==="
	@echo "var gGitVersion = '"`git log --pretty=oneline --abbrev-commit -1 | cut -d' ' -f1`"';" >> prod/assets/js/constructor/A_constructorVersion.js
	@cd $(DESTDIR)/prod/assets/python && python genHelpAnchors.py
	export GIT_DIR=`pwd`/.git && cd $(DESTDIR) && ./prod/assets/bin/autoGenFiles.sh

prod: $(DESTDIR) generateHtml build
	@echo "=== Minifying ==="
	cd $(DESTDIR) && ./prod/assets/bin/minify.sh
	@echo "=== Running python build.py ==="
	@cd $(DESTDIR) && python prod/assets/python/build.py

	cd $(DESTDIR) && chmod -R 777 $(DESTDIR)/prod/*
	@echo "=== Done building ==="

debug: $(DESTDIR) generateHtml build
	@echo "=== Running python debug build.py ==="
	@cd $(DESTDIR) && python prod/assets/python/build.py debug

	cd $(DESTDIR) && chmod -R 777 $(DESTDIR)/prod/*
	@echo "=== Done building ==="

removeConfig: build
	@echo "=== Autogenerating Files ==="
	touch $(DESTDIR)/prod/assets/js/config.js
	rm $(DESTDIR)/prod/assets/js/config.js
	touch $(DESTDIR)/prod/assets/js/config.js

alert:
	@echo "=== ALERT! ==="
	@echo "If you are part of the backend team, and you do not"
	@echo "have a custom config.js file, please RERUN with"
	@echo "make installer"

node_modules:
	mkdir -p $@

node_modules/.bin: node_modules
	mkdir -p $@
	npm install --save-dev

node_modules/.bin/grunt: node_modules/.bin
	touch $@

generateHtml: node_modules/.bin/grunt
	# It's very important that this runs before build
	@echo "=== Generating html ==="
	@mkdir -p assets/htmlFiles/walk
	@grunt render

thriftSync: $(XLRDIR)/src/bin/thrift/js/XcalarApiService.js
	@echo "=== Syncing with XLRDIR's .js files ==="
	@./assets/bin/syncTrunk.sh
	@echo "var hostname='http://`hostname`:9090'; var expHost='http://`hostname`:12124';" > $(DESTDIR)/prod/assets/js/config.js


thriftAlert:
	@echo "=== ALERT! ==="
	@echo "You just forced the UI to talk to trunk."
	@echo "This may cause features to break if there are thrift changes "
	@echo "that are not yet incorporated into the front end. "
	@echo "If something that you expect to work breaks, "
	@echo "please send an email to fs-core@xcalar.com"
