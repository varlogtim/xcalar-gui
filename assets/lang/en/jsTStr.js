StatusMessageTStr = {
    'Success' : 'Success!',
    'Completed' : 'Completed',
    'Viewing' : 'Viewing',
    'Error' : 'Error encountered',
    'Canceling': 'Canceling',
    'CancelSuccess': 'Cancellation Successful',
    'CancelFail': 'Cancellation Failed',
    'Loading' : 'Loading',
    'LoadingDataset' : 'Pointing to Data Source',
    'LoadingTables': 'Loading Tables',
    'LoadFailed' : 'Point to data source failed',
    'CreatingTable' : 'Creating table',
    'TableCreationFailed' : 'Table creation failed',
    'Join' : 'Joining tables',
    'JoinFailed' : 'Join table failed',
    'JoinFailedAlt' : 'Join failed',
    'DeleteTable' : 'Dropping table',
    'DeleteTableFailed': 'Drop table(s) failed',
    'DeleteConstFailed': 'Drop aggregate(s) failed',
    'PartialDeleteTableFail': 'Some tables could not be deleted',
    'PartialDeleteConstFail': 'Some aggregates could not be deleted',
    'CouldNotDelete' : 'Could not be deleted',
    'ExportTable' : 'Exporting table',
    'ExportFailed' : 'Export failed',
    'Aggregate' : 'Performing Aggregate',
    'AggregateFailed' : 'Aggregate failed',
    'SplitColumn': 'Split column',
    'SplitColumnFailed': 'Split column failed',
    'ChangeType': 'Change data type',
    'ChangeTypeFailed': 'Change data type failed',
    'OnColumn' : 'on column',
    'Sort' : 'Sorting column',
    'SortFailed' : 'Sort column failed',
    'Map' : 'Mapping column',
    'MapFailed' : 'Map failed',
    'GroupBy' : 'Performing Group By',
    'GroupByFailed' : 'Group By failed',
    'Filter' : 'Filtering column',
    'FilterFailed' : 'Filter column failed',
    'FilterFailedAlt' : 'Filter failed',
    'Profile' : 'Profile of',
    'ProfileFailed' : 'Profile failed',
    'Project': 'Projecting Columns',
    'ProjectFailed': 'Projection Failed',
    'Ext': 'Performing Extension <extension>',
    'ExtFailed': 'Performing Extension Failed',
    'StoredProc': 'Performing Stored Procedure',
    'StoredProcFailed': 'Stored Procedure execution failed'
};

TooltipTStr = {
    'ComingSoon': 'Coming Soon',
    'FocusColumn': 'Focused Column',
    'ChooseUdfModule': 'Please choose a module first', // used in htmltstr
    'ChooseColToExport': 'Please select the columns you want to export',
    'SuggKey': 'Suggested Key',
    'NoWSToMV': 'No worksheet to move to',
    'NoUndoNoOp': 'No operation to undo',
    'NoRedo': 'No operation to redo',
    'UnhideWS': 'Unhide worksheet',
    'LockedTableUndo': 'Cannot undo while table is locked',
    'LockedTableRedo': 'Cannot redo while table is locked',
    'CloseQG': 'Click to hide dataflow graph',
    'OpenQG': 'Click to view dataflow graph',
    'SaveQG': 'Save image',
    'NewTabQG': 'Open image in new tab',
    'AddDataflow': 'Create batch dataflow',
    'Bookmark': 'Click to add bookmark',
    'Bookmarked': 'Bookmarked',
    'CopyLog': 'Copy the SQL log onto your clipboard',
    'GenBundle': 'Generate Support Bundle',
    'ColPrefix': 'Columns will be prepended with prefixes to uniquely identify a column within a table. Prefix is auto-generated by default.',
    'ToGridView': 'Switch to Grid View',
    'ToListView': 'Switch to List View',
    'ClickCollapse': 'Click to collapse',
    'CollapsedTable': '1 table is collapsed',
    'SelectAllColumns': 'Select all columns',
    'ViewColumnOptions': 'View column options',
    'ViewTableOptions': 'View table options',
    'RemoveQuery': 'Remove query',
    'CancelQuery': 'Cancel query',
    'AlreadyIcv': 'This table is already an ICV table',
    'ParamValNoChange': 'This parameter value cannot be changed',
    'LowMemory': 'Warning! You are running low on space.',
    // Sync with htmlTStr
    "IcvRestriction": 'ICV only available for Map and Group By',

    // with replace
    'CollapsedTables': '<number> tables are collapsed',
    'DroppedTable': 'Table \'<tablename>\' has been dropped',
    'NoExport': 'Cannot export column of type <type>',
    'Undo': 'Undo: <op>',
    'NoUndo': 'Last operation is "<op>", cannot undo',
    'Redo': 'Redo: <op>'
};

CommonTxtTstr = {
    'ArrayVal': 'Array Value',
    'Back': 'Back',
    'BackToOrig': 'Back to original',
    'ClickToOpts': 'Click to see options',
    'Continue': 'Continue',
    'Copy': 'Copy',
    'CopyLog': 'Copy log',
    'Create': 'Create',
    'DefaultVal': 'Default value',
    'Exit': 'Exit',
    'GenBundle': 'Generate Bundle',
    'GenBundleDone': 'Bundle Generated',
    'GenBundleFail': 'Bundle Generated Failed',
    'HoldToDrag': 'Click and hold to drag',
    'Immediates': 'Derived Field',
    'InP': 'In progress',
    'LeaveWarn': 'You are leaving Xcalar',
    'LogOut': 'Log Out',
    'LogoutWarn': 'You have unsaved changes, please save or you may lose your' +
                ' work.',
    'NA': 'N/A',
    'NEWCOLUMN': 'NEW COLUMN',
    'NEXT': 'NEXT',
    'NumCol': 'Number of columns',
    'OpFail': 'Operation Failed',
    'Optional': 'Optional',
    'Preview': 'Preview',
    'Rename': 'Rename',
    'SAVE': 'SAVE',
    'StartTime': 'Start Time',
    'SupportBundle': 'Support Bundle Generated',
    'SupportBundleInstr': 'Please check your backend for a .tar.gz file',
    'Value': 'Value',
    'XcWelcome': 'Have fun with Xcalar Insight!',

    // with replace
    'SupportBundleMsg': 'Support upload bundle id <id> successfully generated' +
                        '! It is located on your Xcalar Server at <path>'
};

ErrTStr = {
    'Unknown': 'Unknown Error',
    'NoEmpty': 'Please fill out this field.',
    'PositiveInteger' : 'Please Enter a positive Integer as number of Runs',
    'InvalidField': 'Invalid Field.',
    'InvalidFilePath': 'Invalid file path.',
    'InvalidFile': 'Please select a file or a folder',
    'InvalidTableName': 'Table name cannot contain any of the ' +
                        'following characters: *#\'\": or starting or ending spaces',
    'NoHashTag': 'Please input a valid name with no # symbols.',
    'NoSpecialChar': 'Please input a valid name with no special characters.',
    'NoSpecialCharOrSpace': 'Please input a valid name with no special' +
                            ' characters or spaces.',
    'NoSpecialCharInParam': 'No special characters or spaces allowed within' +
                            ' parameter braces.',
    'UnclosedParamBracket': 'Unclosed parameter bracket detected.',
    'NoEmptyList': 'Please choose an option on the dropdown list.',
    'NoEmptyFn': 'There are no function definitions to upload.',
    'NoEmptyOrCheck': 'Please fill out this field ' +
                        'or keep it empty by checking the checkbox.',
    'NameInUse': 'Name is in use, please choose another name.',
    'DSNameConfilct': 'Dataset reference with the same name already exits. ' +
                        'please choose another name.',
    'DSStartsWithNum': 'Dataset reference name cannot start with number.',
    'PrefixStartsWithNum': 'Prefix cannot start with number.',
    'TableConflict': 'A table with the same name already exists, ' +
                        'please choose another name.',
    'ExportConflict': 'This file name is taken, please choose another name.',
    'ColumnConflict': 'A column with the same name already exists, ' +
                        'please choose another name.',
    'PrefixConflict': 'A prefix with the same name already exists, ' +
                      'please choose another name.',
    'DFConflict': 'A dataflow with the same name already exists, ' +
                            'please choose another name.',
    'DFNameIllegal': 'Only names with a-z, A-Z, 0-9, - and _ are allowed.',
    'InvalidWSInList': 'Invalid worksheet name, please choose a ' +
                        'worksheet from the pop up list.',
    'OnlyNumber': 'Please input a number.',
    'OnlyInt': 'Please input an integer.',
    'OnlyPositiveNumber': 'Please input a number bigger than 0.',
    'NoNegativeNumber': 'Please input a number bigger than or equal to 0',
    'NoAllZeros': 'Values cannot all be zeros',
    'NoWKBKSelect': 'Please select a workbook',
    'NoWS': 'This worksheet is deleted, please choose another worksheet',
    'NoSelect': 'Please select an option from the dropdown list',
    'NoGroupSelect': 'No group selected.',
    'InvalidColName': 'Invalid column name.',
    'ColInModal': 'Please input a column name that starts with $',
    'NoMultiCol': 'This field only accept one column.',
    'NoBucketOnStr': 'Column type is string, cannot bucket into range.',
    'ParamInUse': 'Cannot delete, this parameter is in use.',
    'NoPreviewExcel': 'Excel files are not previewable, ' +
                      'please point to data directly without previewing.',
    'MVFolderConflict': 'Cannot move, name conflicts with files in target ' +
                        'folder',
    'TimeExpire': 'Please choose a time that is in the future.',
    'LongFileName': 'File Name is too long, please use less than 255 chars.',
    'LargeFile': 'File is too large. Please break into smaller files(<10MB).',
    'NoSupportOp': 'This operation is not supported.',
    'PreservedName': 'This name is preserved, please use another name.',
    'InvalidWin': 'Cannot window an unsorted table',
    'InvalidQuery': 'Query Failed',
    'BracketsMis': 'Your function string has mismatched brackets.',
    'InvalidFunction': 'Invalid function',
    'TooLong': 'Please use fewer than 255 characters.',
    'PrefixTooLong': 'Please fewer than 20 characters.',
    'NoTable': 'Table doesn\'t exists',
    'TablesNotDeleted': 'The following tables were not deleted:',
    'ConstsNotDeleted': 'The following aggregates were not deleted:',
    'NoTablesDeleted': 'No tables were deleted.',
    'NoConstsDeleted': 'No aggregates were deleted.',
    'LargeImgSave': 'Unable To Save Image',
    'LargeImgTab': 'Unable To Open Image',
    'LargeImgText': 'Image exceeds your browser\'s maximum allowable size',
    'DFNoExpand': 'This dataflow graph has reached your browser\'s maximum ' +
                  'allowable size.',
    'InvalidExt': 'Invalid Extension',
    'InvalidExtParam': 'Invalid Extension Parameters',
    'InvalidOpNewColumn': 'Cannot perform this operation on a new column.',
    'SuggestProject': 'Please project to reduce the number of columns and ' +
                      'retry.',
    'UserCanceled': 'User Canceled',
    'NoColumns': 'No Columns Selected',
    'NoCast': 'No columns to cast.',
    'NoTypeChange': 'Please change at least one column\'s type to apply the cast.',
    'IcvFailed': 'Failed to generate ICV table',
    'IcvAlt': 'Failed to generate ICV table. Please use map with show ' +
              'erroneous values selected instead.',
    'RetinaFormat': 'File must be of the format .tar.gz',
    'RetinaFailed': 'Failed to upload retina',
    'ConfigParamNotFound': 'Parameter not found.',

    // With replace
    'WorkbookExists': 'A workbook named <workbookName> already exists. Please' +
                      ' choose another name.',
    'InvalidColumn' : 'Invalid column name: <name>'
};

ErrWRepTStr = {
    'FolderConflict': 'Folder "<name>" already exists, ' +
                        'please choose another name.',
    'ParamConflict': 'Parameter "<name>" already exists, ' +
                    'please choose another name.',
    'TableConflict': 'Table "<name>" already exists, ' +
                        'please choose another name.',
    'NoPath': '<path> was not found. Redirected to the root directory.',
    'NoFile': 'File <file> was not found in the directory.',
    'InvalidOpsType': 'Invalid type for the field,' +
                      ' wanted: <type1>, but provided: <type2>.',
    'InvalidCol': 'Column "<name>" does not exist.',
    'InvalidColOnTable': 'Column "<col>" does not exist in table <table>.',
    'InvalidRange': 'Please enter a value between <num1> and <num2>.',
    'InvalidColType': 'Column "<name>" has an invalid type: <type>',
    'NoLessNum': 'Please enter a value bigger than or equal to <num>',
    'NoBiggerNum': 'Please enter a value less than or equal to <num>',
    'TableNotDeleted': 'Table <name> was not deleted.',
    'ConstNotDeleted': 'Aggregate <name> was not deleted.',
    'AggConflict': 'Aggregate <aggPrefix>"' + '<name>" already exists, ' +
                    'please choose another name.',
    'OutputNotFound': '<name> Not Found',
    'OutputNotExists': '<name> no longer exists.',
    'InvalidAggName': 'Aggregate name must be prefixed with <aggPrefix>',
    'InvalidAggLength': 'Aggregate name must be prefixed with <aggPrefix>' +
                        ' and followed by the name'
};

TipsTStr = {
    'Scrollbar': 'Scroll Table Here',
    'DataType': 'Data Type',
    'LineMarker': 'Click row number to add bookmark',
    'JSONEle': 'Double-click to view, then click on key names to pull columns',
    'DragGrid': 'You can drag dataset refs or folders around to reorder',
    'DSTable': 'Click table header to add/remove columns to/from ' +
        'data cart. Click on column headings to further modify the column.',
    'DSCart': 'Datacart area, you can add columns from datasets into your ' +
                'cart. These columns will be used to create the table in your' +
                ' active worksheet. You can also pull out columns in the' +
                ' worksheet screen.',
    'TablList': 'Click to see details',
    'PullColumn': 'Click key to add the column to your table'
};

ThriftTStr = {
    'CCNBEErr': 'Connection error',
    'CCNBE': 'Connection could not be established.',
    'UpdateErr': 'Xcalar Version Mismatch',
    'Update': 'Update required.',
    'SetupErr': 'Setup Failed',
    'ListFileErr': 'List Files Failed',
    'SessionElsewhere': 'Different Node Detected',
    'LogInDifferent': 'Please login as a different user. ' +
                      'One user can only be logged in at one location.'
};

AlertTStr = {
    'Title': 'Warning',
    'Error': 'Error',
    'ErrorMsg': 'Error Occurred!',
    'NoDel': 'Cannot Delete',
    'ContinueConfirm': 'Are you sure you want to continue?',
    'BracketsMis': 'Mismatched Brackets',
    'NoExt': 'Unknown Extension',
    'CLOSE': 'CLOSE',
    'CANCEL': 'CANCEL',
    'CONFIRMATION': 'CONFIRMATION'
};

FnBarTStr = {
    'NewCol': 'Please specify the new column name and press enter.',
    'InvalidOpParen': 'Operation must be preceeded by operator name and ' +
                      'arguments in parenthesis.',
    'ValidOps': 'Valid operators are: <b>pull, map, filter</b>.',
    'DiffColumn': 'The selected column (<colName>) is not included ' +
                    'in this operation. Do you want to continue?',
    'NewColTitle': 'New Column Required',
    'NewColMsg': 'Please create a new column to perform a map.',
    // with replace
    'InvalidNumParens': 'Your function string should take the form ' +
                        'of <operation> (eq(2, 3))'
};

ScrollTStr = {
    'Title': 'scroll to a row',

    // with replace
    'BookMark': 'Row <row>'
};

OpFormTStr = {
    'NewColName': 'New column name for the group by resultant column'
};

AggTStr = {
    'NoSupport': 'Not Supported',
    'DivByZeroExplain': 'Only one distinct value',
    'NoCorr': 'No columns of type number for correlation',
    'NoAgg': 'No columns of type number for quick aggregation',

    // with replace
    'AggTitle': 'Aggregate: <op>',
    'AggInstr': 'This is the aggregate result for column "<col>". ' +
                '\r\n The aggregate operation is "<op>".',
    'AggMsg': '{"Value":<val>}'
};

IndexTStr = {
    'Sorted': 'Table already sorted',
    'SuggTitle': 'Sort Suggestion',
    'SuggMsg': 'This column can be sorted either numerically or ' +
               'alphabetically. How would you like to sort?',
    'CastToNum': 'Numerically',
    'NoCast': 'Alphabetically',

    // with replace
    'SortedErr': 'Current table is already sorted on this column in <order> ' +
                 'order',
    'SuggInstr': 'Select "Numerically" to cast the column to <type> ' +
                 'before sorting in numerical order. Non-numeric rows are ' +
                 'deleted during the sort.'
};

JoinTStr = {
    'NoLeftTable': 'Select left table first',
    'NoRightTable': 'Select right table first',
    'NoKeyLeft': 'Left table has no selected key',
    'NoKeyRight': 'Right table has no selected key',
    'NoMatchLeft': 'Sorry, cannot find a good key to match the left table',
    'NoMatchRight': 'Sorry, cannot find a good key to match the right table',
    'NoColToCheck': 'No available column names to check',
    'InvalidClause': 'Invalid Clause to join',
    'TypeMistch': 'Left selected column and right selected column has type ' +
                  'mismatch, cannot join',
    'EstimateJoin': 'Estimate join size',
    'EstimatedJoin': 'Estimated join size',
    'EstimatingJoin': 'Estimating join size...',
    'Estimating': 'Estimating...',
    'JOIN': 'JOIN',
    'ModifyDesc': 'Would you like to modify the join?',

    //with replace
    'NoJoin': 'Cannot join <type>',
    'MismatchDetail': 'Cannot join column of type <type1> with column of type ' +
                     '<type2>'
};

ExportTStr = {
    'Success': 'Export Successful',
    'InvalidType': 'Invalid type selected',

    // With replace
    'SuccessMsg': 'File Name: <file>\n File Location: <location>',
    'SuccessInstr': 'Table \"<table>\" was succesfully exported to <location>' +
                    ' under the name: <file>',
    'ExportOfCol': 'Export columns of <table>',
    'ListTargFail': 'List Targets Failed',
    'LocalFS': 'Local File System'

};

ProfileTStr = {
    'Instr': 'Hover on the bar to see details. Use scroll bar and input box ' +
             'to view more data.',
    'LoadInstr': 'Please wait for the data preparation, you can close the ' +
                 'modal and view it later.',

    // With replace
    'Info': "Profile of column: <b><col></b>, type: <b><type></b>"
};

WKBKTStr = {
    'NoWkbk': 'No workbook for the user',
    'NoMeta': 'No Meta',
    'Location': 'Workbook Browser',
    'NewWKBK': 'New Workbook',
    'NewWKBKInstr': 'Get started with Xcalar Insight by creating a new ' +
                    'workbook. Give your new workbook a name and click on ' +
                    'the Create Workbook Button. Once the workbook is ' +
                    'created, mouse over it and click on the Play button to ' +
                    'get started with your new Workbook. Alternatively, ' +
                    'start with one of Xcalar Insight\'s tutorials to learn ' +
                    'more.',
    'CurWKBKInstr': 'To continue with your currently active workbook, hover ' +
                    'over the card with a blue background and click on the ' +
                    'play button. You can switch to another workbook by ' +
                    'hovering over the other workbook and click on the ' +
                    'play button. To create a duplicate of any of the ' +
                    'workbooks, hover over the workbook card and click on ' +
                    'the duplicate button.',
    'NoOldWKBK': 'Cannot Retrieve Old Workbook',
    'NoOldWKBKInstr': 'If you still see the error after re-login, ' +
                      'please copy your log and restart the server.',
    'NoOldWKBKMsg': 'Please Use new workbook or logout and try again!',
    'Expire': 'Please Log out',
    'ExpireMsg': 'You are logged in somewhere else!',
    'Hold': 'Login Warning',
    'HoldMsg': 'You are logged in somewhere else. Continuing to log in might ' +
               'cause you to lose unsaved work.',
    'Release': 'Continue login',
    'WKBKnotExists': 'No workbooks exist',
    "Activate": "Activate Workbook",
    "ReturnWKBK": "Return To Workbook",
    "EditName": "Edit Workbook Name",
    "Duplicate": "Duplicate Workbook",
    "Delete": "Delete Workbook",
    "DelErr": "Error occurred in deleting workbook",
    "CreateErr": "Error occurred when creating workbook",
    // With replace
    'Conflict': 'Workbook "<name>" already exists, ' +
                'please choose another name.',
    'Active': 'Active',
    'Inactive': 'Inactive',
    'Createby': 'Created by',
    'CreateOn': 'Created on',
    'Modified': 'Last modified',
    'WS': 'Worksheets',
    'Status': 'Status',
    'Creating': 'Creating Workbook'
};

MonitorTStr = {
    'Monitor': 'Monitor',
    'System': 'System',
    'Queries': 'Queries',
    'Setup': 'Setup',
    'Settings': 'Settings',
    'SupportTools': 'Support Tools',
    'Ext': 'Extension',
    "ConfigParamName": "Config Parameter Name",
    "CurVal": "Current Value",
    "NewVal": "New Value",
    'ParamConfigFailed': 'Parameter Configuration Failed',
    'SavingSettingsFailed': 'Saving Settings Failed',
    'StartNodeFailed': 'Start cluster failed',
    'StopNodeFailed': 'Stop cluster failed',
    'RestartFailed': 'Restart cluster failed',
    'GetStatusFail': 'Could not get status',
    'GetLogsFail': 'Could not get logs',
    'RemoveSessionFail': 'Could not remove sessions',
    'StopStreamFail': 'Error',
    'StartStreamFail': 'Could not start stream',
    'NotAuth': 'Not authorized to perform this command.',
    'StartNodes': 'Start Cluster',
    'StopNodes': 'Stop Cluster',
    'RestartNodes': 'Restart Cluster',
    'UseXcalarAs': 'Use Xcalar As',
    'RELEASEMEM': 'RELEASE MEMORY',
    'ReleaseMem': 'Release Memory',
    'ClusterStatus': 'Cluster Status',
    // with replace
    'ParamConfigFailMsg': 'Could not set parameter <b><name></b> to ' +
                          '<b><value></b>.',
    'NodeConfirmMsg': 'Are you sure you want to <type> the cluster?',
    'SwitchUserMsg': 'Are you sure you want to use Xcalar as <username>?'
};

SchedTStr = {
    'SelectSched': 'Select a schedule',
    'NoScheds': 'No available schedules',
    'AddSchedFail': 'Add schedule failed',
    'UpdateFail': 'Update Schedule Failed',
    'NotScheduled': 'not scheduled',
    'Scheduled': 'scheduled',
    "SchedTitle": "SCHEDULER/SCHEDULES",
    'DelSched': "Permanently Delete Schedule",
    'DelSchedMsg': "Are you sure you want to permanently delete " +
                 "this schedule? This action cannot be undone.",
};

DFGTStr = {
    'AddParamHint': 'Please create parameters in Dataflow Panel first.',
    'DFCreateFail': 'Dataflow Creation Failed',
    'ParamModalFail': 'Parameter Creation Failed',
    'UpdateParamFail': 'Update Parameters Failed',
    'NoDFG1': 'No dataflows added',
    'NoDFG2': 'Add a dataflow in Query Graph',
    'RunDone': 'Run Complete',
    'RunDoneMsg': 'Successfully ran DFG!',
    'RunFail': 'Run DFG Failed',
    "DFGTitle": "SCHEDULER/DATAFLOW",
    "PointTo": "File Path",
    "ExportTo": "Export As",
    "DelDFG": "Permanently Delete Dataflow",
    "DelDFGMsg": "Are you sure you want to permanently delete " +
                 "this dataflow? This action cannot be undone.",
    "DownloadErr": "Download Failed",
    "CannotCreate": "Cannot Create Batch Dataflow",
    "CannotCreateMsg": "Cannot create a batch dataflow from a table " +
                        "originating from a dataflow."
};

DFTStr = {
    'AddParamHint': 'Please create parameters in Dataflow Panel first.',
    'DFCreateFail': 'Dataflow Creation Failed',
    'ExportFileExists': 'Export file already exists.',
    'ParamModalFail': 'Parameter Creation Failed',
    'UpdateParamFail': 'Update Parameters Failed',
    'NoDF1': 'No dataflows added',
    'NoDF2': 'Add a dataflow in Dataflow Graph',
    'Cancel': 'Cancel batch dataflow',
    'CancelSuccessMsg': 'Cancellation of batch dataflow was successful.',
    'Run': 'Run batch dataflow',
    'Running': 'Running batch dataflow',
    'RunDone': 'Run Complete',
    'RunDoneMsg': 'Successfully ran dataflow!',
    'RunFail': 'Run DF Failed',
    "DFTitle": "DATAFLOW",
    "PointTo": "File Path",
    "ExportTo": "Export As",
    "DelDF": "Permanently Delete Dataflow",
    "DelDFMsg": "Are you sure you want to permanently delete " +
                 "this dataflow? This action cannot be undone.",
    "DownloadErr": "Download Failed",
    "AdvancedOpts": "Advanced Export Options",
    "Default": "Export to file system",
    "Import": "Export as a Xcalar table",
    "FindTable": "The final table <table> is in the worksheet"
};

DSTStr = {
    'UnknownUser': 'Unknown User',
    'DS': 'DATASET',
    'IN': 'DATASTORE/IN',
    'OUT': 'DATASTORE/OUT',
    'Export': 'EXPORT FORM',
    'DelDS': 'Delete Dataset Reference',
    'DelDSFail': 'Delete Dataset Reference Failed',
    'NewFolder': 'New Folder',
    'NoNewFolder': 'Cannot Create Folder',
    'NoNewFolderMsg': 'This folder is uneditable, cannot create new folder here',
    'DelFolder': 'Delete Folder',
    'DelFolderInstr': 'Please remove all the dataset references in the ' +
                      'folder first.',
    'DelFolderMsg': 'Unable to delete non-empty folders. Please ensure\r\n' +
                    ' that all datasets have been removed from folders prior' +
                    ' to deletion.',
    'NoParse': 'Cannot parse the dataset.',
    'NoRecords': 'No records in dataset.',
    'NoColumns': 'No Columns Selected',
    'NoRecrodsHint': 'Please change the preview size and try to point again',
    'CancalPoint': 'Cancel Point to dataset',
    'DSSourceHint': 'Please try another path or use another protocol',
    'FileOversize': 'Too many files in the folder, cannot read, please load with the url directly',
    'InvalidHDFS': 'Invalid HDFS path, valid format is: "hostname/pathToFile"',
    'Excel': "EXCEL",
    'Home': 'Home',

    // With replace
    'DelDSConfirm': 'Are you sure you want to delete dataset reference <ds> ?',
    'DelUneditable': 'This <ds> is uneditable, cannot delete',
    'CancelPointMsg': 'Are you sure you want to cancel pointing dataset ' +
                      'reference <ds> ?',
    'LoadErr': 'Error: <error>, Error File: <file>',
    'TableName': 'Table Name',
    'ColPrefix': 'Column Prefix',
    'ShowAdvOpt': 'Show Advanced Option',
    'HideAdvOpt': 'Hide Advanced Option',
    'PointErr': 'Cannot Point to the dataset',
    'OffsetErr': 'Offset is bigger than the dataset size'
};

DSFormTStr = {
    'InvalidDelim': 'Invalid delimiter.',
    'InvalidQuote': 'Cannot have more than 1 quote character',
    'NoParseJSON': 'Cannot parse data as json',
    'GoBack': 'Please click the \"BACK\" button to re-enter a valid path or user a valid path pattern',
    'NoData': 'No data',
    'CreateWarn': 'Too Many Columns To Create',
    'CreateWarnMsg': 'Create table with too many columns from dataset ' +
                'reference might be slow, are you sure you want to continue?'
};


DSExportTStr = {
    'ExportFail': 'Failed to add export target',
    'InvalidType': 'Invalid Target Type',
    'InvalidTypeMsg': 'Please select a valid target type',
    'RestoreFail': 'Export Target Restoration Failed',
    'DeleteFail': 'Target Deletion Failed',
    'DeleteExportTarget': 'DELETE EXPORT TARGET',

    // with replace
    'DeleteConfirmMsg': 'Are you sure you want to delete <target>?'
};

WSTStr = {
    'SearchTableAndColumn': 'Search for a table or column',
    'WSName': 'Worksheet Name',
    'WSHidden': 'worksheet is hidden',
    'InvalidWSName': 'Invalid worksheet name',
    'InvalidWSNameErr': 'please input a valid name!',
    'AddOrphanFail': 'Add Temporary Table Failed',
    'NewWS': 'New Worksheet',
    'DelWS': 'Delete Worksheet',
    'DelWSMsg': 'There are active tables in this worksheet. ' +
                'How would you like to handle them?'
};

UDFTStr = {
    "UDF": "UDF",
    "Edit": "Edit UDF",
    "Del": "Delete UDF",
    "Download": "Download UDF",
    "DelTitle": "Delete UDF",
    "DelMsg": "Are you sure you want to delete the udf module?",
    "DelFail": "Delete UDF Failed"
};

TblTStr = {
    'Create': 'Create Table',
    'Del': 'Drop Tables',
    'DelMsg': 'Are you sure you want to drop table <table>?',
    'DelFail': 'Drop Tables Failed',
    'Archive': 'Hide Tables',
    'Active': 'Send Tables to Worksheet',
    'ActiveFail': 'Active Tables Failed',
    'Truncate': 'Additional characters were truncated'
};

ColTStr = {
    'SplitColWarn': 'Many Columns will generate',
    'RenameSpecialChar': 'Invalid name, cannot contain ^\\,\.\'()[]\":or ' +
                        'starting or ending spaces',
    'RenameSpecialCharAgg': 'Invalid name, cannot contain \\,\.\'()[]\":or ' +
                            'starting or ending spaces or ^ in the middle',
    'RenameStartNum': 'Invalid name, cannot begin with a number',
    'ImmediateClash': 'Invalid name, name already exists in at least one ' +
                      'DATA cell',
    // With Replace
    'SplitColWarnMsg': 'About <num> columns will be generated, do you still ' +
                       'want to continue the operation?'
};

SideBarTStr = {
    'SendToWS': 'Send To Worksheet',
    'WSTOSend': 'Worksheet to send',
    'NoSheet': 'No Sheet',
    'NoSheetTableInstr': 'You have tables that are not in any worksheet, ' +
                         'please choose a worksheet for these tables!',
    'PopBack': 'Dock',
    'PopOut': 'Undock',
    'WalkThroughUA': 'Walkthrough Unavailable',
    'DelTablesMsg': 'Are you sure you want to drop the selected table(s)?',
    'SelectTable': 'Select table',
    'DupUDF': 'Duplicate Module',
    'DupUDFMsg': 'Python module <module> already exists ' +
                 '(module name is case insensitive), ' +
                 'do you want to replace it with this module?',
    'UpoladUDF': 'Upload Success',
    'UploadUDFMsg': 'Your python script has been successfully uploaded!',
    'SyntaxError': 'Syntax Error',
    'UploadError': 'Upload Error',
    'DownloadError': 'Download UDF Failed',
    'DownoladMsg': 'UDF is empty',
    'OverwriteErr': 'Cannot overwrite default UDF',
    'DropConsts' : 'Drop Aggregates',
    'DropConstsMsg' : 'Are you sure you want to drop the selected aggregate(s)?',

    // With Replace
    'UDFError': '<reason> found in line <line>'

};

ExtTStr = {
    "Website": "VISIT WEBSITE",
    "Report": "REPORT ERROR",
    "Version": "Version",
    "Lang": "Language",
    "extName": "Extension Name",
    "categoryName": "Category Name",
    "Install": "INSTALL",
    "Installed": "INSTALLED",
    "More": "VIEW MORE",
    "Less": "HIDE DETAIL"
};

DaysTStr = {
    'Sunday': 'Sunday',
    'Monday': 'Monday',
    'Tuesday': 'Tuesday',
    'Wednesday': 'Wednesday',
    'Thursday': 'Thursday',
    'Friday': 'Friday',
    'Saturday': 'Saturday',
    'Today': 'Today',
    'Yesterday': 'Yesterday',
    'LastWeek': 'Last week',
    'Older': 'Older'
};

OpModalTStr = {
    'EmptyHint': 'Select to allow empty field',
    'EmptyStringHint': 'Select to allow empty strings',
    'ColNameDesc': 'New Resultant Column Name',
    'AggNameDesc': 'New Resultant Aggregate Name (optional)',
    'IncSample': 'Include a sample of the rest of the fields',
    'IncSampleDesc': 'If checked, a sample of all fields will be included',
    'KeepInTable': 'Join table back to original',
    'KeepInTableDesc': 'If checked, group by will augment original table',
    'ModifyMapDesc': 'Would you like to modify the map?',
    'NoArg': 'No Argument',
    'EmptyString': 'Empty String',

    // with replace
    'ModifyDesc': 'Would you like to modify the <name>?',
    'ModifyBtn': 'MODIFY <name>'
};

JsonModalTStr = {
  'RemoveCol': 'Remove this panel',
  'Duplicate': 'Duplicate this panel',
  'PullAll': 'Pull all fields',
  'Compare': 'Click to select for comparison',
  'SelectOther': 'Select another data cell from a table to compare',
  'SeeAll': 'See All',
  'ViewAll': 'View All',
  'Original': 'Original',
  'XcOriginated': 'Xcalar Originated',
  'ViewAllTip': 'View all fields',
  'OriginalTip': 'View the original data fields',
  'XcOriginatedTip': 'View Xcalar generated fields',
  'SortAsc': 'Sort ascending',
  'SortDesc': 'Sort descending',
  'ToggleMode': 'Toggle mode',
  'FieldsSelected': 'fields selected to project'
};
