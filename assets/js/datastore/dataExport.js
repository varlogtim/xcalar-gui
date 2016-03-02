window.ExportTarget = (function($, ExportTarget) {
    var exportTargets = [];
    var $exportView = $('#exportView');
    var $form = $('#exportDataForm');
    var $gridView = $exportView.find('.gridItems');
    var $targetTypeList = $('#targetTypeList');
    var $targetTypeInput = $targetTypeList.find('.text');
    var $nameInput = $('#targetName');

    ExportTarget.setup = function() {

        xcHelper.dropdownList($targetTypeList, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }
                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                $targetTypeInput.val($li.text()).removeClass('hint');
            },
            "container": "#exportDataForm"
        });

        $exportView.find('.refresh').click(function() {
            ExportTarget.restore();
        });

        $gridView.on("click", ".grid-unit", function(event) {
            event.stopPropagation(); // stop event bubbling
            var $grid = $(this);

            $gridView.find(".active").removeClass("active");
            $grid.addClass("active");
        });

        $form.submit(function(event) {
            event.preventDefault();
            $form.find('input').blur();

            var $submitBtn = $("#exportFormSubmit").blur();
            xcHelper.disableSubmit($submitBtn);

            var targetType = $targetTypeInput.val();
            var name = $nameInput.val().trim();

            ExportTarget.submitForm(targetType, name)
            .then(function() {
                KVStore.commit();
            })
            .fail(function(error) {
                console.error(error);
                // XX fail case being handled in ExportTarget.submitForm
            })
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
            });
        });

        $('#exportFormReset').click(function() {
            $targetTypeInput.addClass('hidden');
        });

        // xxx TEMPORARILY DISABLE THE ENTIRE FORM
        $form.find('input, button').prop('disabled', true)
                                   .css({'cursor': 'not-allowed'});
        $form.find('button').css('pointer-events', 'none')
                            .addClass('btn-cancel');
        $form.find('.iconWrapper').css('background', '#AEAEAE');
        $('#targetTypeList').css('pointer-events', 'none');
    };

    ExportTarget.getTargets = function() {
        return exportTargets;
    };

    ExportTarget.restore = function() {
        xcHelper.showRefreshIcon($exportView.find('.gridViewWrapper'));

        XcalarListExportTargets("*", "*")
        .then(function(targs) {
            var targets = targs.targets;
            var numTargs = targs.numTargets;
            var types = [];
            exportTargets = [];
            for (var i = 0; i < numTargs; i++) {
                var type = DsTargetTypeTStr[targets[i].hdr.type];
                if (type === "file") {
                    type = "Local Filesystem";
                } else if (type === "odbc") {
                    type = "ODBC";
                }
                var typeIndex = types.indexOf(type);
                if (typeIndex === -1) {
                    types.push(type);
                    typeIndex = types.length - 1;
                    exportTargets.push({name: type, targets: []});
                }
                exportTargets[typeIndex].targets.push(targets[i].hdr.name);
                // Here we can make use of targets[i].specificInput.(odbcInput|
                // sfInput).(connectionString|url) to display more information
                // For eg for sfInput, we can now get back the exact location.
                // We no longer require the users to memorize where default
                // points to
            }
            restoreGrids();
        })
        .fail(function(error) {
            Alert.error("Export Target Restoration Failed", error.error);
        });
    };

    ExportTarget.submitForm = function(targetType, name) {
        var deferred = jQuery.Deferred();
        var isValid  = xcHelper.validate([
            {
                "$selector": $targetTypeInput,
                "text"     : ErrorTextTStr.NoEmptyList,
                "check"    : function() {
                    return (targetType === "");
                }
            },
            {
                "$selector": $nameInput,
                "text"     : ErrorTextTStr.NoEmpty,
                "check"    : function() {
                    return (name === "");
                }
            }
        ]);

        if (!isValid) {
            deferred.reject("Invalid Parameters");
            return deferred.promise();
        }

        if (targetType === "Local Filesystem") {
            var path = hostname + ":/var/tmp/xcalar/export/blah.csv";
            XcalarAddLocalFSExportTarget(name, path)
            .then(function() {
                addGridIcon(targetType, name);
                deferred.resolve();
            })
            .fail(function(err) {
                Alert.error("Failed to add export target", err.error);
                deferred.reject(err);
            });
        } else {
            var error = {error: 'Please select a valid target type'};
            Alert.error("Invalid Target Type", error.error);
            deferred.reject(error);
        }

        return (deferred.promise());
    };

    // function hideDropdownMenu() {
    //     $form.find(".dropDownList").removeClass("open")
    //                               .find(".list").hide();
    // }

    function restoreGrids() {
        // return;
        var numTypes = exportTargets.length;
        var gridHtml = "";
        var numGrids;
        for (var i = 0; i < numTypes; i++) {
            var name = exportTargets[i].name;
            var targetTypeId = name.replace(/\s/g, '');
            gridHtml += '<div class="gridIconSection clearfix"' +
                            'id="gridTarget-' + targetTypeId + '">';
            if (i > 0) {
                gridHtml += '<div class="divider clearfix"></div>';
            }
            gridHtml += '<div class="title">' + name +
                            '</div>' +
                            '<div class="gridArea">';
            numGrids = exportTargets[i].targets.length;
            for (var j = 0; j < numGrids; j++) {
                gridHtml += getGridHtml(exportTargets[i].targets[j]);
            }
            gridHtml += '</div>' +
                        '</div>';
        }
        $exportView.find('.gridItems').html(gridHtml);
        numGrids = $exportView.find('.grid-unit').length;
        $exportView.find('.numExportTargets').html(numGrids);

    }

    function getGridHtml(name) {
        var gridHtml = '<div class="ds grid-unit display">' +
                            '<div class="gridIcon"></div>' +
                            '<div class="listIcon">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                            '<div class="label" data-dsname="' + name +
                            '" data-toggle="tooltip" data-container="body"' +
                            ' data-placement="right" title="' + name + '">' +
                                name +
                            '</div>' +
                        '</div>';
        return (gridHtml);
    }

    function addGridIcon(targetType, name) {
        var $gridItems = $exportView.find('.gridItems');
        var $grid = $(getGridHtml(name));
        var targetTypeId = targetType.replace(/\s/g, '');
        // $grid.append('<div class="waitingIcon"></div>');
        if ($('#gridTarget-' + targetTypeId).length === 0) {

            var gridSectionHtml = '<div class="gridIconSection clearfix"' +
                                      'id="gridTarget-' + targetTypeId + '">';

            if ($gridItems.children().length > 0) {
                gridSectionHtml += '<div class="divider clearfix"></div>';
            }

            gridSectionHtml += '<div class="title">' + targetType +
                                      '</div>' +
                                      '<div class="gridArea"></div>' +
                                  '</div>';
            $gridItems.append(gridSectionHtml);

            var targetGroup = {name: targetType, targets: []};
            exportTargets.push(targetGroup);
        }

        var $gridTarget = $('#gridTarget-' + targetTypeId).find('.gridArea');
        $gridTarget.append($grid);
        var groupIndex = $gridTarget.parent().index();
        exportTargets[groupIndex].targets.push(name);

        var numGrids = $exportView.find('.grid-unit').length;
        $exportView.find('.numExportTargets').html(numGrids);
    }

    return (ExportTarget);

}(jQuery, {}));
