//
// Autogenerated by Thrift Compiler (0.9.2)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//


StatusT = {
  'StatusOk' : 0,
  'StatusPerm' : 1,
  'StatusNoEnt' : 2,
  'StatusSrch' : 3,
  'StatusIntr' : 4,
  'StatusIO' : 5,
  'StatusNxIO' : 6,
  'Status2Big' : 7,
  'StatusNoExec' : 8,
  'StatusBadF' : 9,
  'StatusChild' : 10,
  'StatusAgain' : 11,
  'StatusNoMem' : 12,
  'StatusAccess' : 13,
  'StatusFault' : 14,
  'StatusNotBlk' : 15,
  'StatusBusy' : 16,
  'StatusExist' : 17,
  'StatusEof' : 18,
  'StatusXDev' : 19,
  'StatusNoDev' : 20,
  'StatusNotDir' : 21,
  'StatusIsDir' : 22,
  'StatusInval' : 23,
  'StatusNFile' : 24,
  'StatusMFile' : 25,
  'StatusNoTTY' : 26,
  'StatusTxtBsy' : 27,
  'StatusFBig' : 28,
  'StatusNoSpc' : 29,
  'StatusSPipe' : 30,
  'StatusROFS' : 31,
  'StatusMLink' : 32,
  'StatusPipe' : 33,
  'StatusDom' : 34,
  'StatusRange' : 35,
  'StatusDeadLk' : 36,
  'StatusNameTooLong' : 37,
  'StatusNoLck' : 38,
  'StatusNoSys' : 39,
  'StatusNotEmpty' : 40,
  'StatusLoop' : 41,
  'StatusNoMsg' : 42,
  'StatusIdRm' : 43,
  'StatusChRng' : 44,
  'StatusL2NSync' : 45,
  'StatusL3Hlt' : 46,
  'StatusL3Rst' : 47,
  'StatusLNRng' : 48,
  'StatusUnatch' : 49,
  'StatusNoCSI' : 50,
  'StatusL2Hlt' : 51,
  'StatusBadE' : 52,
  'StatusBadR' : 53,
  'StatusXFull' : 54,
  'StatusNoAno' : 55,
  'StatusBadRqC' : 56,
  'StatusBadSlt' : 57,
  'StatusBFont' : 58,
  'StatusNoStr' : 59,
  'StatusNoData' : 60,
  'StatusTime' : 61,
  'StatusNoSR' : 62,
  'StatusNoNet' : 63,
  'StatusNoPkg' : 64,
  'StatusRemote' : 65,
  'StatusNoLink' : 66,
  'StatusAdv' : 67,
  'StatusSRMnt' : 68,
  'StatusComm' : 69,
  'StatusProto' : 70,
  'StatusMultihop' : 71,
  'StatusDotDot' : 72,
  'StatusBadMsg' : 73,
  'StatusOverflow' : 74,
  'StatusNotUniq' : 75,
  'StatusBadFD' : 76,
  'StatusRemChg' : 77,
  'StatusLibAcc' : 78,
  'StatusLibBad' : 79,
  'StatusLibScn' : 80,
  'StatusLibMax' : 81,
  'StatusLibExec' : 82,
  'StatusIlSeq' : 83,
  'StatusRestart' : 84,
  'StatusStrPipe' : 85,
  'StatusUsers' : 86,
  'StatusNotSock' : 87,
  'StatusDestAddrReq' : 88,
  'StatusMsgSize' : 89,
  'StatusPrototype' : 90,
  'StatusNoProtoOpt' : 91,
  'StatusProtoNoSupport' : 92,
  'StatusSockTNoSupport' : 93,
  'StatusOpNotSupp' : 94,
  'StatusPFNoSupport' : 95,
  'StatusAFNoSupport' : 96,
  'StatusAddrInUse' : 97,
  'StatusAddrNotAvail' : 98,
  'StatusNetDown' : 99,
  'StatusNetUnreach' : 100,
  'StatusNetReset' : 101,
  'StatusConnAborted' : 102,
  'StatusConnReset' : 103,
  'StatusNoBufs' : 104,
  'StatusIsConn' : 105,
  'StatusNotConn' : 106,
  'StatusShutdown' : 107,
  'StatusTooManyRefs' : 108,
  'StatusTimedOut' : 109,
  'StatusConnRefused' : 110,
  'StatusHostDown' : 111,
  'StatusHostUnreach' : 112,
  'StatusAlready' : 113,
  'StatusInProgress' : 114,
  'StatusStale' : 115,
  'StatusUClean' : 116,
  'StatusNotNam' : 117,
  'StatusNAvail' : 118,
  'StatusIsNam' : 119,
  'StatusRemoteIo' : 120,
  'StatusDQuot' : 121,
  'StatusNoMedium' : 122,
  'StatusMediumType' : 123,
  'StatusCanceled' : 124,
  'StatusNoKey' : 125,
  'StatusKeyExpired' : 126,
  'StatusKeyRevoked' : 127,
  'StatusKeyRejected' : 128,
  'StatusOwnerDead' : 129,
  'StatusNotRecoverable' : 130,
  'StatusRFKill' : 131,
  'StatusHwPoison' : 132,
  'StatusTrunc' : 133,
  'StatusUnimpl' : 134,
  'StatusUnknown' : 135,
  'StatusMsgLibDeleteFailed' : 136,
  'StatusThrCreateFailed' : 137,
  'StatusThrAborted' : 138,
  'StatusConfigLibDevOpenFailed' : 139,
  'StatusConfigLibDevLSeekFailed' : 140,
  'StatusConfigLibFlashDevOpenFailed' : 141,
  'StatusConfigLibFlashDevLSeekFailed' : 142,
  'StatusConfigLibDeleteFailed' : 143,
  'StatusUsrNodeIncorrectParams' : 144,
  'StatusUnicodeUnsupported' : 145,
  'StatusEAIBadFlags' : 146,
  'StatusEAINoName' : 147,
  'StatusEAIFail' : 148,
  'StatusEAIService' : 149,
  'StatusEAINoData' : 150,
  'StatusEAIAddrFamily' : 151,
  'StatusEAINotCancel' : 152,
  'StatusEAIAllDone' : 153,
  'StatusEAIIDNEncode' : 154,
  'StatusLast' : 155,
  'StatusMore' : 156,
  'StatusCliUnknownCmd' : 157,
  'StatusCliParseError' : 158,
  'StatusSchedQueueLenExceeded' : 159,
  'StatusMsgFail' : 160,
  'StatusMsgOutOfMessages' : 161,
  'StatusMsgShutdown' : 162,
  'StatusNoSuchNode' : 163,
  'StatusNewTableCreated' : 164,
  'StatusNoSuchResultSet' : 165,
  'StatusDfAppendUnsupported' : 166,
  'StatusDfRemoveUnsupported' : 167,
  'StatusDfParseError' : 168,
  'StatusDfRecordCorrupt' : 169,
  'StatusDfFieldNoExist' : 170,
  'StatusDfUnknownFieldType' : 171,
  'StatusDfRecordNotFound' : 172,
  'StatusDfValNotFound' : 173,
  'StatusDfInvalidFormat' : 174,
  'StatusDfLocalFatptrOnly' : 175,
  'StatusDfValuesBufTooSmall' : 176,
  'StatusDfMaxValuesPerFieldExceeded' : 177,
  'StatusDfFieldTypeUnsupported' : 178,
  'StatusDfMaxDictionarySegmentsExceeded' : 179,
  'StatusDfBadRecordId' : 180,
  'StatusDfMaxRecordsExceeded' : 181,
  'StatusDfTypeMismatch' : 182,
  'StatusDsTooManyKeyValues' : 183,
  'StatusDsNotFound' : 184,
  'StatusDsLoadAlreadyStarted' : 185,
  'StatusDsUrlTooLong' : 186,
  'StatusDsInvalidUrl' : 187,
  'StatusDsCreateNotSupported' : 188,
  'StatusDsUnlinkNotSupported' : 189,
  'StatusDsRenameNotSupported' : 190,
  'StatusDsWriteNotSupported' : 191,
  'StatusDsSeekNotSupported' : 192,
  'StatusDsSeekFailed' : 193,
  'StatusDsMkDirNotSupported' : 194,
  'StatusDsRmDirNotSupported' : 195,
  'StatusDsLoadFailed' : 196,
  'StatusDsDatasetInUse' : 197,
  'StatusDsFormatTypeUnsupported' : 198,
  'StatusDsMysqlInitFailed' : 199,
  'StatusDsMysqlConnectFailed' : 200,
  'StatusDsMysqlQueryFailed' : 201,
  'StatusExODBCConnectFailed' : 202,
  'StatusExODBCCleanupFailed' : 203,
  'StatusExODBCAddNotSupported' : 204,
  'StatusExODBCBindFailed' : 205,
  'StatusExODBCTableCreationFailed' : 206,
  'StatusExODBCExportFailed' : 207,
  'StatusExODBCTableExists' : 208,
  'StatusExODBCTableDoesntExist' : 209,
  'StatusExTargetListRace' : 210,
  'StatusExTargetAlreadyExists' : 211,
  'StatusDsGetFileAttrNotSupported' : 212,
  'StatusDsGetFileAttrCompressed' : 213,
  'StatusReallocShrinkFailed' : 214,
  'StatusNsObjAlreadyExists' : 215,
  'StatusTableAlreadyExists' : 216,
  'StatusCliUnclosedQuotes' : 217,
  'StatusRangePartError' : 218,
  'StatusNewFieldNameIsBlank' : 219,
  'StatusNoDataDictForFormatType' : 220,
  'StatusBTreeNotFound' : 221,
  'StatusBTreeKeyTypeMismatch' : 222,
  'StatusBTreeDatasetMismatch' : 223,
  'StatusCmdNotComplete' : 224,
  'StatusInvalidResultSetId' : 225,
  'StatusPositionExceedResultSetSize' : 226,
  'StatusHandleInUse' : 227,
  'StatusCliLineTooLong' : 228,
  'StatusCliErrorReadFromFile' : 229,
  'StatusInvalidTableName' : 230,
  'StatusNsObjNameTooLong' : 231,
  'StatusApiUnexpectedEOF' : 232,
  'StatusStatsInvalidGroupId' : 233,
  'StatusStatsInvalidGroupName' : 234,
  'StatusInvalidHandle' : 235,
  'StatusThriftProtocolError' : 236,
  'StatusBTreeHasNoRoot' : 237,
  'StatusBTreeKeyNotFound' : 238,
  'StatusQaKeyValuePairNotFound' : 239,
  'StatusAstMalformedEvalString' : 240,
  'StatusAstNoSuchFunction' : 241,
  'StatusAstWrongNumberOfArgs' : 242,
  'StatusFieldNameTooLong' : 243,
  'StatusFieldNameAlreadyExists' : 244,
  'StatusXdfWrongNumberOfArgs' : 245,
  'StatusXdfUnaryOperandExpected' : 246,
  'StatusXdfTypeUnsupported' : 247,
  'StatusXdfDivByZero' : 248,
  'StatusXdfMixedTypeNotSupported' : 249,
  'StatusXdfAggregateOverflow' : 250,
  'StatusKvNotFound' : 251,
  'StatusXdbSlotPrettyVacant' : 252,
  'StatusNoDataInXdb' : 253,
  'StatusXdbLoadInProgress' : 254,
  'StatusXdbNotFound' : 255,
  'StatusXdbUninitializedCursor' : 256,
  'StatusQrTaskFailed' : 257,
  'StatusQrIdNonExist' : 258,
  'StatusQrJobNonExist' : 259,
  'StatusApiTaskFailed' : 260,
  'StatusAlreadyIndexed' : 261,
  'StatusEvalUnsubstitutedVariables' : 262,
  'StatusKvDstFull' : 263,
  'StatusModuleNotInit' : 264,
  'StatusMaxJoinFieldsExceeded' : 265,
  'StatusXdbKeyTypeAlreadySet' : 266,
  'StatusJoinTypeMismatch' : 267,
  'StatusJoinDhtMismatch' : 268,
  'StatusFailed' : 269,
  'StatusIllegalFileName' : 270,
  'StatusEmptyFile' : 271,
  'StatusEvalStringTooLong' : 272,
  'StatusTableDeleted' : 273,
  'StatusFailOpenFile' : 274,
  'StatusQueryFailed' : 275,
  'StatusQueryNeedsNewSession' : 276,
  'StatusCreateDagNodeFailed' : 277,
  'StatusDeleteDagNodeFailed' : 278,
  'StatusRenameDagNodeFailed' : 279,
  'StatusChangeDagNodeStateFailed' : 280,
  'StatusAggregateNoSuchField' : 281,
  'StatusAggregateLocalFnNeedArgument' : 282,
  'StatusAggregateAccNotInited' : 283,
  'StatusAggregateReturnValueNotScalar' : 284,
  'StatusNsMaximumObjectsReached' : 285,
  'StatusNsObjInUse' : 286,
  'StatusNsInvalidObjName' : 287,
  'StatusNsNotFound' : 288,
  'StatusDagNodeNotFound' : 289,
  'StatusUpdateDagNodeOperationNotSupported' : 290,
  'StatusMsgMaxPayloadExceeded' : 291,
  'StatusKvEntryNotFound' : 292,
  'StatusKvEntryNotEqual' : 293,
  'StatusStatsCouldNotGetMemUsedInfo' : 294,
  'StatusStatusFieldNotInited' : 295,
  'StatusAggNoSuchFunction' : 296,
  'StatusWaitKeyTimeout' : 297,
  'StatusVariableNameTooLong' : 298,
  'StatusDgDagHandleNotFound' : 299,
  'StatusDgInvalidDagName' : 300,
  'StatusDgDagNameTooLong' : 301,
  'StatusDgDagAlreadyExists' : 302,
  'StatusDgDagEmpty' : 303,
  'StatusDgDagNotEmpty' : 304,
  'StatusDgDagNoMore' : 305,
  'StatusDgDagHandleReserved' : 306,
  'StatusDgNodeInUse' : 307,
  'StatusDgDagNodeError' : 308,
  'StatusDgOperationNotSupported' : 309,
  'StatusDgDagNodeNotReady' : 310,
  'StatusDgFailToDestroyHandle' : 311,
  'StatusDsDatasetLoaded' : 312,
  'StatusDsDatasetNotReady' : 313,
  'StatusSessionNotFound' : 314,
  'StatusSessionExists' : 315,
  'StatusSessionNotInact' : 316,
  'StatusSessionNameInvalid' : 317,
  'StatusSessionError' : 318,
  'StatusSessionActiveElsewhere' : 319,
  'StatusDgDeleteOperationNotPermitted' : 320,
  'StatusUdfModuleLoadFailed' : 321,
  'StatusUdfModuleAlreadyExists' : 322,
  'StatusUdfModuleNotFound' : 323,
  'StatusUdfModuleEmpty' : 324,
  'StatusUdfModuleInvalidName' : 325,
  'StatusUdfModuleInvalidType' : 326,
  'StatusUdfModuleInvalidSource' : 327,
  'StatusUdfModuleSourceTooLarge' : 328,
  'StatusUdfFunctionLoadFailed' : 329,
  'StatusUdfFunctionNotFound' : 330,
  'StatusUdfFunctionNameTooLong' : 331,
  'StatusUdfFunctionTooManyParams' : 332,
  'StatusUdfVarNameTooLong' : 333,
  'StatusUdfUnsupportedType' : 334,
  'StatusUdfPersistInvalid' : 335,
  'StatusUdfPyConvert' : 336,
  'StatusUdfExecuteFailed' : 337,
  'StatusUdfInval' : 338,
  'StatusUdfDeletePartial' : 339,
  'StatusXcalarEvalTokenNameTooLong' : 340,
  'StatusNoConfigFile' : 341,
  'StatusCouldNotResolveSchema' : 342,
  'StatusDhtEmptyDhtName' : 343,
  'StatusDhtUpperBoundLessThanLowerBound' : 344,
  'StatusLogChecksumFailed' : 345,
  'StatusDhtDoesNotPreserveOrder' : 346,
  'StatusLogMaximumEntrySizeExceeded' : 347,
  'StatusLogCorruptHeader' : 348,
  'StatusLogCorrupt' : 349,
  'StatusLogVersionMismatch' : 350,
  'StatusKvInvalidKeyChar' : 351,
  'StatusDhtProtected' : 352,
  'StatusKvStoreNotFound' : 353,
  'StatusSSE42Unsupported' : 354,
  'StatusPyBadUdfName' : 355,
  'StatusLicExpired' : 356,
  'StatusLogHandleClosed' : 357,
  'StatusLogHandleInvalid' : 358,
  'StatusShutdownInProgress' : 359,
  'StatusOrderingNotSupported' : 360,
  'StatusHdfsNoConnect' : 361,
  'StatusHdfsNoDirectoryListing' : 362,
  'StatusCliCanvasTooSmall' : 363,
  'StatusDagParamInputTypeMismatch' : 364,
  'StatusParameterTooLong' : 365,
  'StatusExceedMaxScheduleTime' : 366,
  'StatusExceedMaxSchedulePeriod' : 367,
  'StatusXcalarApiNotParameterizable' : 368,
  'StatusQrNotFound' : 369,
  'StatusJoinOrderingMismatch' : 370,
  'StatusInvalidUserCookie' : 371,
  'StatusStTooManySchedTask' : 372,
  'StatusRowUnfinished' : 373,
  'StatusInputTooLarge' : 374,
  'StatusConfigInvalid' : 375,
  'StatusInvalNodeId' : 376,
<<<<<<< HEAD
  'StatusDsFallocateNotSupported' : 377,
  'StatusNoExtension' : 378,
  'StatusExportTargetNotSupported' : 379,
  'StatusExportInvalidCreateRule' : 380,
  'StatusExportNoColumns' : 381,
  'StatusExportTooManyColumns' : 382,
  'StatusExportColumnNameTooLong' : 383,
  'StatusExportEmptyResultSet' : 384,
  'StatusExportUnresolvedSchema' : 385,
  'StatusExportSFFileExists' : 386,
  'StatusExportSFFileDoesntExist' : 387,
  'StatusMonPortInvalid' : 388,
  'StatusExportSFFileDirDuplicate' : 389,
  'StatusExportSFFileCorrupted' : 390,
  'StatusExportSFFileRuleNeedsNewFile' : 391,
  'StatusExportSFFileRuleSizeTooSmall' : 392,
  'StatusExportSFSingleSplitConflict' : 393,
  'StatusExportSFAppendSepConflict' : 394,
  'StatusExportSFInvalidHeaderType' : 395,
  'StatusExportSFInvalidSplitType' : 396,
  'StatusVersionMismatch' : 397,
  'StatusFileCorrupt' : 398,
  'StatusApiFunctionInvalid' : 399,
  'StatusLibArchiveError' : 400,
  'StatusSendSocketFail' : 401,
  'StatusNodeSkipped' : 402,
  'StatusDfCastTruncationOccurred' : 403,
  'StatusEvalCastError' : 404,
  'StatusLogUnaligned' : 405,
  'StatusStrEncodingNotSupported' : 406,
  'StatusShmsgInterfaceClosed' : 407,
  'StatusOperationHasFinished' : 408,
  'StatusOpstatisticsNotAvail' : 409,
  'StatusRetinaParseError' : 410,
  'StatusUdfModuleOverwrittenSuccessfully' : 411,
  'StatusSupportFail' : 412,
  'StatusShmsgPayloadTooLarge' : 413,
  'StatusNoChild' : 414,
  'StatusXdbMaxSgElemsExceeded' : 415,
  'StatusAggregateResultNotFound' : 416,
<<<<<<< HEAD
  'StatusMaxRowSizeExceeded' : 417
=======
  'StatusNoLocalNodes' : 377,
  'StatusDsFallocateNotSupported' : 378,
  'StatusNoExtension' : 379,
  'StatusExportTargetNotSupported' : 380,
  'StatusExportInvalidCreateRule' : 381,
  'StatusExportNoColumns' : 382,
  'StatusExportTooManyColumns' : 383,
  'StatusExportColumnNameTooLong' : 384,
  'StatusExportEmptyResultSet' : 385,
  'StatusExportUnresolvedSchema' : 386,
  'StatusExportSFFileExists' : 387,
  'StatusExportSFFileDoesntExist' : 388,
  'StatusMonPortInvalid' : 389,
  'StatusExportSFFileDirDuplicate' : 390,
  'StatusExportSFFileCorrupted' : 391,
  'StatusExportSFFileRuleNeedsNewFile' : 392,
  'StatusExportSFFileRuleSizeTooSmall' : 393,
  'StatusExportSFSingleSplitConflict' : 394,
  'StatusExportSFAppendSepConflict' : 395,
  'StatusExportSFInvalidHeaderType' : 396,
  'StatusExportSFInvalidSplitType' : 397,
  'StatusVersionMismatch' : 398,
  'StatusFileCorrupt' : 399,
  'StatusApiFunctionInvalid' : 400,
  'StatusLibArchiveError' : 401,
  'StatusSendSocketFail' : 402,
  'StatusNodeSkipped' : 403,
  'StatusDfCastTruncationOccurred' : 404,
  'StatusEvalCastError' : 405,
  'StatusLogUnaligned' : 406,
  'StatusStrEncodingNotSupported' : 407,
  'StatusShmsgInterfaceClosed' : 408,
  'StatusOperationHasFinished' : 409,
  'StatusOpstatisticsNotAvail' : 410,
  'StatusRetinaParseError' : 411,
  'StatusUdfModuleOverwrittenSuccessfully' : 412,
  'StatusSupportFail' : 413,
  'StatusShmsgPayloadTooLarge' : 414,
  'StatusNoChild' : 415,
  'StatusXdbMaxSgElemsExceeded' : 416,
  'StatusAggregateResultNotFound' : 417,
  'StatusMaxRowSizeExceeded' : 418,
  'StatusInvalidDatasetName' : 419,
  'StatusMaxStatsGroupExceeded' : 420
>>>>>>> b6a2084... GUI-4099 Match latest trunk and also expose Udf Error status
=======
  'StatusMaxRowSizeExceeded' : 417,
  'StatusInvalidDatasetName' : 418,
  'StatusMaxStatsGroupExceeded' : 419
>>>>>>> 40921b1... GUI-4052 Update thrift for 0.9.9.9
};
StatusTStr = {0 : 'Success',
1 : 'Operation not permitted',
2 : 'No such file or directory',
3 : 'No such process',
4 : 'Interrupted system call',
5 : 'I/O error',
6 : 'No such device or address',
7 : 'Argument list too long',
8 : 'Exec format error',
9 : 'Bad file number',
10 : 'No child processes',
11 : 'Try again',
12 : 'Out of memory',
13 : 'Permission denied',
14 : 'Bad address',
15 : 'Block device required',
16 : 'Device or resource busy',
17 : 'File exists',
18 : 'End of file',
19 : 'Cross-device link',
20 : 'No such device',
21 : 'Not a directory',
22 : 'Is a directory',
23 : 'Invalid argument',
24 : 'File table overflow',
25 : 'Too many open files',
26 : 'Not a typewriter',
27 : 'Text file busy',
28 : 'File too large',
29 : 'No space left on device',
30 : 'Illegal seek',
31 : 'Read-only file system',
32 : 'Too many links',
33 : 'Broken pipe',
34 : 'Math argument out of domain of func',
35 : 'Math result not representable',
36 : 'Resource deadlock would occur',
37 : 'File name too long',
38 : 'No record locks available',
39 : 'Function not implemented',
40 : 'Directory not empty',
41 : 'Too many symbolic links encountered',
42 : 'No message of desired type',
43 : 'Identifier removed',
44 : 'Channel number out of range',
45 : 'Level 2 not synchronized',
46 : 'Level 3 halted',
47 : 'Level 3 reset',
48 : 'Link number out of range',
49 : 'Protocol driver not attached',
50 : 'No CSI structure available',
51 : 'Level 2 halted',
52 : 'Invalid exchange',
53 : 'Invalid request descriptor',
54 : 'Exchange full',
55 : 'No anode',
56 : 'Invalid request code',
57 : 'Invalid slot',
58 : 'Bad font file format',
59 : 'Device not a stream',
60 : 'No data available',
61 : 'Timer expired',
62 : 'Out of streams resources',
63 : 'Machine is not on the network',
64 : 'Package not installed',
65 : 'Object is remote',
66 : 'Link has been severed',
67 : 'Advertise error',
68 : 'Srmount error',
69 : 'Communication error on send',
70 : 'Protocol error',
71 : 'Multihop attempted',
72 : 'RFS specific error',
73 : 'Not a data message',
74 : 'Value too large for defined data type',
75 : 'Name not unique on network',
76 : 'File descriptor in bad state',
77 : 'Remote address changed',
78 : 'Can not access a needed shared library',
79 : 'Accessing a corrupted shared library',
80 : '.lib section in a.out corrupted',
81 : 'Attempting to link in too many shared libraries',
82 : 'Cannot exec a shared library directly',
83 : 'Illegal byte sequence',
84 : 'Interrupted system call should be restarted',
85 : 'Streams pipe error',
86 : 'Too many users',
87 : 'Socket operation on non-socket',
88 : 'Destination address required',
89 : 'Message too long',
90 : 'Protocol wrong type for socket',
91 : 'Protocol not available',
92 : 'Protocol not supported',
93 : 'Socket type not supported',
94 : 'Operation not supported on transport endpoint',
95 : 'Protocol family not supported',
96 : 'Address family not supported by protocol',
97 : 'Address already in use',
98 : 'Cannot assign requested address',
99 : 'Network is down',
100 : 'Network is unreachable',
101 : 'Network dropped connection because of reset',
102 : 'Software caused connection abort',
103 : 'Connection reset by peer',
104 : 'No buffer space available',
105 : 'Transport endpoint is already connected',
106 : 'Transport endpoint is not connected',
107 : 'Cannot send after transport endpoint shutdown',
108 : 'Too many references: cannot splice',
109 : 'Connection timed out',
110 : 'Connection refused',
111 : 'Host is down',
112 : 'No route to host',
113 : 'Operation already in progress',
114 : 'Operation now in progress',
115 : 'Stale NFS file handle',
116 : 'Structure needs cleaning',
117 : 'Not a XENIX named type file',
118 : 'No XENIX semaphores available',
119 : 'Is a named type file',
120 : 'Remote I/O error',
121 : 'Quota exceeded',
122 : 'No medium found',
123 : 'Wrong medium type',
124 : 'Operation Canceled',
125 : 'Required key not available',
126 : 'Key has expired',
127 : 'Key has been revoked',
128 : 'Key was rejected by service',
129 : 'Owner died',
130 : 'State not recoverable',
131 : 'Operation not possible due to RF-kill',
132 : 'Memory page has hardware error',
133 : 'Output truncated',
134 : 'Not implemented',
135 : 'Unknown error',
136 : 'msgLib delete() failed',
137 : 'thrCreate() failed',
138 : 'Thread was aborted',
139 : 'libConfig open() failed',
140 : 'libConfig seek failed',
141 : 'libConfig flash open() failed',
142 : 'libConfig flash lseek failed',
143 : 'libConfig configDelete() failed',
144 : 'Incorrect params to UsrNodeMain',
145 : 'Unicode strings are not supported by this function',
146 : 'Invalid value for ai_flags field',
147 : 'NAME or SERVICE is unknown',
148 : 'Non-recoverable failure in name resolution',
149 : 'SERVICE not supported for socket type',
150 : 'No address associated with NAME',
151 : 'Address family for NAME not supported',
152 : 'Request not canceled',
153 : 'All requests done',
154 : 'IDN encoding failed',
155 : 'Last page',
156 : 'More data to follow. Not end of stream',
157 : 'Command not found',
158 : 'Error parsing command',
159 : 'Sched queue length exceeded',
160 : 'Failure in the message layer',
161 : 'Out of messages',
162 : 'Shutdown message',
163 : 'No such node exists in cluster',
164 : 'New table created',
165 : 'No such result set',
166 : 'Data format does not support appending fields',
167 : 'Data format does not support removing fields',
168 : 'Failed to parse data format value',
169 : 'Record data format is corrupt',
170 : 'Field does not exist within record',
171 : 'Unknown field type',
172 : 'Failed to find a record corresponding to the given record number',
173 : 'Searched value was not found',
174 : 'Invalid data format',
175 : 'Context does not support dereferencing a remote Fatptr',
176 : 'Values buffer is too small to store even a single field value',
177 : 'Too many values discovered for a single field',
178 : 'Field type is not supported in this format',
179 : 'Maximum number of dictionary segments reached',
180 : 'Bad record identifier',
181 : 'System has exceeded the configured maximum number of records; try increasing Constants.DfMaxRecords',
182 : 'Type mismatch during index creation',
183 : 'Intended key has more than a single',
184 : 'Dataset not found',
185 : 'Loading of this dataset has already started',
186 : 'URL length is too large',
187 : 'URL is not valid',
188 : 'Data source type does not support file creation',
189 : 'Data source type does not support file deletion',
190 : 'Data source type does not support file rename',
191 : 'Data source type does not support writing',
192 : 'Data source type does not support seeking',
193 : 'Seek failed',
194 : 'Data source type does not support directory creation',
195 : 'Data source type does not support directory removal',
196 : 'Loading of this dataset failed',
197 : 'Dataset is in use',
198 : 'Data source does not support specified data format type',
199 : 'Failed to initialize the mysql client library',
200 : 'Failed to connect to mysql server & database',
201 : 'Failed to run query against mysql table',
202 : 'Failed to connect to the specified Data Source Name',
203 : 'Failed to cleanup an internal nested error',
204 : 'Contact your server administrator to add a new ODBC database connection',
205 : 'Failed to bind variable to ODBC parameter',
206 : 'Failed to create ODBC table',
207 : 'Failed to export record to ODBC table',
208 : 'Export table already exists',
209 : 'Export table does not exist',
210 : 'A target was added while targets were being listed',
211 : 'The requested target already exists',
212 : 'Data source type does not support file attributes',
213 : 'Could not determine uncompressed file size',
214 : 'Failed to shrink memory allocation',
215 : 'name already exists',
216 : 'Table already exists',
217 : 'Invalid command. Could not find matching quotes',
218 : 'Failed to compute the range partition hash function',
219 : 'Field name cannot be blank',
220 : 'No data dictionary defined for format type',
221 : 'Could not find BTree associated with table handle',
222 : 'BTree key type does not match insert message key type',
223 : 'BTree dataset identifier does not match insert message dataset identifier',
224 : 'Command is still running',
225 : 'Invalid result set ID',
226 : 'Cannot set position to beyond result set size',
227 : 'Table is in use right now and cannot be deleted',
228 : 'One of the lines in the CLI is too long',
229 : 'Encountered an error reading from file',
230 : 'Invalid table name',
231 : 'Table or dataset name is too long',
232 : 'Unexpected end-of-file attempting to read from socket',
233 : 'stats group ID is invalid',
234 : 'stats group name is invalid',
235 : 'Invalid handle',
236 : 'Error communicating across thrift connection',
237 : 'Malformed BTree. BTree has no root',
238 : 'Could not find key in BTree',
239 : 'Could not find key-value pair',
240 : 'Malformed eval string',
241 : 'Could not find function',
242 : 'Wrong number of arguments passed to function',
243 : 'The new field name is too long',
244 : 'The field name you entered already exists',
245 : 'Wrong number of operands provided to operator',
246 : 'Operation requires 1 operand',
247 : 'Operation is not supported on input type',
248 : 'Divide by zero error',
249 : 'Mixed type is not supported in this xdf',
250 : 'Aggregate output has insufficient size to store the result',
251 : 'KV not found in table',
252 : 'Listen to: Pretty Vacant by Sex Pistols',
253 : 'Xdb is vacant',
254 : 'Xdb is loading data',
255 : 'Stale XdbHandle, Xdb not found',
256 : 'Xdb cursor is uninitialized',
257 : 'Task(s) failed',
258 : 'The query ID does not exist',
259 : 'There is no query job associate with this ID',
260 : 'API Task Failed',
261 : 'The source table is already indexed by the specified key',
262 : 'Some variables are undefined during evaluation',
263 : 'The destination key/value buffer was full',
264 : 'The module is not initialized yet',
265 : 'Maximum number of joined values exceeded',
266 : 'Xdb key type is already set',
267 : 'Joins may only be performed on tables with the same key type',
268 : 'Joins may only be performed on tables with the same DHT',
269 : 'Failed',
270 : 'FileName entered is illegal',
271 : 'File contents are empty',
272 : 'Eval string entered is too long',
273 : 'Table has been deleted',
274 : 'Cant open the file',
275 : 'Query failed',
276 : 'Batch Query needs to run in new session',
277 : 'Failed to create a DAG node',
278 : 'Failed to delete a DAG node',
279 : 'Failed to rename a DAG node',
280 : 'Failed to change the state of DAG node',
281 : 'No such field found while running aggregate',
282 : 'Local function requires argument',
283 : 'Accumulator is not inited',
284 : 'Return value of aggregate is not a scalar',
285 : 'Maximum number of tables and datasets reached',
286 : 'Table or dataset is in use',
287 : 'Bad table or dataset name',
288 : 'Table or dataset not found',
289 : 'Could not find dag node',
290 : 'Update operation not supported',
291 : 'Message response size would exceed maximum message payload size',
292 : 'The requested key was not found',
293 : 'The requested key\'s value doesn\'t equal the provided value',
294 : 'Could not get amount of memory consumed',
295 : 'No valid status received!',
296 : 'No such aggregate operator!',
297 : 'timed out waiting for table key type to resolve',
298 : 'Variable name in evalString too long',
299 : 'DAG handle not found',
300 : 'DAG name is invalid',
301 : 'DAG name is too long',
302 : 'DAG name already exists',
303 : 'DAG is empty',
304 : 'DAG is not empty',
305 : 'No more DAG nodes available',
306 : 'DAG handle is not available',
307 : 'DAG Node is currently in use',
308 : 'DAG Node is in error state',
309 : 'Operation not supported on the target',
310 : 'DAG node is not ready',
311 : 'Fail to destroy DAG handle',
312 : 'Dataset has been loaded',
313 : 'Dataset is not ready',
314 : 'Session does not exist',
315 : 'The session already exists',
316 : 'The target session was not inactive',
317 : 'The name or pattern supplied is not allowed',
318 : 'The session has an unrecoverable error',
319 : 'The session is active on another node',
320 : 'The delete operation is not permitted',
321 : 'Failed to load UDF module',
322 : 'A module with the given name already exists',
323 : 'The specified module was not found',
324 : 'The given module contains no functions',
325 : 'Module name is invalid',
326 : 'Module type is invalid',
327 : 'Module source is invalid',
328 : 'Module source is too large',
329 : 'Failed to load UDF function',
330 : 'The specified function was not found in the given module',
331 : 'UDF function name exceeds allowed length',
332 : 'UDF function has too many parameters',
333 : 'UDF variable or parameter name exceeds allowed length',
334 : 'Variable type not supported by UDF',
335 : 'Persisted UDF is invalid',
336 : 'Failed to convert value to python data type',
337 : 'Failed to execute UDF',
338 : 'Invalid argument passed to UDF',
339 : 'Failed to delete UDF on all nodes',
340 : 'Token name in evalString is too long',
341 : 'No configuration file specified',
342 : 'Could not resolve result set schema',
343 : 'DHT name is empty',
344 : 'Upper bound is less than lower bound',
345 : 'Checksum validation failed while reading log entry',
346 : 'DHT chosen doesn\'t preserve sorted order!',
347 : 'Maximum log entry size exceeded',
348 : 'Log entry header is corrupt',
349 : 'Log format not as expected',
350 : 'Unrecognized log version',
351 : 'Invalid KvStore key character',
352 : 'System DHTs may not be modified',
353 : 'The requested KvStore doesn\'t exist',
354 : 'The CPU does not support Intel SSE 4.2 instructions',
355 : 'Illegal character in UDF name',
356 : 'Xcalar license has expired',
357 : 'The log file was already closed',
358 : 'The log handle is not valid',
359 : 'The cluster is in the process of shutting down',
360 : 'Chosen ordering is not supported',
361 : 'Failed to connect to HDFS volume',
362 : 'Failed to get HDFS directory listing',
363 : 'Available area is too small to render graph',
364 : 'Mismatch between parameter type and node type',
365 : 'The Parameter is too long',
366 : 'Scheduled time may not exceed one year',
367 : 'Scheduled period may not exceed one year',
368 : 'The selected API is not parameterizable',
369 : 'Could not find query record associated with the query id',
370 : 'Joins may only be performed on tables with the same ordering',
371 : 'Invalid user cookie provided',
372 : 'Too many scheduled tasks',
373 : 'Row has not been completely demystified',
374 : 'Input is too large',
375 : 'Failed to parse Xcalar configuration file',
376 : 'The node ID is invalid',
<<<<<<< HEAD
377 : 'Data source type does not support fallocate',
378 : 'No file extension',
379 : 'Export target is not supported',
380 : 'Invalid creation rule specified',
381 : 'No columns specified for export',
382 : 'Too many columns specified for export',
383 : 'Specified column name too long',
384 : 'Empty result set cannot be exported',
385 : 'Export requires a known schema',
386 : 'Export file already exists',
387 : 'Export file doesn\'t exist',
388 : 'Monitor port number is invalid',
389 : 'Export file and directory both exist with the same base name',
390 : 'Files were corrupted during export',
391 : 'Export file requires a new file be created',
392 : 'Specified max export file size too small',
393 : 'Cannot export to a single file while specifying header should be separate',
394 : 'Cannot export append with a separate header file',
395 : 'Invalid header type specified',
396 : 'Invalid split type specified',
397 : 'File version is unsupported',
398 : 'Detected a file corruption',
399 : 'An invalid request was sent to Xcalar',
400 : 'Error occurred when using libarchive',
401 : 'Failed to initialize send socket',
402 : 'Node was skipped due to a previous error',
403 : 'Field value truncated during cast',
404 : 'Cast operation failed',
405 : 'Log buffer is not aligned',
406 : 'String encoding not supported',
407 : 'Messaging interface with other process has been closed',
408 : 'Operation has finished',
409 : 'Operation statistics are not avaiable',
410 : 'Failed to parse retina file',
411 : 'Successfully overwrote UDF module',
412 : 'Support bundle generation failed',
413 : 'Message payload too large to fit within message',
414 : 'No childnode is available to process the operation',
415 : 'Number of pages in an Xdb slot exceeds max extent sg elements',
416 : 'Could not find aggregate result',
<<<<<<< HEAD
417 : 'Maximum row size was exceeded'
=======
377 : 'There are no local nodes in the confiruation file',
378 : 'Data source type does not support fallocate',
379 : 'No file extension',
380 : 'Export target is not supported',
381 : 'Invalid creation rule specified',
382 : 'No columns specified for export',
383 : 'Too many columns specified for export',
384 : 'Specified column name too long',
385 : 'Empty result set cannot be exported',
386 : 'Export requires a known schema',
387 : 'Export file already exists',
388 : 'Export file doesn\'t exist',
389 : 'Monitor port number is invalid',
390 : 'Export file and directory both exist with the same base name',
391 : 'Files were corrupted during export',
392 : 'Export file requires a new file be created',
393 : 'Specified max export file size too small',
394 : 'Cannot export to a single file while specifying header should be separate',
395 : 'Cannot export append with a separate header file',
396 : 'Invalid header type specified',
397 : 'Invalid split type specified',
398 : 'File version is unsupported',
399 : 'Detected a file corruption',
400 : 'An invalid request was sent to Xcalar',
401 : 'Error occurred when using libarchive',
402 : 'Failed to initialize send socket',
403 : 'Node was skipped due to a previous error',
404 : 'Field value truncated during cast',
405 : 'Cast operation failed',
406 : 'Log buffer is not aligned',
407 : 'String encoding not supported',
408 : 'Messaging interface with other process has been closed',
409 : 'Operation has finished',
410 : 'Operation statistics are not avaiable',
411 : 'Failed to parse retina file',
412 : 'Successfully overwrote UDF module',
413 : 'Support bundle generation failed',
414 : 'Message payload too large to fit within message',
415 : 'No childnode is available to process the operation',
416 : 'Number of pages in an Xdb slot exceeds max extent sg elements',
417 : 'Could not find aggregate result',
418 : 'Maximum row size was exceeded',
419 : 'Invalid dataset name provided',
420 : 'Max statistics group size was exceeded'
>>>>>>> b6a2084... GUI-4099 Match latest trunk and also expose Udf Error status
=======
417 : 'Maximum row size was exceeded',
418 : 'Invalid dataset name provided',
419 : 'Max statistics group size was exceeded'
>>>>>>> 40921b1... GUI-4052 Update thrift for 0.9.9.9
};
