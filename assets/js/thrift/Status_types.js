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
  'StatusXdfFloatNan' : 249,
  'StatusXdfMixedTypeNotSupported' : 250,
  'StatusXdfAggregateOverflow' : 251,
  'StatusKvNotFound' : 252,
  'StatusXdbSlotPrettyVacant' : 253,
  'StatusNoDataInXdb' : 254,
  'StatusXdbLoadInProgress' : 255,
  'StatusXdbNotFound' : 256,
  'StatusXdbUninitializedCursor' : 257,
  'StatusQrTaskFailed' : 258,
  'StatusQrIdNonExist' : 259,
  'StatusQrJobNonExist' : 260,
  'StatusQrJobRunning' : 261,
  'StatusApiTaskFailed' : 262,
  'StatusAlreadyIndexed' : 263,
  'StatusEvalUnsubstitutedVariables' : 264,
  'StatusKvDstFull' : 265,
  'StatusModuleNotInit' : 266,
  'StatusMaxJoinFieldsExceeded' : 267,
  'StatusXdbKeyTypeAlreadySet' : 268,
  'StatusJoinTypeMismatch' : 269,
  'StatusJoinDhtMismatch' : 270,
  'StatusFailed' : 271,
  'StatusIllegalFileName' : 272,
  'StatusEmptyFile' : 273,
  'StatusEvalStringTooLong' : 274,
  'StatusTableDeleted' : 275,
  'StatusFailOpenFile' : 276,
  'StatusQueryFailed' : 277,
  'StatusQueryNeedsNewSession' : 278,
  'StatusCreateDagNodeFailed' : 279,
  'StatusDeleteDagNodeFailed' : 280,
  'StatusRenameDagNodeFailed' : 281,
  'StatusChangeDagNodeStateFailed' : 282,
  'StatusAggregateNoSuchField' : 283,
  'StatusAggregateLocalFnNeedArgument' : 284,
  'StatusAggregateAccNotInited' : 285,
  'StatusAggregateReturnValueNotScalar' : 286,
  'StatusNsMaximumObjectsReached' : 287,
  'StatusNsObjInUse' : 288,
  'StatusNsInvalidObjName' : 289,
  'StatusNsNotFound' : 290,
  'StatusDagNodeNotFound' : 291,
  'StatusUpdateDagNodeOperationNotSupported' : 292,
  'StatusMsgMaxPayloadExceeded' : 293,
  'StatusKvEntryNotFound' : 294,
  'StatusKvEntryNotEqual' : 295,
  'StatusStatsCouldNotGetMemUsedInfo' : 296,
  'StatusStatusFieldNotInited' : 297,
  'StatusAggNoSuchFunction' : 298,
  'StatusWaitKeyTimeout' : 299,
  'StatusVariableNameTooLong' : 300,
  'StatusDgDagNotFound' : 301,
  'StatusDgInvalidDagName' : 302,
  'StatusDgDagNameTooLong' : 303,
  'StatusDgDagAlreadyExists' : 304,
  'StatusDgDagEmpty' : 305,
  'StatusDgDagNotEmpty' : 306,
  'StatusDgDagNoMore' : 307,
  'StatusDgDagReserved' : 308,
  'StatusDgNodeInUse' : 309,
  'StatusDgDagNodeError' : 310,
  'StatusDgOperationNotSupported' : 311,
  'StatusDgDagNodeNotReady' : 312,
  'StatusDgFailToDestroyHandle' : 313,
  'StatusDsDatasetLoaded' : 314,
  'StatusDsDatasetNotReady' : 315,
  'StatusSessionNotFound' : 316,
  'StatusSessionExists' : 317,
  'StatusSessionNotInact' : 318,
  'StatusSessionNameInvalid' : 319,
  'StatusSessionError' : 320,
  'StatusSessionActiveElsewhere' : 321,
  'StatusDgDeleteOperationNotPermitted' : 322,
  'StatusUdfModuleLoadFailed' : 323,
  'StatusUdfModuleAlreadyExists' : 324,
  'StatusUdfModuleNotFound' : 325,
  'StatusUdfModuleEmpty' : 326,
  'StatusUdfModuleInvalidName' : 327,
  'StatusUdfModuleInvalidType' : 328,
  'StatusUdfModuleInvalidSource' : 329,
  'StatusUdfModuleSourceTooLarge' : 330,
  'StatusUdfFunctionLoadFailed' : 331,
  'StatusUdfFunctionNotFound' : 332,
  'StatusUdfFunctionNameTooLong' : 333,
  'StatusUdfFunctionTooManyParams' : 334,
  'StatusUdfVarNameTooLong' : 335,
  'StatusUdfUnsupportedType' : 336,
  'StatusUdfPersistInvalid' : 337,
  'StatusUdfPyConvert' : 338,
  'StatusUdfExecuteFailed' : 339,
  'StatusUdfInval' : 340,
  'StatusUdfDeletePartial' : 341,
  'StatusXcalarEvalTokenNameTooLong' : 342,
  'StatusNoConfigFile' : 343,
  'StatusCouldNotResolveSchema' : 344,
  'StatusDhtEmptyDhtName' : 345,
  'StatusDhtUpperBoundLessThanLowerBound' : 346,
  'StatusLogChecksumFailed' : 347,
  'StatusDhtDoesNotPreserveOrder' : 348,
  'StatusLogMaximumEntrySizeExceeded' : 349,
  'StatusLogCorruptHeader' : 350,
  'StatusLogCorrupt' : 351,
  'StatusLogVersionMismatch' : 352,
  'StatusKvInvalidKeyChar' : 353,
  'StatusDhtProtected' : 354,
  'StatusKvStoreNotFound' : 355,
  'StatusSSE42Unsupported' : 356,
  'StatusPyBadUdfName' : 357,
  'StatusLicInputInvalid' : 358,
  'StatusLicFileOpen' : 359,
  'StatusLicFileRead' : 360,
  'StatusLicFileWrite' : 361,
  'StatusLicPubKeyMissing' : 362,
  'StatusLicPubKeyErr' : 363,
  'StatusLicPubKeyIdx' : 364,
  'StatusLicMissing' : 365,
  'StatusLicErr' : 366,
  'StatusLicSignatureInvalid' : 367,
  'StatusLicBase32MapInvalid' : 368,
  'StatusLicBase32ValInvalid' : 369,
  'StatusLicMD5Invalid' : 370,
  'StatusLicUnkError' : 371,
  'StatusLicInvalid' : 372,
  'StatusLicWrongSize' : 373,
  'StatusLicExpired' : 374,
  'StatusLogHandleClosed' : 375,
  'StatusLogHandleInvalid' : 376,
  'StatusShutdownInProgress' : 377,
  'StatusOrderingNotSupported' : 378,
  'StatusHdfsNoConnect' : 379,
  'StatusHdfsNoDirectoryListing' : 380,
  'StatusCliCanvasTooSmall' : 381,
  'StatusDagParamInputTypeMismatch' : 382,
  'StatusParameterTooLong' : 383,
  'StatusExceedMaxScheduleTime' : 384,
  'StatusExceedMaxSchedulePeriod' : 385,
  'StatusXcalarApiNotParameterizable' : 386,
  'StatusQrNotFound' : 387,
  'StatusJoinOrderingMismatch' : 388,
  'StatusInvalidUserCookie' : 389,
  'StatusStTooManySchedTask' : 390,
  'StatusRowUnfinished' : 391,
  'StatusInputTooLarge' : 392,
  'StatusConfigInvalid' : 393,
  'StatusInvalNodeId' : 394,
  'StatusNoLocalNodes' : 395,
  'StatusDsFallocateNotSupported' : 396,
  'StatusNoExtension' : 397,
  'StatusExportTargetNotSupported' : 398,
  'StatusExportInvalidCreateRule' : 399,
  'StatusExportNoColumns' : 400,
  'StatusExportTooManyColumns' : 401,
  'StatusExportColumnNameTooLong' : 402,
  'StatusExportEmptyResultSet' : 403,
  'StatusExportUnresolvedSchema' : 404,
  'StatusExportSFFileExists' : 405,
  'StatusExportSFFileDoesntExist' : 406,
  'StatusMonPortInvalid' : 407,
  'StatusExportSFFileDirDuplicate' : 408,
  'StatusExportSFFileCorrupted' : 409,
  'StatusExportSFFileRuleNeedsNewFile' : 410,
  'StatusExportSFFileRuleSizeTooSmall' : 411,
  'StatusExportSFSingleSplitConflict' : 412,
  'StatusExportSFAppendSepConflict' : 413,
  'StatusExportSFAppendSingleHeader' : 414,
  'StatusExportSFInvalidHeaderType' : 415,
  'StatusExportSFInvalidSplitType' : 416,
  'StatusExportSFMaxSizeZero' : 417,
  'StatusVersionMismatch' : 418,
  'StatusFileCorrupt' : 419,
  'StatusApiFunctionInvalid' : 420,
  'StatusLibArchiveError' : 421,
  'StatusSendSocketFail' : 422,
  'StatusNodeSkipped' : 423,
  'StatusDfCastTruncationOccurred' : 424,
  'StatusEvalCastError' : 425,
  'StatusLogUnaligned' : 426,
  'StatusStrEncodingNotSupported' : 427,
  'StatusShmsgInterfaceClosed' : 428,
  'StatusOperationHasFinished' : 429,
  'StatusOpstatisticsNotAvail' : 430,
  'StatusRetinaParseError' : 431,
  'StatusRetinaTooManyColumns' : 432,
  'StatusUdfModuleOverwrittenSuccessfully' : 433,
  'StatusSupportFail' : 434,
  'StatusShmsgPayloadTooLarge' : 435,
  'StatusNoChild' : 436,
  'StatusChildTerminated' : 437,
  'StatusXdbMaxSgElemsExceeded' : 438,
  'StatusAggregateResultNotFound' : 439,
  'StatusMaxRowSizeExceeded' : 440,
  'StatusMaxDirectoryDepthExceeded' : 441,
  'StatusDirectorySubdirOpenFailed' : 442,
  'StatusInvalidDatasetName' : 443,
  'StatusMaxStatsGroupExceeded' : 444,
  'StatusLrqDuplicateUserDefinedFields' : 445,
  'StatusTypeConversionError' : 446,
  'StatusNotSupportedInProdBuild' : 447,
  'StatusOutOfFaultInjModuleSlots' : 448,
  'StatusNoSuchErrorpointModule' : 449,
  'StatusNoSuchErrorpoint' : 450,
  'StatusAllFilesEmpty' : 451,
  'StatusStatsGroupNameTooLong' : 452,
  'StatusStatsNameTooLong' : 453,
  'StatusMaxStatsExceeded' : 454,
  'StatusStatsGroupIsFull' : 455,
  'StatusNoMatchingFiles' : 456,
  'StatusFieldNotFound' : 457,
  'StatusImmediateNameCollision' : 458,
  'StatusFatptrPrefixCollision' : 459,
  'StatusListFilesNotSupported' : 460,
  'StatusAlreadyLoadDone' : 461,
  'StatusSkipRecordNeedsDelim' : 462,
  'StatusNoParent' : 463,
  'StatusRebuildDagFailed' : 464,
  'StatusStackSizeTooSmall' : 465,
  'StatusTargetDoesntExist' : 466,
  'StatusExODBCRemoveNotSupported' : 467,
  'StatusFunctionalTestDisabled' : 468,
  'StatusFunctionalTestNumFuncTestExceeded' : 469,
  'StatusTargetCorrupted' : 470,
  'StatusUdfPyConvertFromFailed' : 471,
  'StatusHdfsWRNotSupported' : 472,
  'StatusFunctionalTestNoTablesLeft' : 473,
  'StatusFunctionalTestTableEmpty' : 474,
  'StatusRegexCompileFailed' : 475,
  'StatusUdfNotFound' : 476,
  'StatusApisWorkTooManyOutstanding' : 477,
  'StatusInvalidUserNameLen' : 478,
  'StatusUdfPyInjectFailed' : 479,
  'StatusUsrNodeInited' : 480,
  'StatusFileListParseError' : 481,
  'StatusLoadArgsInvalid' : 482,
  'StatusAllWorkDone' : 483,
  'StatusUdfAlreadyExists' : 484,
  'StatusUdfFunctionTooFewParams' : 485,
  'StatusDgOperationInError' : 486,
  'StatusAppNameInvalid' : 487,
  'StatusAppHostTypeInvalid' : 488,
  'StatusAppExecTooBig' : 489,
  'StatusRccInitErr' : 490,
  'StatusRccDefault' : 491,
  'StatusRccNotFound' : 492,
  'StatusRccElemNotFound' : 493,
  'StatusRccIncompatibleState' : 494,
  'StatusGvmInvalidAction' : 495,
  'StatusGlobalVariableNotFound' : 496,
  'StatusCorruptedOutputSize' : 497,
  'StatusDatasetNameAlreadyExists' : 498,
  'StatusDatasetAlreadyDeleted' : 499,
  'StatusRetinaNotFound' : 500,
  'StatusDhtNotFound' : 501,
  'StatusTableNotFound' : 502,
  'StatusRetinaTooManyParameters' : 503,
  'StatusConfigParamImmutable' : 504,
  'StatusOperationInError' : 505,
  'StatusOperationCancelled' : 506,
  'StatusQrQueryNotExist' : 507,
  'StatusDgParentNodeNotExist' : 508,
  'StatusLoadAppNotExist' : 509,
  'StatusAppOutParseFail' : 510,
  'StatusFaultInjection' : 511,
  'StatusFaultInjection2PC' : 512,
  'StatusExportAppNotExist' : 513,
  'StatusSessionBadActiveNode' : 514,
  'StatusNoXdbPageBcMem' : 515,
  'StatusAppFlagsInvalid' : 516,
  'StatusQueryJobProcessing' : 517,
  'StatusTwoPcBarMsgInvalid' : 518,
  'StatusTwoPcBarTimeout' : 519,
  'StatusTooManyChildren' : 520,
  'StatusMaxFileLimitReached' : 521,
  'StatusApiWouldBlock' : 522,
  'StatusExportSFSingleHeaderConflict' : 523,
  'StatusAggFnInClass1Ast' : 524,
  'StatusDagNodeDropped' : 525,
  'StatusXdbSlotHasActiveCursor' : 526,
  'StatusProtobufDecodeError' : 527,
  'StatusAppLoadFailed' : 528,
  'StatusAppDoesNotExist' : 529,
  'StatusNotShared' : 530,
  'StatusProtobufEncodeError' : 531,
  'StatusJsonError' : 532,
  'StatusMsgStreamNotFound' : 533,
  'StatusUnderflow' : 534,
  'StatusPageCacheFull' : 535,
  'StatusSchedTaskFunctionalityRemoved' : 536
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
12 : 'Out of resources (Swap)',
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
204 : 'ODBC based database connections must be created outside of Xcalar',
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
249 : 'Operation returned NaN',
250 : 'Mixed type is not supported in this xdf',
251 : 'Aggregate output has insufficient size to store the result',
252 : 'KV not found in table',
253 : 'Listen to: Pretty Vacant by Sex Pistols',
254 : 'Xdb is vacant',
255 : 'Xdb is loading data',
256 : 'Stale XdbHandle, Xdb not found',
257 : 'Xdb cursor is uninitialized',
258 : 'Task(s) failed',
259 : 'The query ID does not exist',
260 : 'There is no query job associate with this ID',
261 : 'The query job is currently running',
262 : 'API Task Failed',
263 : 'The source table is already indexed by the specified key',
264 : 'Some variables are undefined during evaluation',
265 : 'The destination key/value buffer was full',
266 : 'The module is not initialized yet',
267 : 'Maximum number of joined values exceeded',
268 : 'Xdb key type is already set',
269 : 'Join keys must be of the same data type',
270 : 'Joins may only be performed on tables with the same DHT',
271 : 'Failed',
272 : 'FileName entered is illegal',
273 : 'File contents are empty',
274 : 'Eval string entered is too long',
275 : 'Table has been deleted',
276 : 'Cant open the file',
277 : 'Query failed',
278 : 'Batch Query needs to run in new session',
279 : 'Failed to create a DAG node',
280 : 'Failed to delete a DAG node',
281 : 'Failed to rename a DAG node',
282 : 'Failed to change the state of DAG node',
283 : 'No such field found while running aggregate',
284 : 'Local function requires argument',
285 : 'Accumulator is not inited',
286 : 'Return value of aggregate is not a scalar',
287 : 'Maximum number of tables and datasets reached',
288 : 'Table or dataset is in use',
289 : 'Bad table or dataset name',
290 : 'Table or dataset not found',
291 : 'Could not find dag node',
292 : 'Update operation not supported',
293 : 'Message response size would exceed maximum message payload size',
294 : 'The requested key was not found',
295 : 'The requested key\'s value doesn\'t equal the provided value',
296 : 'Could not get amount of memory consumed',
297 : 'No valid status received!',
298 : 'No such aggregate operator!',
299 : 'timed out waiting for table key type to resolve',
300 : 'Variable name in evalString too long',
301 : 'DAG handle not found',
302 : 'DAG name is invalid',
303 : 'DAG name is too long',
304 : 'DAG name already exists',
305 : 'DAG is empty',
306 : 'DAG is not empty',
307 : 'No more DAG nodes available',
308 : 'DAG handle is not available',
309 : 'DAG Node is currently in use',
310 : 'DAG Node is in error state',
311 : 'Operation not supported on the target',
312 : 'DAG node is not ready',
313 : 'Fail to destroy DAG handle',
314 : 'Dataset has been loaded',
315 : 'Dataset is not ready',
316 : 'Session does not exist',
317 : 'The session already exists',
318 : 'The target session was not inactive',
319 : 'The name or pattern supplied is not allowed',
320 : 'The session has an unrecoverable error',
321 : 'The session is active on another node',
322 : 'The delete operation is not permitted',
323 : 'Failed to load user-defined module/application',
324 : 'A module with the given name already exists',
325 : 'The specified user-defined module/application was not found',
326 : 'The given module contains no functions',
327 : 'Module name is invalid',
328 : 'Module type is invalid',
329 : 'Module source is invalid',
330 : 'Module source is too large',
331 : 'Failed to load function',
332 : 'The specified function was not found in the given module',
333 : 'UDF function name exceeds allowed length',
334 : 'UDF function has too many parameters',
335 : 'User-defined function/application variable or parameter name exceeds allowed length',
336 : 'Variable type not supported by user-defined function/application',
337 : 'Persisted user-defined function/application is invalid',
338 : 'Failed to convert value to python data type',
339 : 'Failed to execute user-defined function/application',
340 : 'Invalid argument passed to user-defined function/application',
341 : 'Failed to delete user-defined function/application on all nodes',
342 : 'Token name in evalString is too long',
343 : 'No configuration file specified',
344 : 'Could not resolve result set schema',
345 : 'DHT name is empty',
346 : 'Upper bound is less than lower bound',
347 : 'Checksum validation failed while reading log entry',
348 : 'DHT chosen doesn\'t preserve sorted order!',
349 : 'Maximum log entry size exceeded',
350 : 'Log entry header is corrupt',
351 : 'Log format not as expected',
352 : 'Unrecognized log version',
353 : 'Invalid KvStore key character',
354 : 'System DHTs may not be modified',
355 : 'The requested KvStore doesn\'t exist',
356 : 'The CPU does not support Intel SSE 4.2 instructions',
357 : 'Illegal character in user-defined function/application name',
358 : 'License data is invalid',
359 : 'Error opening the file',
360 : 'Error reading the file',
361 : 'Error writing the file',
362 : 'The public key needed to validate the Xcalar license has not been properly provided',
363 : 'The public key needed to validate the Xcalar license has an error.',
364 : 'The id of the public key needed to validate the Xcalar license is out of range.',
365 : 'The Xcalar license has not been properly provided',
366 : 'The Xcalar license has an error.',
367 : 'The signature of the Xcalar license is invalid',
368 : 'The signature of the Xcalar license failed Base32 unmapping',
369 : 'The data in the Xcalar license failed Base32 decoding',
370 : 'The checksum of the Xcalar license is invalid',
371 : 'An unknown error occurred during decoding of the Xcalar license key',
372 : 'Xcalar license is invalid for this product',
373 : 'Xcalar license file is too big, or too small',
374 : 'Xcalar license has expired',
375 : 'The log file was already closed',
376 : 'The log handle is not valid',
377 : 'The cluster is in the process of shutting down',
378 : 'Chosen ordering is not supported',
379 : 'Failed to connect to HDFS volume',
380 : 'Failed to get HDFS directory listing',
381 : 'Available area is too small to render graph',
382 : 'Mismatch between parameter type and node type',
383 : 'The Parameter is too long',
384 : 'Scheduled time may not exceed one year',
385 : 'Scheduled period may not exceed one year',
386 : 'The selected API is not parameterizable',
387 : 'Could not find query record associated with the query id',
388 : 'Joins may only be performed on tables with the same ordering',
389 : 'Invalid user cookie provided',
390 : 'Too many scheduled tasks',
391 : 'Row has not been completely demystified',
392 : 'Input is too large',
393 : 'Failed to parse Xcalar configuration file',
394 : 'The node ID is invalid',
395 : 'There are no local nodes in the confiruation file',
396 : 'Data source type does not support fallocate',
397 : 'No file extension',
398 : 'Export target is not supported',
399 : 'Invalid creation rule specified',
400 : 'No columns specified for export',
401 : 'Too many columns specified for export',
402 : 'Specified column name too long',
403 : 'Empty result set cannot be exported',
404 : 'Export requires a known schema',
405 : 'Export file already exists',
406 : 'Export file doesn\'t exist',
407 : 'Monitor port number is invalid',
408 : 'Export file and directory both exist with the same base name',
409 : 'Files were corrupted during export',
410 : 'Export file requires a new file be created',
411 : 'Specified max export file size too small',
412 : 'Cannot export to a single file while specifying header should be separate',
413 : 'Cannot export append with a separate header file',
414 : 'Cannot export append to a single file while adding a header',
415 : 'Invalid header type specified',
416 : 'Invalid split type specified',
417 : 'Specified max file size must be greater than 0',
418 : 'File version is unsupported',
419 : 'Detected a file corruption',
420 : 'An invalid request was sent to Xcalar',
421 : 'Error occurred when using libarchive',
422 : 'Failed to initialize send socket',
423 : 'Node was skipped due to a previous error',
424 : 'Field value truncated during cast',
425 : 'Cast operation failed',
426 : 'Log buffer is not aligned',
427 : 'String encoding not supported',
428 : 'Messaging interface with other process has been closed',
429 : 'Operation has finished',
430 : 'Operation statistics are not avaiable',
431 : 'Failed to parse retina file',
432 : 'Too many columns specified for Retina',
433 : 'Successfully overwrote user-defined module/application',
434 : 'Support bundle generation failed',
435 : 'Message payload too large to fit within message',
436 : 'No childnode is available to process the operation',
437 : 'Child process terminated',
438 : 'Number of pages in an Xdb slot exceeds max extent sg elements',
439 : 'Could not find aggregate result',
440 : 'Maximum row size was exceeded',
441 : 'Maximum directory depth exceeded',
442 : 'Failed to open subdirectory',
443 : 'Invalid dataset name provided',
444 : 'Max statistics group size was exceeded',
445 : 'Duplicate user-defined field found',
446 : 'Type conversion error',
447 : 'Operation not supported in prod build',
448 : 'Out of available fault injection module slots',
449 : 'No such errorpoint module',
450 : 'No such errorpoint',
451 : 'All specified files empty',
452 : 'Stats group name too long',
453 : 'Stats name too long',
454 : 'Max statistics number was exceeded',
455 : 'Stats group is full',
456 : 'No files matching name pattern',
457 : 'Invalid fatptr prefix or field name',
458 : 'Duplicated immediate name',
459 : 'Duplicated fatptr prefix',
460 : 'List files is not supported for this source type',
461 : 'Load done already called on this xdb',
462 : 'Skip records must be specified with a record delimiter',
463 : 'Parent process has terminated',
464 : 'Replay session failed',
465 : 'stack size is less than 2MB',
466 : 'Target does not exist',
467 : 'ODBC based database connections must be removed outside Xcalar',
468 : 'Functional test disabled in this build',
469 : 'Too many functional tests requested',
470 : 'Target log corrupted',
471 : 'Failed to convert from Python object to Xcalar type',
472 : 'HDFS does not support read/write files',
473 : 'No tables left in sessionGraph',
474 : 'The table is empty',
475 : 'Input regular expression is invalid',
476 : 'User-defined function/application not found',
477 : 'Too many outstanding APIs, try again later',
478 : 'The supplied user name is not within the allowed size range',
479 : 'Failed to inject Python module',
480 : 'Invalid initialization',
481 : 'Failed to parse user defined file list',
482 : 'Invalid load arguments',
483 : 'All work has been done.',
484 : 'This user-defined function/application already exists. Delete before adding',
485 : 'Too few parameters were passed to a user-defined function/application',
486 : 'The reference count of the operation is incorrect',
487 : 'Application name is invalid',
488 : 'Application host type is invalid',
489 : 'Application is too large',
490 : 'Transaction recovery context initialization error',
491 : 'Transaction recovery context default status',
492 : 'Transaction recovery context was not found',
493 : 'Transaction recovery resource is not being tracked',
494 : 'Transaction recovery context state does not allow the requested operation',
495 : 'Invalid GVM action',
496 : 'Global variable provided does not exists',
497 : 'OutputSize was corrupted',
498 : 'Dataset name already exists',
499 : 'Dataset has already been deleted',
500 : 'Retina does not exist',
501 : 'Dht specified does not exist',
502 : 'Table specified does not exist',
503 : 'Too many parameters in retina',
504 : 'This parameter cannot be changed online',
505 : 'Error occurs during Operation',
506 : 'Operation has been cancelled',
507 : 'The query name does not exist',
508 : 'Parent node does not exist',
509 : 'Load Application does not exist',
510 : 'Failed to parse load application output',
511 : 'Fault injection point triggered',
512 : 'Fault injection set in 2 phase commit',
513 : 'Export Application does not exist',
514 : 'Cannot resume session on this node',
515 : 'Out of resources (XdbPages)',
516 : 'App flags invalid',
517 : 'Query job is already running',
518 : 'Unknown Message for two PC barrier',
519 : 'Timed out during cluster startup / shutdown synchronization',
520 : 'Configured limit on child processes has been reached',
521 : 'Limit on files loaded has been reached',
522 : 'Resource temporarily unavailable, try again later',
523 : 'Cannot export append to a single file with adding a header',
524 : 'Cannot call an aggregate function during filter/map',
525 : 'Dag node has been dropped',
526 : 'Xdb slot has active cursor',
527 : 'Failed to decode protobuf message',
528 : 'Failed to load application',
529 : 'XPU App does not exist',
530 : 'Path is not on shared storage',
531 : 'Failed to encode protobuf message',
532 : 'JSON error occurred',
533 : 'Message stream not found',
534 : 'Value too small for defined data type',
535 : 'No space left in page cache',
536 : 'SchedTask functionality not supported anymore'
};
