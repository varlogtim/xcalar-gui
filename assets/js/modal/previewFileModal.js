window.PreviewFileModal = (function(PreviewFileModal, $) {
    var $modal;     // $("#previewFileModal")
    var modalHelper;
    var modalId;
    var searchHelper;

    PreviewFileModal.setup = function() {
        $modal = $("#previewFileModal");

        var minWidth = 680;
        var minHeight = 400;

        modalHelper = new ModalHelper($modal, {
            "minWidth": minWidth,
            "minHeight": minHeight
        });

        $modal.resizable({
            "handles": "n, e, s, w, se",
            "minHeight": minHeight,
            "minWidth": minWidth,
            "containment": "document"
        });

        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $modal.on("click", ".close, .cancel", function() {
            closeModal();
        });

        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        xcHelper.optionButtonEvent($modal.find(".radioButtonGroup"));

        setupSearch();
    };

    PreviewFileModal.show = function(url, options) {
        var deferred = jQuery.Deferred();

        modalHelper.setup();
        $modal.removeClass("error").addClass("loading");
        modalId = xcHelper.randName("previewFile");

        options = options || {};
        var pattern = options.pattern;
        var currentId = modalId;

        setupMode(options.isParseMode);
        setupInstruction(url, pattern);

        XcalarListFilesWithPattern(url, options.isRecur, pattern)
        .then(function(res) {
            if (currentId === modalId) {
                $modal.removeClass("loading");
                loadFiles(url, res.files, options.previewFile);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            if (currentId === modalId) {
                handleError(error);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    };

    function setupMode(isParseMode) {
        if (isParseMode) {
            $modal.addClass("parseMode");
        } else {
            $modal.removeClass("parseMode");
        }
    }

    function setupInstruction(url, pattern) {
        var $instruct = $modal.find(".modalInstruction");
        $instruct.find(".url b").text(url);

        if (pattern) {
            $instruct.find(".pattern").removeClass("xc-hidden")
                     .find("b").text(pattern);
        } else {
            $instruct.find(".pattern").addClass("xc-hidden");
        }
    }

    function setupSearch() {
        var $searchArea = $modal.find(".searchbarArea");
        searchHelper = new SearchBar($searchArea, {
            "removeSelected": function() {
                $modal.find('.selected').removeClass('selected');
            },
            "highlightSelected": function($match) {
                $match.addClass("selected");
            },
            "scrollMatchIntoView": scrollMatchIntoView,
            "$list": $modal.find(".contentSection"),
            "removeHighlight": true,
            "toggleSlider": searchText,
            "onInput": function() {
                searchText();
            }
        });

        var $searchInput = $searchArea.find("input");
        $searchArea.find(".closeBox").click(function() {
            if ($searchInput.val() === "") {
                searchHelper.toggleSlider();
            } else {
                searchHelper.clearSearch(function() {
                    $searchInput.focus();
                });
            }
        });
    }

    function searchText() {
        var $content = $modal.find(".contentSection");
        var $searchArea = $modal.find(".searchbarArea");
        var $searchInput = $searchArea.find("input");
        var text = $searchInput.val().toLowerCase();
        if (text === "") {
            searchHelper.clearSearch();
            return;
        }

        $content.find(".highlightedText").contents().unwrap();
        var $targets = $content.find('.label').filter(function() {
            return ($(this).text().toLowerCase().indexOf(text) !== -1);
        });

        text = xcHelper.escapeRegExp(text);
        var regex = new RegExp(text, "gi");

        $targets.each(function() {
            var foundText = $(this).text();
            foundText = foundText.replace(regex, function (match) {
                return ('<span class="highlightedText">' + match +
                        '</span>');
            });
            $(this).html(foundText);
        });
        searchHelper.updateResults($content.find('.highlightedText'));

        if (searchHelper.numMatches !== 0) {
            scrollMatchIntoView(searchHelper.$matches.eq(0));
        }
    }

    function scrollMatchIntoView($match) {
        var $container = $modal.find(".contentSection");
        var containerHeight = $container.outerHeight();
        var scrollTop = $container.scrollTop();
        var containerTop = $container.offset().top;
        var matchOffset = $match.offset().top - containerTop;

        if (matchOffset > containerHeight - 15 || matchOffset < 0) {
            $container.scrollTop(scrollTop + matchOffset -
                                 (containerHeight / 2));
        }
    }

    function loadFiles(url, files, activeFilePath) {
        var htmls = ["", "", ""];
        var paths = [];
        var nameMap = {};
        var $section = $modal.find(".contentSection");
        if (files.length === 1 && url.endsWith(files[0].name)) {
            // when it's a single file
            paths[0] = url;
            nameMap[url] = files[0].name;
        } else {
            // when it's a folder
            if (!url.endsWith("/")) {
                url += "/";
            }
            files.forEach(function(file) {
                // XXX temporary skip folder, later may enable it
                if (!file.attr.isDirectory) {
                    var path = url + file.name;
                    paths.push(path);
                    nameMap[path] = file.name;
                }
            });

            paths.sort();
        }

        for (var i = 0, len = paths.length; i < len; i++) {
            var path = paths[i];
            var classes = (path === activeFilePath) ? " active" : "";
            var fileName = nameMap[path];
            htmls[i % 3] +=
                '<div class="radioButton' + classes + '"' +
                'data-path="' + path + '">' +
                    '<div class="radio">' +
                        '<i class="icon xi-radio-selected"></i>' +
                        '<i class="icon xi-radio-empty"></i>' +
                    '</div>' +
                    '<div class="label tooltipOverflow"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body"' +
                    ' data-placement="top"' +
                    ' title="' + fileName + '">' +
                        fileName +
                    '</div>' +
                '</div>';
        }

        $section.find(".part").each(function(idx, ele) {
            $(ele).html(htmls[idx]);
        });

        var $activeRadio = $section.find(".radioButton.active");
        if ($activeRadio.length) {
            $activeRadio.get(0).scrollIntoView();
        }
    }

    function handleError(error) {
        $modal.removeClass("loading").addClass("error");
        if (typeof error === "object") {
            error = JSON.stringify(error);
        }
        $modal.find(".errorSection").text(error);
    }

    function submitForm() {
        var path = $modal.find(".radioButton.active").data("path");
        var isParseMode = $modal.hasClass("parseMode");
        closeModal();

        if (isParseMode) {
            // parse mode
            DSParser.show(path);
        } else {
            // preview mode
            DSPreview.changePreviewFile(path);
        }
    }

    function closeModal() {
        modalHelper.clear();
        modalId = null;
        searchHelper.clearSearch();
        $modal.find(".searchbarArea").addClass("closed");
    }

    return PreviewFileModal;
}({}, jQuery));