StatusMessageTStr = {
'Success': '成功！',
'Completed': '完成',
'Viewing': '浏览',
'Error': '遇到错误',
'Canceling': '取消',
'CancelSuccess': '取消成功',
'CancelFail': '无法取消',
'Loading': '加载',
'ImportDataset': '导入数据源',
'ImportTables': '导入表',
'ImportDSFailed': '无法导入数据源',
'DSFetchFailed': '无法预览数据集',
'CreatingTable': '创建表',
'TableCreationFailed': '无法创建表',
'Join': '连接表',
'JoinFailed': '无法连接表',
'JoinFailedAlt': '连接',
'DeleteTable': '删除表',
'DeleteTableFailed': '无法删除表',
'DeleteConstFailed': '无法删除聚合',
'PartialDeleteTableFail': '部分表无法删除',
'PartialDeleteConstFail': '部分聚合无法删除',
'CouldNotDelete': '不支持删除操作',
'NotDeletedList': '下列表不支持删除操作',
'ExportTable': '导出表',
'ExportFailed': '导出失败',
'Aggregate': '执行聚合操作',
'AggregateFailed': '聚合操作失败',
'SplitColumn': '拆分列',
'SplitColumnFailed': '拆分列失败',
'ChangeType': '更改数据类型',
'ChangeTypeFailed': '更改数据类型失败',
'OnColumn': '当前列',
'Sort': '排序',
'SortFailed': '排序失败',
'Map': '映射',
'MapFailed': '映射失败',
'GroupBy': '分组',
'GroupByFailed': '分组失败',
'Filter': '过滤',
'FilterFailed': '过滤失败',
'FilterFailedAlt': '过滤失败',
'Profile': '加载数据剖面图',
'ProfileFailed': '加载数据剖面图失败',
'Project': '投影列',
'ProjectFailed': '投影列失败',
'Ext': '执行扩展',
'ExtFailed': '执行扩展失败',
'StoredProc': '执行存储操作',
'StoredProcFailed': '执行存储操作失败',
'SettingExtensions': '加载插件',
'CurrReplay': 'Currently Replaying',
'CompReplay': 'Completed Replaying',
"PleaseWait": "Please wait",
'ActionSuccess': '操作成功！',
'ActionFailed': '操作失败！'
};
TooltipTStr = {
'ComingSoon': '尚未发布，敬请期待',
'FocusColumn': '聚焦当前列',
'Focused': '聚焦',
'ChooseUdfModule': '请先选择一个用户自定义模块',
'ChooseColToExport': '请选择您要导出的列',
'SelectCol': '请先选择一列！',
'NoFnBarFormOpen': '请退出当前窗体进入操作',
'SuggKey': '建议键',
'NoWSToMV': '没有可接受当前表的其它工作表',
'NoUndoNoOp': '没有可供撤消的操作',
'NoRedo': '没有可供重做的操作',
'UnhideWS': '取消隐藏工作表',
'LockedTable': '表被锁定，无法删除',
'LockedTableUndo': '表锁定时无法执行撤消操作',
'LockedTableRedo': '表锁定时无法执行重做操作',
'CloseQG': '点击此处,隐藏数据流图',
'OpenQG': '点击此处,查看数据流图',
'SaveQG': '保存图片',
'NewTabQG': '在新标签页中打开图像',
'AddDataflow': '创建批量数据流',
'Bookmark': '点击此处,添加书签',
'Bookmarked': '已添加书签',
'CopyLog': '将日志复制到剪贴板上',
'GenTicket': '生成服务支持券',
'ColPrefix': '列将添加前缀，以唯一标识表中的列。前缀默认自动生成。',
'ToGridView': '网格视图',
'ToListView': '列表视图',
'ClickCollapse': '点击此处, 折叠表',
'CollapsedTable': '表已折叠',
'SelectAllColumns': '选择所有列',
'ViewColumnOptions': '查看列选项',
'ViewTableOptions': '查看表选项',
'RemoveQuery': '删除操作',
'CancelQuery': '取消操作',
'AlreadyIcv': '完整性约束冲突异常表，可能包含坏行',
'ParamValNoChange': '此参数值不能更改',
'DeleteFile': '删除文件',
'CancelUpload': '取消上传',
"PointDemo": '添加文件/创建数据集',
"NotInDemoMode": '该功能在云预览中不可用',
"KeyExists": '键已经存在',
"ViewAllWS": '查看所有工作表',
"LoggedIn": '已登录',
"GeneratingComplement": "生成补集表",
"ComplementRestriction": "补集表只适用于过滤操作",
"ComplementSourceDropped": "如果子孙表被移除，则无法生成补集表",
"AddToWorksheet": "添加至工作表",
"NoActiveUndone": "被撤销的表无法添加至工作表",
"SysOperation": "系统操作",
"UDFNoMain": "UDF 需要包含'main'函数",
"UnexpectedNode": "Dataflow has an unexpected operation",
"IcvGenerating": '正在生成完整性约束冲突异常表',
"IcvRestriction": '完整性约束冲突异常表仅适用于映射和分组',
"IcvSourceDropped": '子孙表被移除，完整性约束冲突异常表不可被创建',
"OnlyInOpMode": '该功能仅在运行集群下可用',
"ColumnAlreadyInt": '当前数据类型已经是整型',
"ColumnAlreadyFloat": '当前数据类型已经是浮点型',
"CannotDropLocked": '表锁定时无法执行删除操作',
"SystemGood": '系统运行正常',
'CollapsedTables': '当前有 <number> 张表处于折叠状态',
'DroppedTable': '表\'<tablename> \'已被删除',
'NoExport': '不能导出类​​型为<type>的列',
'Undo': '撤消：<op>',
'NoUndo': '最后一次操作<op>，无法撤消',
'Redo': '重做：<op>',
'LowMemInTable': '警告！集群内存不足。单击此按钮删除表。',
'LowMemInDS': '警告！集群内存不足。单击此按钮删除数据集。',
'LowMemByOthers': '集群中的其他用户已经超过分配给表的最佳内存。请联系管理员。',
'SavedOn': '最近保存时间'
};
CommonTxtTstr = {
'ArrayVal': '数组值',
'NestedArrayVal': '嵌套数组值',
'Back': '上一步',
'BackToOrig': '返回原始位置',
'ClickToOpts': '点击查看选项',
'Continue': '继续',
'Copy': '复制',
'CopyLog': '复制日志',
'Create': '创建',
'Default': 'default',
'DefaultVal': '默认值',
'RevertDefaultVal': '恢复为默认值',
'Exit': '出口',
'GenTicket': '生成服务支持券',
'HoldToDrag': '点击并按住拖动',
'ClickSelect': '单击选择',
'Ignore': 'Ignore',
'Immediates': '派生列',
'ImmediatesPlural': '派生列',
'InP': '进行中',
'LeaveWarn': '您要退出Xcalar吗',
'LogOut': '注销',
'LogoutWarn': '您有未保存的更改，请保存, 否则您可能会失去现有的数据。',
'NA': '本条目不适用',
'NEWCOLUMN': '新列',
'NEXT': '下一步',
'NumCol': '列数',
'OpFail': '操作失败',
'Optional': '可选的',
'Preview': '预览',
'Rename': '重命名',
'SAVE': '保存',
'StartTime': '起始时间',
'Value': '值',
'XcWelcome': '开启 Xcalar Design 的奇妙之旅！',
'NoUndone': '此操作无法撤消',
'InvalidSize': '无效大小',
'Uploading': '上传',
'Upgrading': '升级',
'XDBUsage': 'XDB使用率',
'Retry': '重试',
'Overwrite': '覆盖',
'NoResult': '无搜索结果',
'deleting': '删除中',
'ClickToExpand': '点击展开',
'time': '时间',
'rows': '行数'
};
ErrTStr = {
'Error': '错误',
'Unknown': '未知错误',
'NoEmpty': '输入不能为空。',
'PositiveInteger': '请选去一个正整数作为运行次数',
'InvalidField': '无效的输入。',
'InvalidFilePath': '无效文件路径',
'InvalidFile': '请选择一个文件或文件夹',
'InvalidAggName': '聚合名称应以字母开头，仅包含字母，数字，连字符（ - ）或下划线（_）',
'InvalidTableName': '表名应以字母开头，仅包含字母，数字，连字符（ - ）或下划线（_）',
'InvalidWBName': '工作簿名称应以字母开头，仅包含字母，数字，连字符（ - ）或下划线（_）',
'NoHashTag': '请输入无 # 符号的有效名称 ',
'NoSpecialChar': '请输入无特殊字符的有效名称。',
'NoSpecialCharOrSpace': '请输入无特殊字符或空格的有效名称。',
'NoSpecialCharInParam': '参数括号中不允许使用特殊字符或空格。',
'UnclosedParamBracket': '检测到未关闭的参数括号。',
"FilterTypeNoSupport": '不支持当前过滤类型。',
'NoEmptyList': '请在下拉列表中选取一个选项',
'NoEmptyFn': '无法上传空函数。',
'NoEmptyOrCheck': '请输入或者选中该复选框保留空值。',
'NameInUse': '该名称已被使用，请选择其他名称。',
'DSNameConfilct': '具有相同名称的数据集已经存在，请选取其他名称。',
'DSStartsWithLetter': '数据集名称应以字母开头。',
'PrefixStartsWithLetter': '前缀应以字母开头。',
'TableConflict': '具有相同名称的表已经存在，请选取其他名称。',
'ExportConflict': '具有相同名称的文件已经存在，请选取其他名称。',
'ColumnConflict': '具有相同名称的列已经存在，请选取其他名称。',
'PrefixConflict': '具有相同名称的前缀已经存在，请选取其他名称。',
'DFConflict': '具有相同名称的数据流已经存在，请选取其他名称。',
'DFNameIllegal': '只允许使用a-z，a-z，0-9， - 和_的名称。',
'InvalidWSInList': '无效的工作表名称，请从弹出列表中选择一个工作表。',
'OnlyNumber': '请输入一个数字。',
'OnlyInt': '请输入一个整数。',
'OnlyPositiveNumber': '请输入大于0的数字。',
'NoFile': '文件未找到。',
'NoNegativeNumber': '请输入大于或等于0的数字',
'NoAllZeros': '值不能全部为零',
'NoWKBKSelect': '请选择一个工作簿',
'NoWS': '此工作表被删除，请选择另一个工作表',
'NoSelect': '请从下拉列表中选择一个选项',
'NoGroupSelect': '未选择组。',
'InvalidColName': '列名无效',
'ColInModal': '请输入以$开头的列名称',
'NoMultiCol': '该输入只接受一列。',
'NoBucketOnStr': '列类型是字符串，不能进入范围。',
'ParamInUse': '无法删除，此参数正在使用中。',
'MVFolderConflict': '无法移动，名称与目标文件夹中的文件冲突',
'MakrForDel': '无法预览标记为被删除的数据集',
'TimeExpire': '请选择未来的某个时刻。',
'LongFileName': '文件名太长，请使用少于255个字符。',
'LargeFile': '文件太大请打破较小的文件（<10mb）。',
'NoSupportOp': '不支持此操作。',
'PreservedName': '该名称属于保留字，请选取其他名称。',
'InvalidWin': '未排序的表不支持窗口功能',
'InvalidQuery': '操作失败',
'InvalidRegEx': '无效的正则表达式（请检查您的语法）',
'BracketsMis': '您的函数字符串存在不匹配的括号。',
'InvalidFunction': '无效功能',
'TooLong': '请使用少于255个字符。',
'PrefixTooLong': '请使用少于32个字符。',
'NoTable': '表不存在',
'TablesNotDeleted': '下列表格未被删除：',
'ConstsNotDeleted': '下列聚合未被删除：',
'NoTablesDeleted': '没有表格被删除。',
'NoConstsDeleted': '没有聚合被删除。',
'LargeImgSave': '保存图像失败',
'LargeImgTab': '打开图像失败',
'LargeImgText': '图像已超过浏览器所允许的最大大小',
'DFNoExpand': '数据流图已达到浏览器所允许的最大大小',
'InvalidExt': '无效插件',
'InvalidExtParam': '无效的插件参数',
'InvalidOpNewColumn': '无法在新列上执行此操作。',
'SuggestProject': '请减少列数并重试。',
'UserCanceled': '用户已取消',
'NoColumns': '未选择列',
'NoCast': '不存在可供转换的列。',
'NoTypeChange': '请更改至少一列的类型以应用该转换。',
'IcvFailed': '无法生成完整性约束冲突异常表',
'IcvAlt': '无法生成完整性约束冲突异常表仅适用于映射和分组',
'RetinaFormat': '仅支持.tar.gz格式',
'RetinaFailed': '上传 Retina 失败',
'ConfigParamNotFound': '参数未找到。',
'ConfigParamExists': '参数已存在',
'SchedHourWrong': '小时必须介于1到12之间',
'SchedMinWrong': '分钟必须在0到59之间',
'OutputNotFoundMsg': '输出不可用。',
'SourceTableNotExists': '源表不存在。',
'TableNotExists': '表不存在。',
'SelectOption': '请选择一个选项。',
'NotDisplayRows': '无法显示行',
'AppInstallFailed': '应用安装失败',
'ExtUploadFailed': '上传扩展失败',
'ExtEnableFailure': '扩展无法启用',
'ExtDisableFailure': '扩展无法禁用',
'ExtRemovalFailure': '扩展无法删除',
'ExtDownloadFailure': '扩展无法下载',
'CannotDropLocked': '表锁定时无法执行删除操作',
'RefreshBrowser': '刷新浏览器',
'RefreshBrowserDesc': '我们检测到需要刷新的问题。\n 请刷新您的浏览器。您的工作将恢复到最后一致状态。',
'BundleFailed': '提交包失败',
'WorkbookExists': '具有相同名称的工作簿<workbookName>已经存在，请选取其他名称。',
'InvalidColumn': '列名无效：<name>',
'LicenseExpire': '您的Xcalar许可证到期时间为 \"<date>\"',
'ExtNotFound': '扩展名<module>::<fn>未找到。',
'NoEmptyMustRevert': '请填写该栏. 如果您想使用默认值, 请点击"默认值"按钮。',
'InUsedNoDelete': '该参数正在使用中，删除失败',
'NoFolderPreview': '无法预览文件夹，请选择一个文件。',
};
ErrWRepTStr = {
'FolderConflict': '具有相同名称的文件夹<name>已经存在，请选取其他名称。',
'ParamConflict': '具有相同名称的参数<name>已经存在，请选取其他名称。',
'SystemParamConflict': '参数<name>是系统参数，请选取其他名称。',
'TableConflict': '具有相同名称的表<name>已经存在，请选取其他名称。',
'NoPath': '路径<path>未找到。重定向到根目录。',
'NoPathInLoad': '路径<path>未找到。',
'NoUDF': 'UDF \" <udf> \"不存在。',
'InvalidOpsType': '输入类型无效，接受的类型：<type1>, 实际类型: <type2>。',
'InvalidCol': '列"<name>"不存在。',
'InvalidColOnTable': '表"<table>"中不包含名为"<col>"的列。',
'InvalidRange': '请输入<num1> and <num2>之间的值。',
'InvalidColType': '列"<name>" 含有无效类型: <type>',
'ColNotInTable': '表"<table>"中不包含名为"<name>"的列。',
'ColConflict': '表"<table>"中已包含名为"<name>"的列。',
'NoLessNum': '请输入一个大于等于<num>的值',
'NoBiggerNum': '请输入一个小于等于<num>的值',
'TableNotDeleted': '表<name>未被删除。',
'ConstNotDeleted': '聚合<name>未被删除。',
'AggConflict': '具有相同名称的聚合<aggPrefix>"' + '<name>已经存在，请选取其他名称。',
'OutputNotFound': '未找到<name>',
'OutputNotExists': '<name>已不存在。',
'InvalidAggName': '聚合名称必须以<aggPrefix>作为前缀',
'InvalidAggLength': '聚合名称必须以<aggPrefix>为前缀，后跟用户自定义的名称',
'InvalidSampleSize': '最大可支持size为<size>的数据集。',
'IntInRange': '请输入在<lowerBound>-<upperBound>之间的整数',
};
DemoTStr = {
"title": '欢迎使用 Xcalar Design',
"msg": '您的许可证有效期限是',
"day": '天',
"days": '天',
"hour": '小时',
"hours": '小时',
"minute": '分钟',
"minutes": '分钟'
};
NewUserTStr = {
"msg": '如果这是您第一次使用xcalar Design，请点击开放指南按钮获取有关如何开始使用的资源',
"openGuide": '开放指南'
};
TipsTStr = {
'Scrollbar': '滚动数据表',
'DataType': '数据类型',
'LineMarker': '单击行号以添加书签',
'JSONEle': '双击查看，然后单击键名称以选取列',
'DragGrid': '您可以拖动数据集或文件夹以重新排序',
'DSTable': '单击表头以从/从数据购物车添加/删除列。单击列标题以进一步修改列。',
'DSCart': '数据区域，您可以将数据集中的列添加到您的购物车。这些列将用于在活动工作表中创建表。您也可以在工作表屏幕中提取列。',
'TablList': '点击查看详细信息',
'PullColumn': '单击键将列添加至表中'
};
SuccessTStr = {
"Copy": '复制成功！',
"CopyToClipboard": '复制到剪贴板！',
"DelUDF": '成功删除udf！',
"Detect": '检测完成！',
"DownloadTicket": '下载服务支持券',
"InstallApp": '应用程序已成功安装！',
"Saved": '保存成功！',
"SaveDF": '数据流保存成功！',
"SaveParam": '参数保存成功',
"OperationParameterized": "操作参数化成功!",
"ChangesSaved": "Changes Saved!",
"SaveSettings": '设置保存成功！',
"Sched": 'Schedule添加成功！',
"StopCluster": '集群关闭！',
"SubmitTicket": '提交服务支持券成功！',
"Target": '目标添加！',
"RetrieveLogs": '记录检索！',
"RmDF": '删除批量数据流成功！',
"RmSched": "删除调度器成功！",
"PauseSched": "暂停调度器成功！",
"ResumeSched": "重启调度器成功！",
"RmSession": '会话文件被删除！',
"UpdateLicense": '许可证成功更新，新的许可证将在下次重新启动后生效。',
"Upload": '上传成功！',
"UploadApp": 'app上传成功！',
"UploadUDF": 'udf上传成功！',
"ExtDownload": '成功下载扩展！',
"ExtRemove": '成功删除扩展！',
"ExtEnable": '成功启用扩展！',
"ExtDisable": '成功禁用扩展！',
"Profile": '数据剖面图图片保存成功！',
"BundleUploaded": '支持捆绑包生成成功，上载：',
"FlushLog": "强制刷新日志成功!"
};
FailTStr = {
"Profile": '保存数据剖面图图像失败。',
"ProfileStats": '生成统计失败。',
"SaveSettings": '保存设置失败。',
"RmDF": "删除批量数据流失败。",
"RmSched": "删除调度器失败",
"FlushLog": "强制刷新日志失败!"
};
ThriftTStr = {
'CCNBEErr': '连接错误',
'CCNBE': '连接无法建立。',
'UpdateErr': 'xcalar版本不匹配',
'Update': '需要更新。',
'SetupErr': '安装失败',
'ListFileErr': '列表文件失败',
'SessionElsewhere': '检测到不同的节点',
'LogInDifferent': '请从您首次登录的节点登录。'
};
AlertTStr = {
'Title': '警告',
'Error': '错误',
'ErrorMsg': '发生了错误！',
'NoDel': '无法删除',
'ContinueConfirm': '您确定您要继续吗？',
'BracketsMis': '不匹配的括号',
'NoExt': '未知扩展',
'CLOSE': '关闭',
'CANCEL': '取消',
'CONFIRM': '确认',
'CONFIRMATION': '确认',
'NoConnect': '无法连接。',
'Connecting': '连接中...',
'TryConnect': '<second>秒后重新连接。',
'UserOverLimit': '登录用户数量超过限制',
'UserOverLimitMsg': '登录用户数量超过许可证支持的上限，请登出',
'UnexpectInit': '初始化超时',
'UnexpectInitMsg': '初始化超时。这可能是由网络延迟或同步初始化出错造成的。请重试或覆盖初始化操作。'
};
ErrorMessageTStr = {
'title': '错误',
'instrUp': '发生了错误！',
'instrDown': "请参考如下错误信息。"
};
FnBarTStr = {
'NewCol': '请指定新列名称，然后按Enter键。',
'InvalidOpParen': '操作必须在操作符名称和参数前面加上括号。',
'ValidOps': '有效的运算符是：<b>pull, map, filter</b>。',
'DiffColumn': '所选列（<colName>）不包括在此操作中。您想继续吗？',
'NewColTitle': '需要新列',
'NewColMsg': '请创建一个新列来执行映射。',
'InvalidNumParens': '您的函数字符串应采用<operation>（op（arg1，arg2，...））的形式'
};
ScrollTStr = {
'BookMark': '行<row>'
};
OpFormTStr = {
'NewColName': '按列生成的列的新列名称',
'CMD': '操作预览',
'Descript': '描述',
'FieldToGroup': 'Fields to group on'
};
AggTStr = {
'selected': '被选中',
'everyPair': '每一对',
'somePairs': '成对选定',
'all': '所有',
'CorrInstr': '查看<which> 数值列的相关系数。查看 <which2>的数值列的聚合函数，请单击垂直选项卡。',
'AggTopInstr': '查看<which> 数值列的聚合函数。查看 <which2>的数值列的相关系数，请单击垂直选项卡。',
'NoSupport': '不支持',
'DivByZeroExplain': '只有一个不同的值',
'NoCorr': '无数字类型的列可用于相关性计算',
'NoAgg': '无数字类型的列可用于聚合',
'AggTitle': '聚合：<op>',
'AggInstr': '这是列"<col>" 聚合操作<op>的结果\r\n。',
'AggMsg': '{"value"：<val>}'
};
IndexTStr = {
'Sorted': '表已经排序',
'SuggTitle': '排序建议',
'SuggMsg': '该列可以按数字或字母顺序进行排列。请问您想以何种顺序排列？',
'CastToNum': '按数字顺序排列',
'NoCast': '按字母顺序排列',
'SortedErr': '当前表中的所有记录已根据此列按照<order>顺序排列',
'SuggInstr': '排序之前请选择"按数字顺序排列"将该列转换为<type>类型。在排序期间非数字行将被移除。'
};
JoinTStr = {
'NoLeftTable': '先选择左表',
'NoRightTable': '先选择右表格',
'NoKeyLeft': '左表不包含选择的键',
'NoKeyRight': '右表不包含选择的键',
'NoMatchLeft': '对不起，找不到与左表匹配的有效键',
'NoMatchRight': '对不起，找不到与右表匹配的有效键',
"NoMatchSelf": '对不起，找不到与当前列匹配的有效键',
'UnlikelyJoinKey': '根据估计，这种匹配是不合理的，但是这仍然是我们能提供的最佳有效键。',
'NoColToCheck': '没有可用的列名来检查',
'InvalidClause': '无效子句加入',
'TypeMistch': '左选列和右选列类型不匹配，无法进行连接操作',
'EstimateJoin': '估计连接大小',
'EstimatedJoin': '估计连接大小',
'EstimatingJoin': '估计连接大小...',
'Estimating': '估计...',
'JOIN': '连接',
'ModifyDesc': '您想修改连接吗？',
'NoJoin': '无法连接<type>',
'MismatchDetail': '无法连接类型为<type1>和<type2>的列'
};
ExportTStr = {
'Success': '导出成功',
'InvalidType': '选择无效类型',
'DisableHeader': '不支持将新数据将追加到现有数据',
'LocationNotFound': '导出位置未找到',
'FolderName': '文件名',
'TargetName': '导出名',
'SuccessInstr': '表\<table>\" 已成功导出为路径 <location> 下的 <file> 文件',
'ExportOfCol': '从表<table>中导出列',
'ListTargFail': '列表目标失败',
'LocalFS': '文件系统'
};
ProfileTStr = {
'Instr': '鼠标悬停在直方图上查看详情。使用滚动条和输入框查看更多数据。',
'LoadInstr': '数据加载中，请稍等，您可以关闭该弹出窗口并稍后查看。',
'InvalidBucket': '无效的分段范围',
'Info': '列信息：<b><col></b>, type: <b><type></b>。'
};
WKBKTStr = {
'NoWkbk': '未建立工作簿',
'NoMeta': '数据缺失',
'Location': '工作簿',
'NewWKBK': '新建工作簿',
'NewWKBKInstr': '通过新建一个工作簿开始使用xcalar Design。给您的新工作簿一个名称，然后单击创建工作簿按钮。创建工作簿后，将鼠标悬停在其上，然后单击播放按钮开始使用新的工作簿。或者，从xcalar Design 的一个教程开始，以了解更多。',
'CurWKBKInstr': '继续使用当前活动的工作簿，将其悬停在蓝色背景的卡上，然后单击播放按钮。您可以通过将鼠标悬停在其他工作簿上，然后单击播放按钮来切换到另一个工作簿。创建任何工作簿的副本，将鼠标悬停在工作簿卡上，然后单击重复按钮。',
'NoOldWKBK': '无法恢复旧工作簿',
'NoOldWKBKInstr': '如果您在重新登录后仍然看到错误，请复制您的日志并重新启动服务器。',
'NoOldWKBKMsg': '请使用新的工作簿或注销，然后重试！',
'Expire': '请注销',
'ExpireMsg': '您已经在其他地方登录了！',
'Hold': '登录警告',
'HoldMsg': '您已经在其他地方登录了。继续登录可能会导致您丢失未保存的工作。',
'Release': '继续登录',
'WKBKnotExists': '没有工作簿存在',
"WaitActivateFinish": "工作簿机激活中",
"NoActive": "没有被激活的工作簿，请创建或激活工作簿",
"Activate": '激活工作簿',
"ReturnWKBK": '返回工作簿',
"EditName": '编辑工作簿名称',
"Duplicate": '复制工作簿',
"Delete": '删除工作簿',
"DelErr": '删除工作簿出错',
"CreateErr": '创建工作簿出错',
"CancelTitle": "取消激活工作簿",
"CancelMsg": "您确定要取消激活工作簿吗?",
'Conflict': '相同名称的工作簿"<name>"已经存在，请选取其他名称。',
'Active': '激活',
'Inactive': '未激活',
'Createby': '创建人',
'CreateOn': '创建于',
'Modified': '最近一次更改',
'WS': '工作表',
'Status': '状态',
'Creating': '创建工作簿',
'SwitchErr': '切换工作簿错误',
'SwitchErrMsg': '切换工作簿时发生错误。继续切换可能会导致工作簿出现问题。您还想继续吗？',
'DeleteMsg': '您确定要删除工作簿吗？',
'Deactivate': '停用工作簿',
'DeactivateMsg': '您确定要停用工作簿吗？',
'DeactivateErr': '停用工作簿时出错',
'Pause': '暂停工作簿',
'Paused': '暂停',
'PauseMsg': '您确定要暂停工作簿吗？',
'PauseErr': '暂停工作簿时出错',
'Refreshing': '在 <time> 秒后刷新'
};

MonitorTStr = {
"ConfigParamName": '配置参数名称',
"CurVal": '当前值',
"NewVal": '新值',
'ClusterStatus': '集群状态',
'Ext': '扩展',
'GetLogsFail': '无法获取日志',
'GetStatusFail': '无法获得状态',
'Monitor': '监控',
'NotAuth': '没有授权执行此命令。',
'ParamConfigFailed': '参数配置失败',
'Queries': '操作',
'RAM': '随机存取存储器',
'RELEASEMEM': '释放内存',
'ReleaseMem': '释放内存',
'RemoveSessionFail': '无法删除会话',
'RestartFailed': '重启集群失败',
'RestartNodes': '重启集群',
'SavingSettingsFailed': '保存设置失败',
'Settings': '设置',
'Setup': '建立',
'StartNodeFailed': '启动集群失败',
'StartNodes': '启动集群',
'StartStreamFail': '无法启动流',
'StatsFailed': '错误：无法获取系统统计信息。',
'StopNodeFailed': '停止集群失败',
'StopNodes': '停止集群',
'StopStreamFail': '错误',
'SupportTools': '支持工具',
'System': '系统',
'UseXcalarAs': '使用Xcalar作为',
'XDB': 'XDB',
'UserNotExists': '该用户没有工作簿',
'ViewMem': '查看内存使用',
'MemUsage': '内存使用率',
'YouAreUsing': '切换的用户名为：',
"Restart": "重启Xcalar",
"RestartMsg": "请重启Xcalar使修改的参数生效",
'ParamConfigFailMsg': '无法将参数<b><name></b> 设置成 <b><value></b>。',
'DefaultWithVal': '恢复为默认值：<value>',
'NodeConfirmMsg': '您确定要打开集群吗？',
'SwitchUserMsg': '您确定要以<username>登录Xcalar吗？',
'RestartAlertMsg': '管理员重启了集群',
'StopAlertMsg': '管理员停止了集群',
'AdminAlert': '管理员提醒',
"FlushLog": "强制刷新日志",
"FlushLogMsg": "您确定要强制刷新日志吗？"
};
SchedTStr = {
'DelSched': '永久删除调度器',
'DelSchedMsg': '您确定要永久删除调度器吗？此操作无法撤销。',
"detail": '调度器详情',
"simFail": '模拟失败！',
"noParam": '无参数',
"unknown": '未知',
"failServerTime": '无法获得服务器时间',
"ListSchedFail" : "获取调度器运行记录失败",
'NewSched': '新建调度器',
"Notrun": "未运行",
"Success": "成功",
"NoExportParam": "导出路径未参数化，多次运行会失败，除非导出文件在运行后被转移。您确定要继续吗？"
};
DFTStr = {
"CannotCreate": '无法创建批量数据流',
"CannotCreateMsg": '无法从表源自数据流创建批处理数据流。',
"AdvancedOpts": '高级导出设置',
"Default": '导出到文件系统',
"DelDF": '永久删除数据流',
"DelDFMsg": '您确定要永久删除此数据流吗？此操作无法撤消。',
"DFTitle": '数据流',
"BatchDF": "批量数据流",
"DownloadErr": '下载失败',
"ExportTo": '导出为',
"FindTable": '导出表<table>至工作表中',
"ViewTable": "VIEW TABLE",
"Import": '导出为Xcalar表',
"NoFileExt": '导出文件名必须有一个扩展名',
"PointTo": '文件路径',
'AddParamHint': '请先在数据流面板中创建参数。',
'Cancel': '取消批量数据流',
'CancelSuccessMsg': '批量数据流的取消成功。',
'DFCreateFail': '数据流创建失败',
'ExportFileExists': '导出文件已经存在。',
'NoDF1': '没有添加数据流',
'NoDF2': '从数据流图添加数据流',
'ParamModalFail': '参数创建失败',
'Run': '运行批量数据流',
'RunDone': '运行完成',
'RunDoneMsg': '成功运行数据流！',
'RunFail': '运行df失败',
'Running': '运行批量数据流',
'UpdateParamFail': '更新参数失败',
'UploadLimitMsg': '无法上传超过大小超过1mb的数据流。',
'AddSched': '创建调度器',
'DownloadDF': '下载数据流',
"DelDF2": "删除数据流",
"WarnInMemTable": "此操作将在当前工作簿中生成表。注意：生成的表将无法创建批量数据流",
"InvalidExportPath": "导出文件名不能含有/",
'RunDFInstr': '请注意以下警告:',
'WarnSysParam': '直接运行批量数据流时，系统参数无效，会被省略。',
'InvalidTarget': '无法找到目标',
'DFDrawError': 'Invalid dataflow structure',
'Scheduled': "已添加调度器",
"SlightSkew": "轻度偏移",
"HeavySkew": "重度偏移",
"Refresh": "刷新数据流",
"RefreshMsg": "当前数据流已被其他用户更改",
"AddValues": "赋值",
"ParamNoValue": "请为当前数据流使用的所有参数赋值",
"CannotParam": "如果导出成Xcalar表，则无法参数化"
};
DSTStr = {
'UnknownUser': '未知用户',
'DS': '数据集',
'IN': '数据集',
'OUT': '导出目标',
'Export': '导出方式',
'DelDS': '删除数据集',
'DelDSFail': '删除数据集失败',
'NewFolder': '新建文件夹',
'NoNewFolder': '无法创建文件夹',
'NoNewFolderMsg': '这个文件夹是不可编辑的，不能在这里创建一个新的文件夹',
'NotFindDS': '找不到数据集',
'NoParse': '无法解析数据集。',
'NoRecords': '数据集中没有记录。',
'NoColumns': '未选择列',
'NoRecrodsHint': '请检查路径，模式，数据集大小，udf的验证，然后重试。',
'CancalPoint': '取消导入数据集',
'DSSourceHint': '请尝试另一个路径或使用另一个协议。',
'FileOversize': '文件夹中的文件太多，无法读取，请直接用url导入',
'InvalidHDFS': '无效的hdfs路径，有效格式为：hostname / pathtofile',
'Excel': 'EXCEL',
'Home': 'Home',
'InvalidUpload': '无效上传',
'OneFileUpload': '一次只能上传一个文件。',
'InvalidFileName': '无效的文件名',
'InvalidFileNameDesc': '名称无效，请重命名您的文件。',
'NewName': '新名称',
'DupFileName': '重复文件名',
'DupFileNameDesc': '具有相同名称的文件存在。请重命名您的文件。',
'InvalidFolderDesc': '无法上传目录。',
'CouldNotDelete': '数据集无法删除',
'DelUpload': '删除文件',
'CancelUpload': '取消上传',
'CancelUploadDesc': '您确定要取消这个上传吗？',
'UploadCompleted': '上传完成',
'UploadCompletedDesc': '上传完成。无法取消',
'UploadFailed': '上传失败',
'UploadLimit': '达到上传限制',
'UploadLimitMsg': '一次不能上传超过2个文件。',
'Unlistable': '数据集被标记为删除',
'DelDSConfirm': '您确定要删除数据集<ds>吗？',
'DelUneditable': '\"<ds>\"不可修改，无法删除',
'CancelPointMsg': '您确定要取消指向数据集<ds>吗？',
'LoadErr': '错误：<error>',
'LoadErrFile': '错误文件：<file>',
'TableName': '表名',
'ColPrefix': '列前缀',
'ShowAdvOpt': '显示高级选项',
'HideAdvOpt': '隐藏高级选项',
'PointErr': '无法导入数据集',
'OffsetErr': 'offset大于数据集大小',
'DelUploadMsg': '您确定要删除<filename>吗？',
'NoSingleFilePattern': '不支持单个文件',
'DelMultipleDS': '您确定要删除选中的数据集、文件夹吗?',
'FailDelFolder': '删除文件夹\"<folder>\"失败: 非空文件夹',
'FailDelDS': '删除数据集\"<ds>\"失败: <error>',
'FailCancelDS': '取消导入数据集\"<ds>\"失败: <error>',
'DetectInvalidCol': '数据集列名包含无效字符',
'DetectInvalidColInstr': '在处理数据时，无效列名可能会导致结果出错。 建议提前处理其中的无效字符。',
'DetectInvalidColMsg': '以下列名包含无效字符: <cols>。您确定要继续吗?'
};
DSFormTStr = {
'Pattern': '模式',
'InvalidDelim': '无效分隔符。',
'InvalidLineDelim': '行分隔符只能为1个字符，（\\r\\n）除外。',
'InvalidQuote': '不能有超过1个引号',
'NoParseJSON': '无法将数据解析为json',
'GoBack': '请点击返回按钮重新输入有效的路径或使用有效的路径模式',
'NoData': '没有数据',
'NoFile': '找不到文件，请返回选择一个有效的文件/文件夹。',
'CreateWarn': '太多的列要创建',
'CreateWarnMsg': '创建一个含有很多列的表可能会影响系统性能，您确定要继续吗？',
'WSColsMsg': '添加含有很多列的表至当前工作簿可能会影响系统性能, 您想创建一个新的工作表吗？',
'NoQuoteWarn': '没有引用字符',
'NoQuoteWarnMsg': '您没有为数据集选择引用字符。您确定您要继续吗？'
};
DSParserTStr = {
"NotSupport": '不支持解析此数据格式',
"Fail": '提交可视化数据解析器失败',
"Submit": '提交可视化数据解析器',
"SubmitMsg": '您确定要提交可视化数据解析器吗？',
"NoKey": '没有键被选中',
"FileSizeWarn": "您的文件超过500MB， 可视化数据解析器需要较长时间解析数据。请将文件分成小份，或者直接使用streaming UDF读取",
"Proceed": "继续"
};
DSExportTStr = {
'ExportFail': '无法添加导出目标',
'InvalidType': '目标类型无效',
'InvalidTypeMsg': '请选择有效的目标类型',
'RestoreFail': '出口目标恢复失败',
'DeleteFail': '目标删除失败',
'DeleteExportTarget': '删除导出目标',
'NoDelete': '无法删除默认的导出目标',
'InvalidExportPath': '导出路径不能包含引号。',
'DefaultPath': '默认路径',
'URLPlaceholder': '默认值: <target>',
'DeleteConfirmMsg': '您确定要删除<target>吗？'
};
WSTStr = {
'SearchTableAndColumn': '搜索表或列',
'Ws': '工作表',
'WSName': '工作表名称',
'WSHidden': '工作表被隐藏',
'InvalidWSName': '无效的工作表名称',
'InvalidWSNameErr': '请输入有效的名称！',
'AddOrphanFail': '添加临时表失败',
'NewWS': '新工作表',
'DelWS': '删除工作表',
'DelWSMsg': '此工作表中包含已激活的表。您想怎么处理它们？'
};
UDFTStr = {
"UDF": '执行',
"Edit": '编辑',
"Del": '删除',
"Download": '下载',
"DelTitle": '删除UDF',
"DelMsg": '您确定要删除UDF模块吗？',
"DelFail": '删除UDF失败',
"NameHint": '模块名称（小写）',
"AppName": 'XPU应用程序名称（小写）',
"NoTemplate": "无法找到模快",
"InValidName": "模块名应以字母或下划线开头, 仅包含字母，数字，连字符（ - ）或下划线（_）"
};
TblTStr = {
'Create': '创建表',
'Del': '删除表',
'DEL': '删除表',
'DelMsg': '您确定要删除表<table>吗？',
'DelFail': '删除表失败',
'Archive': '隐藏表',
'ARCHIVE': '隐藏表',
'Active': '将表发送到工作表',
'ActiveFail': '活动表失败',
'Truncate': '其他字符被截断'
};
ColTStr = {
'SplitColWarn': '许多列会生成',
'RenameSpecialChar': '无效名称，名称只能包含字母数字， - ，_和空格，并且必须以字母开头。',
'ColNameInvalidChar': '无效名称，请不要包含以下字符: ^.\',":()[]{}\\',
'RenameStartNum': '无效名称，不能以数字开头。',
'ImmediateClash': '无效名称，该名称已被其他列使用',
'LongName': '列名过长，请使用少于255个字符。',
'NoOperateArray': '不能直接在整个数值上操作',
'NoOperateObject': '不能直接在整个对象上操作',
'NoOperateGeneral': '不能直接操作这种类型的列',
'SplitColWarnMsg': '将生成大约<num>列，您还想继续操作吗？'
};
SideBarTStr = {
'SendToWS': '发送到工作表',
'WSTOSend': '工作表发送',
'NoSheet': '无表',
'NoSheetTableInstr': '您有不在任何工作表的表，请选择要发送至的工作表！',
'PopBack': '默认位置',
'PopOut': '弹出',
'WalkThroughUA': '无法浏览教程',
'DelTablesMsg': '您确定要删除所选表格吗？',
'SelectTable': '选择表格',
'DupUDF': '复制模块',
'DupUDFMsg': 'Python模块已经存在（模块名称不区分大小写），是否要将其替换为该模块？',
'UpoladUDF': '上传成功',
'UploadUDFMsg': '您的Python脚本已成功上传！',
'SyntaxError': '语法错误',
'UploadError': '上传错误',
'DownloadError': '下载UDF失败',
'DownoladMsg': 'UDF为空',
'OverwriteErr': '不能覆盖默认的UDF',
'DropConsts': '删除聚合',
'DropConstsMsg': '您确定要删除所选的聚合吗？',
'WSColsMsg': '该表包含过多列，加入当前工作表可能会影响界面流畅度。您是否想要为此表新建一个工作表？',
'UDFError': '<reason> 在 <line>中找到'
};
ExtTStr = {
"Author": '作者',
"Report": '报告错误',
"Version": '版本',
"extName": '插件名',
"Install": '安装',
"Installed": '安装',
"More": '查看更多',
"Less": '隐藏细节',
"XcCategory": 'Xcalar Extensions',
'extListFail': '无法获得安装的插件列表',
"InvalidTableName": "无效的表名，请使用插件提供的api生成表名",
"AddClause": "添加参数",
"WEBSITE": "网站",
"MODIFY": "修改插件",
};
DaysTStr = {
'Sunday': '星期日',
'Monday': '星期一',
'Tuesday': '星期二',
'Wednesday': '星期三',
'Thursday': '星期四',
'Friday': '星期五',
'Saturday': '星期六',
'Today': '今天',
'Yesterday': '昨天',
'LastWeek': '上个星期',
'Older': '更早'
};
OpModalTStr = {
'EmptyHint': '选择允许输入为空',
'EmptyStringHint': '选择允许空字符串',
'ColNameDesc': '新的结果列名称',
'AggNameDesc': '新的聚合名称（可选）',
'IncSample': '包括其余列的样本',
'IncSampleDesc': '如果选中，将包括所有列的样本',
'KeepInTable': '与原始表关连',
'KeepInTableDesc': '如果选中，生成的表将会与原表连接',
'ModifyMapDesc': '您想修改映射吗？',
'NoArg': '没有参数',
'EmptyString': '空字符串',
'WeirdQuotes': '您的输入包含非Unicode的引号(“)，请检查]',
'ModifyDesc': '您想修改<name>吗？',
'ModifyBtn': '修改<name>'
};
JsonModalTStr = {
'Compare': '点击选择进行比较',
'DeselectAll': '清空',
'Duplicate': '复制此面板',
'FieldsPull': '提取列',
'FieldsSelected': '选定项目的领域',
'MultiSelectMode': '多选模式',
'Original': '原始的',
'OriginalTip': '查看原始数据列',
'ProjectMode': '投影模式',
'PullAll': '提取所有列',
'RemoveCol': '删除此面板',
'SeeAll': '查看全部',
'SelectAll': '全选',
'SelectionMode': '单选模式',
'SelectOther': '选择另一个单元格进行比较',
'SortAsc': '升序排序',
'SortDesc': '降序排序',
'SubmitProjection': '投影',
'SubmitPull': '提取列',
'ToggleMode': '切换模式',
'ViewAll': '查看全部',
'ViewAllTip': '查看所有列',
'XcOriginated': 'Xcalar起源于',
'XcOriginatedTip': '查看Xcalar生成的列',
'PrefixedField': '含前缀的列',
'Derived': '派生列'
};
SQLTStr = {
    "AddNewCol": "Add New Column",
    "AddWS": "Create Worksheet",
    "BookmarkRow": "Bookmark Row",
    "ChangeFormat": "Change Format",
    "DelCol": "Delete Column",
    "DelWS": "Delete Worksheet",
    "HideCol": "Hide Column",
    "HideTable": "Hide Table",
    "HideWS": "Hide Worksheet",
    "MarkPrefix": "Mark Prefix",
    "MaximizeCols": "Maximize Columns",
    "MaximizeTable": "Maximize Table",
    "MinimizeCols": "Minimize Columns",
    "MinimizeTable": "Minimize Table",
    "MoveInactiveTableToWS": "Move Inactive Table To Worksheet",
    "MoveTableToWS": "Move Table To Worksheet",
    "PullCol": "Pull Column",
    "PullCols": "Pull Columns",
    "RemoveBookmark": "Remove Bookmark",
    "RenameCol": "Rename Column",
    "RenameWS": "Rename Worksheet",
    "ReorderCol": "Change Column Order",
    "ReorderTable": "Change Table Order",
    "ReorderWS": "Reorder Worksheet",
    "ResizeCol": "Resize Column",
    "ResizeCols": "Resize Columns",
    "ResizeRow": "Resize Row",
    "RevertTable": "Revert Table",
    "RoundToFixed": "Round To Fixed",
    "SortTableCols": "Sort Table Columns",
    "TextAlign": "Text Align",
    "UnHideWS": "Unhide Worksheet"
};
