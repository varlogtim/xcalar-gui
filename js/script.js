/**
    This file is where all the global variables go, as well as any
    document.ready functions. Any misc functions that kind of applies to the
    entire page and doesn't really have any specific purpose should come here as
    well.
*/

// =================================== Globals =================================
var gNumEntriesPerPage = 20;
var gNewCellWidth = 125;
var gMouseStatus = null;
var gDragObj = {};
var gRescol = {
    minCellHeight: 30,
    cellMinWidth: 30,
    first: true,
    clicks: 0,
    delay: 500,
    timer: null,
    lastCellGrabbed: false,
    minNumRows: 60,
    maxNumRows: 80
};
var resrow = {};
var gScrollbarHeight = 8;
var gTempStyle = ""; // XXX
var gMinTableWidth = 200;
var gTables = []; // This is the main global array containing structures
                  // Stores TableMeta structs
var gHiddenTables = [];
var gFnBarOrigin;
var gActiveTableNum = 0; // The table that is currently in focus
// ================================= Classes ==================================
var ProgCol = function() {
    this.index = -1;
    this.name = "New heading";
    this.type = "Object";
    this.func = {};
    this.width = 0;
    this.userStr = "";
    this.isDark = true;
    this.datasetId = 0;
};

var TableMeta = function() {
    this.tableCols = undefined;
    this.currentPageNumber = -1;
    this.resultSetId = -1;
    this.keyName = "";
    this.backTableName = "";
    this.frontTableName = "";
    this.resultSetCount = -1;
    this.numPages = -1;
    this.bookmarks = [];
}
// ================================ Misc ======================================
function infScrolling(tableNum) {
    var timer;
    $("#xcTableWrap"+tableNum).scroll(function() {
        if (gMouseStatus == "movingTable") {
            return;
        }
        var dynTableNum = parseInt($(this).attr("id")
                           .substring("xcTableWrap".length));
        focusTable(dynTableNum);
        var table = $('#xcTable'+dynTableNum);
        table.find('.colGrab').hide().height(0);
        if (table.height() < $('#mainFrame').height()) {
            // prevent scrolling on a short table
           $(this).scrollTop(0);
        }
        if ($(this).scrollTop() === 0 && 
            table.find('tbody tr:first').attr('class') != 'row0') {
                console.log('the top!');
                var firstRow = table.find('tbody tr:first');
                var initialTop = firstRow.offset().top;
                if (table.find("tbody tr").length > 60) {
                    var pageNumber = gTables[dynTableNum].currentPageNumber-1;
                } else {
                    var pageNumber = gTables[dynTableNum].currentPageNumber;
                }

                goToPage(pageNumber, RowDirection.Top, dynTableNum);
                $('#xcTableWrap'+dynTableNum)
                   .scrollTop(firstRow.offset().top - initialTop + 10);
                table.find("tbody tr:gt(79)").remove();
        } else if ($(this)[0].scrollHeight - $(this).scrollTop()-
                    $(this).outerHeight() <= 1) {
            console.log('the bottom!');
            gTempStyle = table.find("tbody tr:last").html();
            if (table.find('tbody tr').length >= 80) {
                // keep row length at 80
                table.find('tbody tr:lt(20)').remove();
            }
            goToPage(gTables[dynTableNum].currentPageNumber+1,
                     RowDirection.Bottom, dynTableNum);
        }

        clearTimeout(timer);
        timer = setTimeout(function () { 
            adjustColGrabHeight(dynTableNum);  
        } , 300 );

        table.find('.colGrab').show();
        var top = $(this).scrollTop();
        $('#theadWrap'+dynTableNum).css('top',top);
        var rowScrollerMove = true;
        generateFirstLastVisibleRowNum(rowScrollerMove);
        updatePageBar(dynTableNum);
    });
}

// XXX: This function should disappear. But I need to be able to free the
// result sets
function loadMainContent(op) {
    if (window.location.pathname.search("cat_table.html") > -1) {
        freeAllResultSets();
    }
}

function loadLoad(op) {
    $("#loadArea").load('/'+op.concat('_r.html'));
}

function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?')
                 + 1).split('&');
    if (window.location.href.indexOf("?") < 0) {
        return [];
    }
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function prelimFunctions() {
    setTabs();
    selectPage(1);
}

function setTableMeta(table) {
    var urlTableName = getUrlVars()["tablename"];
    var tableName = urlTableName || table;
    var newTable = new TableMeta();
    newTable.tableCols = [];
    newTable.currentPageNumber = 0;
    newTable.resultSetId = XcalarGetTableId(tableName);
    newTable.resultSetCount = XcalarGetCount(tableName);
    newTable.numPages = Math.ceil(newTable.resultSetCount /
                                  gNumEntriesPerPage);
    newTable.backTableName = tableName;
    newTable.frontTableName = tableName;
    return (newTable);
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);

function setupFunctionBar() {
     var functionbar = $('#fnBar');

    functionbar.on('input', function(e) {
        if ($(".scratchpad").has(gFnBarOrigin).length != 0 &&
            $(this).val().indexOf("=") == 0) {
            enterEquationMode();
        }
        if (gFnBarOrigin) {
            gFnBarOrigin.val($(this).val());
        }
    });

    functionbar.keyup(function(e) {
        if (gFnBarOrigin) {
            gFnBarOrigin.val($(this).val());
            gFnBarOrigin.trigger(e);
        }
        if (e.which == keyCode.Enter) {
            $(this).blur();
        }
    });

    functionbar.mousedown(function() {
        var fnBar = $(this);
        // must activate mousedown after header's blur, hence delay
        setTimeout(selectCell, 1);
        function selectCell() {
            if ($(".scratchpad").has(gFnBarOrigin).length == 0 
                && gFnBarOrigin) {
                console.log(fnBar.val());
                // gFnBarOrigin.val(fnBar.val());



                var index = parseColNum(gFnBarOrigin);
                var tableNum = parseInt(gFnBarOrigin.closest('table')
                    .attr('id').substring(7)); 
                if (gTables[tableNum].tableCols[index-1].userStr.length > 0) {
                    gFnBarOrigin.val(gTables[tableNum].tableCols[index-1]
                                     .userStr);
                } 
            }
        }
    });

    functionbar.blur(function() {
        if ($(".scratchpad").has(gFnBarOrigin).length != 0) {
        } else {
            console.log('blurring')
            var selectedCell = $('th.selectedCell .editableHead');
            var index = $('th.selectedCell').index();
            // if (gFnBarOrigin.length !=0) {
            if (!gFnBarOrigin && selectedCell.length !=0) {
                var tableNum = parseInt($('.selectedCell').closest('table')
                .attr('id').substring(7));
                if (gTables[tableNum].tableCols[index-1].name.length > 0) {
                    gFnBarOrigin.val(gTables[tableNum].tableCols[index-1].name);
                } 
            }
        }
         // $('#fnBar').val("");
         // setTimeout(function(){gFnBarOrigin = undefined;},1);
         
    });
}

function setupHiddenTable() {
    var newTableMeta = setTableMeta(table);
    gHiddenTables.push(newTableMeta); 
    var lastIndex = gHiddenTables.length - 1;
    var index = getIndex(gHiddenTables[lastIndex].frontTableName);
    if (index && index.length > 0) {
        gHiddenTables[lastIndex].tableCols = index;
    } else {
        console.log("Not stored "+gHiddenTables[lastIndex].frontTableName);
    }  
}

function  mainPanelsTabing() {
    $('.mainMenuTab').click(function() {
        $('.mainMenuTab').removeClass('active');
        $(this).addClass('active');
        if ($(this).attr('id') == "workspaceTab") {
            $('#datastoreView').hide();
            if ($('#workspacePanel').css('display') == "none") {
                $('#workspacePanel').show();
                for (var i = 0; i < gTables.length; i++) {
                    matchHeaderSizes(i);
                    adjustColGrabHeight(i);
                }
            } 
            
        } else if ($(this).attr('id') == "dataStoresTab") {
            $('#workspacePanel').hide();
            $('#datastoreView').show();
        }
        
    });
}

// ========================== Document Ready ==================================

function documentReadyxcTableFunction() {
    focusTable(0);
    resizeRowInput();

    $('#rowInput').keypress(function(e) {
        if (e.which !== keyCode.Enter) {
            return;
        }
        var row = $('#rowInput').val();
        //XXX detect which table the user means to target
        if (row == "" || row%1 != 0) {
            return;
        } else if (row < 1) {
            $('#rowInput').val('1');
        } else if (row > gTables[gActiveTableNum].resultSetCount) {
            $('#rowInput').val(gTables[gActiveTableNum].resultSetCount);
        }
        row = parseInt($('#rowInput').val());
        // XXX: HACK
        gTempStyle = $("#xcTable"+gActiveTableNum+" tbody tr:nth-last-child(1)").html();
        $("#xcTable"+gActiveTableNum+" tbody").empty();

        if ((row/gNumEntriesPerPage) >
                Math.floor((gTables[gActiveTableNum].resultSetCount/
                            gNumEntriesPerPage)-2)) {
            //if row lives inside last 3 pages, prepare to display last 3 pages
            var pageNum = (gTables[gActiveTableNum].resultSetCount-1)/
                           gNumEntriesPerPage - 2;
        } else {
            var pageNum = row/gNumEntriesPerPage;
        }
        if (pageNum < 0) {
            pageNum = 0;
        }
        var numPagesToAdd = 3;
        for (var i = 0; i < numPagesToAdd; i++) {
            goToPage(Math.ceil(pageNum)+i, null, gActiveTableNum);
        }
        adjustColGrabHeight(gActiveTableNum);
        positionScrollbar(row, gActiveTableNum);
        generateFirstLastVisibleRowNum();
        if (!e.rowScrollerMousedown) {
            moverowScroller(row, gTables[gActiveTableNum].resultSetCount);
        }
        
        // $(this).blur(); 
    });
    generateFirstLastVisibleRowNum();
    var num = Number(gTables[gActiveTableNum].resultSetCount).
                    toLocaleString('en');
    $('#numPages').text('of '+num);
}

function documentReadyGeneralFunction() {
    $(window).on('beforeunload', function() {
        commitToStorage();
    }); 

    var timer;
    $(window).resize(function() {
        $('.colGrab').height(30);
        clearTimeout(timer);
        timer = setTimeout(function () { 
            var i = 0;
            $('.xcTable').each(function() {
                adjustColGrabHeight(i);
                i++;
            });
        }, 100 );
        checkForScrollBar(0);
        generateFirstLastVisibleRowNum();
    });

    //XXX using this to keep window from scrolling on dragdrop
    $(window).scroll(function() {
        $(this).scrollLeft(0);
    })

    $('.closeJsonModal, #modalBackground').click(function() {
        if ($('#jsonModal').css('display') == 'block') {
            $('#modalBackground').hide(); 
            $('body').removeClass('hideScroll');
        }
        $('#jsonModal').hide();
    });

    $('.jsonDragArea').mousedown(function(event) {
        jsonModalMouseDown(event);
    });

    $(document).mousedown(function(event) {
        var target = $(event.target);
        var clickable = target.closest('.colMenu').length > 0;
        if (!clickable && !target.is('.dropdownBox')) {
                $('.colMenu').hide();
                $('.theadWrap').css('z-index', '9');
        }
        if (target.closest('.selectedCell').length == 0 
            && target.closest('#scratchpadArea').length == 0
            && !target.is('#fnBar')
            && (!equationCellRow)) {
            $('.selectedCell').removeClass('selectedCell');
            gFnBarOrigin = undefined;
            $('#fnBar').val("");
        }
    });
    $(document).mousemove(function(event) {
        if (gMouseStatus == null) {
            return;
        }

        switch (gMouseStatus) {
            case ("resizingCol"):
                if (gRescol.lastCellGrabbed) {
                    gRescolMouseMoveLast(event);
                } else {
                    gRescolMouseMove(event);
                }
                break;
            case ("resizingRow"):
                resrowMouseMove(event);
                break;
            case ("movingTable"):
                dragTableMouseMove(event);
                break;
            case ("movingCol"):
                dragdropMouseMove(event);
                break;
            case ("movingJson"):
                jsonModalMouseMove(event);
                break;
            default:  // do nothing
        }
    });
    $(document).mouseup(function(event) {
        if (gMouseStatus == null) {
            return;
        }
        switch (gMouseStatus) {
            case ("resizingCol"):
                gRescolMouseUp();
                break;
            case ("resizingRow"):
                resrowMouseUp();
                break;
            case ("movingTable"):
                    dragTableMouseUp();
                    break;
            case ("movingCol"):
                dragdropMouseUp();
                break;
            case ("movingJson"):
                jsonModalMouseUp();
                break;
            default: // do nothing
        }
    });
}

function documentReadyCatFunction(tableNum) {
    var index = getIndex(gTables[tableNum].frontTableName);
    getNextPage(gTables[tableNum].resultSetId, true, tableNum);
    if (index && index.length > 0) {
        gTables[tableNum].tableCols = index;
        // console.log("Stored "+gTables[tableNum].frontTableName);
        // XXX Move this into getPage
        // XXX API: 0105
        var tableOfEntries = XcalarGetNextPage(gTables[tableNum].resultSetId,
                                               gNumEntriesPerPage);
        gTables[tableNum].keyName = tableOfEntries.keysAttrHeader.name;
        for (var i = 0; i<index.length; i++) {
            if (index[i].name != "DATA") {
                addCol("col"+(index[i].index-1), 
                        "xcTable"+tableNum, 
                        index[i].name,
                      {width: index[i].width,
                       isDark: index[i].isDark,
                       progCol:index[i]});
            } else {
                $("#xcTable"+tableNum+" .table_title_bg.col"+
                    (index[i].index))
                    .css("width",index[i].width);
            }
        }
    } else {
        console.log("Not stored "+gTables[tableNum].frontTableName);
    }    

    for (var i = 0; i<gTables[tableNum].tableCols.length; i++) {
        if (gTables[tableNum].tableCols[i].name == "DATA") {
            // We don't need to do anything here because if it's the first time
            // they won't have anything stored. If it's not the first time, the
            // column would've been sized already. If it's indexed, we
            // would've sized it in CatFunction
        } else { 
            execCol(gTables[tableNum].tableCols[i], tableNum);
        }
    }
}

function startupFunctions() {
    readFromStorage();
    documentReadyGeneralFunction();
    setupRightSideBar();
    setupDatasetList();
    mainPanelsTabing();
    setupFunctionBar();
    scratchpadStartup(); 
    setupDSCartButtons();
    setupImportDSForm();
    setupBookmarkArea();
    updateDatasetInfoFields("Datasets", IsActive.Active);
}  

function tableStartupFunctions(table, tableNum) {
    var newTableMeta = setTableMeta(table);
    gTables[tableNum] = newTableMeta;
    documentReadyCatFunction(tableNum);
    goToPage(gTables[tableNum].currentPageNumber+1, null, tableNum);
    goToPage(gTables[tableNum].currentPageNumber+1, null, tableNum);
    cloneTableHeader(tableNum);
    focusTable(tableNum);
    var dataCol = $('#xcTable'+tableNum+' tr:eq(1) th.dataCol');
    addColListeners(parseColNum(dataCol), "xcTable"+tableNum);
    generateFirstLastVisibleRowNum();
    infScrolling(tableNum);
    checkForScrollBar(tableNum);
    resizeRowInput();
}      

function documentReadyIndexFunction() {
    $(document).ready(function() {
        startupFunctions(); 
        if ($.isEmptyObject(gTableIndicesLookup)) {
            generateBlankTable();
        } else {
            var tableNum = 0;
            for (table in gTableIndicesLookup) {
                if (gTableIndicesLookup[table].active) {
                    addTable(table, tableNum);
                    tableNum++;
                } else {
                    setupHiddenTable(table);
                }
            }
            documentReadyxcTableFunction();
        }
        setupLeftMenuBar();
        initializeJoinModal();
    });
}

function parseJsonValue(value) {
    if (value == undefined) {
        value = '<span class="undefined">'+value+'</span>';
    } else {
        switch (value.constructor) {
        case (Object):
            if ($.isEmptyObject(value)) {
                value = "";
            } else {
                value = JSON.stringify(value).replace(/,/g, ", ");
            }
            break;
        case (Array):
            value = value.join(', ');
            break;
        default: // leave value as is;
        }
    }
    return (value);
}

//XXX remove this for production. I updated load_r.html
// but the jquery load function loads the old load_r.html 
// unless I use ajaxSetup cache: false;
$.ajaxSetup ({
    // Disable caching of AJAX responses
    cache: false
});
